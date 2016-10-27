/***
 * @author yumyfung
 * @date 2016-04-21
 * 一个基于Node.js的简单文件服务器
 */

var fs=require("fs"),
    http=require("http"),
    url=require("url"),
    path=require("path"),
    mime=require("./mime").mime,
    util=require('util'),
    cheerio = require('cheerio'),
    request = require('urllib-sync').request;

function replaceRepeat(file){
    // repeat
    var reg_repeat_pre_last = /<!--\s*?repeat\s+?(\d+?)\s*?-->|<!--\s*?end\s+?repeat\s*?-->/gi;
    // if $i
    var if_repeat_pre_last = /<!--\s*if\s+?(\$i.+)\s*?-->|<!--\s*end\s+if\s+\$i\s*?-->/gi;
    
    // repeat嵌套处理标记
    var i = 0;
    file = file.replace(reg_repeat_pre_last, function($0,$1){
        var reg_repeat_pre = /<!--\s*?repeat\s+?(\d+?)\s*?-->/gi;
        var reg_repeat_last = /<!--\s*?end\s+?repeat\s*?-->/gi;
        if(reg_repeat_pre.test($0)){
            return $0.replace('repeat', 'repeat#'+(i++)); 
        }else if(reg_repeat_last.test($0)){
            return $0.replace('repeat', 'repeat#'+(--i)); 
        }
    });

    // if $i嵌套处理标记
    var i = 0;
    file = file.replace(if_repeat_pre_last, function($0,$1){
        var reg_repeat_pre = /<!--\s*if\s+?(\$i.+)\s*?-->/gi;
        var reg_repeat_last = /<!--\s*end\s+if\s+\$i\s*?-->/gi;
        if(reg_repeat_pre.test($0)){
            return $0.replace('if', 'if#'+(i++)); 
        }else if(reg_repeat_last.test($0)){
            return $0.replace('if', 'if#'+(--i)); 
        }
    });

    // 递归替换内容
    function replaceRpeatContent(file){
        var reg_repeat = /<!--\s*?repeat#(\d+)\s+?(\d+?)\s*?-->([\s\S]+?)<!--\s*?end\s+?repeat#\1\s*?-->/gi;
        var reg_if_repeat_i = /<!--\s*if#(\d+)\s+?(\$i.+)\s*?-->([\s\S]+?)<!--\s*end\s+if#\1\s+\$i\s*?-->/gi;
        var reg_arr = /<!--\s*\$arr\s*?-->([\s\S]+?)<!--\s*end\s+\$arr\s*?-->/gi;
        return file.replace(reg_repeat, function($0,$1,$2,$3){
            if(reg_repeat.test($3)){
                $3 = replaceRpeatContent($3);
            }
            var str = '';
            for(var i=0;i<$2;i++){
                var _$3 = $3;
                // $$ 处理
                _$3 = _$3.replace(reg_arr, function(astr,acontent){
                    if(!/\$\$/gi.test(acontent)) return acontent;
                    var arr = acontent.split(/\$\$/gi);
                    return arr[i].trim();
                });
                // if $i处理
                _$3 = (function ifIReplace(_$3,$i){
                    _$3 = _$3.replace(reg_if_repeat_i, function(istr,iid,compare,icontent){
                        if(reg_if_repeat_i.test(icontent)){
                            icontent = ifIReplace(icontent,$i);
                        }
                        if(eval(compare)) return icontent;
                        return '';
                    });
                    return _$3;
                })(_$3,i+1);
                // $1 $2 $3 $1,2,3...处理
                _$3 = _$3.replace(/\$(\d+(?:,\d+)*?){([\s\S]+?)}/gi, function(str,num,text){
                    var nums = num.split(',');
                    if(nums.indexOf(parseInt(i+1)+'') > -1) return text;
                    return '';
                });
                // $odd $even处理
                _$3 = _$3.replace(/\$(odd|even){([\s\S]+?)}/gi, function(str,num,text){
                    if((num=='odd'&&(i+1)%2)||(num=='even'&&!((i+1)%2))) return text;
                    return '';
                });
                // $i变量处理
                _$3 = _$3.replace(/\$i(?:\((\d+)\))?/g, function(flag,step){
                    return i+parseInt(step||1);
                });
                str += _$3;
            }
            return str;
        });
    }
    
    file = replaceRpeatContent(file);

    return file;
}


function showImport(filename,file){
    var regUrl=/(?:(ftp|http|https):)?\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    // repeat 
    file = replaceRepeat(file);

    // import
    var reg = /<link\s+?rel="import"\s+?href="(\S+?)".*?(?:(?:>((?:[\s\S](?!<link))*?)<\/link\s*?>)|>)/gi;  
    if(!reg.test(file)) return file;    
    return file.replace(reg, function($0,$1,$2,$3){
        if (regUrl.test($1)) {
            var fileContent = '';
            try{
                fileContent = request(url.parse($1,false,true)).data.toString();
            }catch(err){
                console.log('-----------------------------------');
                console.log('File not found:'+$1);
                console.log('-----------------------------------');
                fileContent += '<script type="text/javascript">alert("File not found: '+$1+'. Please check whether your file on the server or your hosts is normal.");</script>';
            }
        }else {
            var importName = path.resolve(path.dirname(filename),$1);
            if(!fs.existsSync(importName)){
                util.error('找不到文件'+importName);
            }
            var fileContent = fs.readFileSync(importName,'binary');
        }

        if (reg.test(fileContent)) {
            return showImport(filename, fileContent);
        }else {
            // <link/>属性处理
            var reg_if_pre_last = /<!--\s*?if\s+?([\w\d-]+)\s*?-->([\s\S]+?)<!--\s*?end\s+?if\s+?\1\s*?-->/gi;
            var $node = cheerio.load($0, {decodeEntities: false})('link');
            fileContent = fileContent.replace(reg_if_pre_last, function($0,$1,$2){
                if(typeof($node.attr($1))!="undefined") return $2.replace('$'+$1, $node.attr($1));
                return '';
            });
            var $fileContentNode = cheerio.load(fileContent,{decodeEntities: false}).root().children();
            var tempFileContent = '';
            $fileContentNode.each(function(index,element){
                var style = (($fileContentNode.eq(index).attr('style')||'')+';'+($node.attr('style')||'')).replace(';;',';').replace(/^;/,'');
                tempFileContent += $fileContentNode.eq(index).attr('style',style).toString();
            });
            fileContent = tempFileContent;
            // <link></link>形式处理
            var reg2 = /<link\s+?rel="import"[\s\S]+<\/link\s*?>/gi;
            if(reg2.test($0)){
                var $ = cheerio.load($0.replace('link','div'), {decodeEntities: false});
                var $node = $('div').eq(0);
                fileContent = fileContent.replace('$content', $node.html());
            }
            fileContent = replaceRepeat(fileContent);
        }    
        return fileContent;
    });
}
    
//显示文件夹下面的文件
function listDirectory(parentDirectory,req,res){
    fs.readdir(parentDirectory,function(error,files){
        var body=formatBody(parentDirectory,files);
        res.writeHead(200,{
            "Content-Type":"text/html;charset=utf-8",
            "Content-Length":Buffer.byteLength(body,'utf8'),
            "Server":"NodeJs("+process.version+")"
        });
        res.write(body,'utf8');
        res.end();
    });

}

//显示文件内容
function showFile(filename,req,res){
    fs.readFile(filename,'binary',function(err,file){
        var contentType=mime.lookupExtension(path.extname(filename));
        file = showImport(filename, file);
        res.writeHead(200,{
            "Content-Type":contentType,
            "Content-Length":Buffer.byteLength(file,'binary'),
            "Server":"NodeJs("+process.version+")",
            'Access-Control-Allow-Origin': '*'
        });
        res.write(file,"binary");
        res.end();
    })
}

//在Web页面上显示文件列表，格式为<ul><li></li><li></li></ul>
function formatBody(parent,files){
    var res=[],
        length=files.length;
    res.push("<!doctype>");
    res.push("<html>");
    res.push("<head>");
    res.push("<meta http-equiv='Content-Type' content='text/html;charset=utf-8'></meta>")
    res.push("<title>Node.js文件服务器</title>");
    res.push("</head>");
    res.push("<body width='100%'>");
    res.push("<ul>")
    files.forEach(function(val,index){
        var stat=fs.statSync(path.join(parent,val));
        if(stat.isDirectory(val)){
            val=path.basename(val)+"/";
        }else{
            val=path.basename(val);
        }
        res.push("<li><a href='"+val+"'>"+val+"</a></li>");
    });
    res.push("</ul>");
    res.push("<div style='position:relative;width:98%;bottom:5px;height:25px;background:gray'>");
    res.push("<div style='margin:0 auto;height:100%;line-height:25px;text-align:center'>Powered By Node.js</div>");
    res.push("</div>")
    res.push("</body>");
    return res.join("");
}

//如果文件找不到，显示404错误
function write404(req,res){
    var body="文件不存在:-(";
    res.writeHead(404,{
        "Content-Type":"text/html;charset=utf-8",
        "Content-Length":Buffer.byteLength(body,'utf8'),
        "Server":"NodeJs("+process.version+")"
    });
    res.write(body);
    res.end();
}

//创建服务器
function creatServer(root,host,port){
    if(!fs.existsSync(root)){
        util.error(root+"文件夹不存在，请重新制定根文件夹！");
        process.exit();
    }
     var server = http.createServer(function(req,res){
        console.log(req.url);
        //将url地址的中的%20替换为空格，不然Node.js找不到文件
        var pathname=url.parse(req.url).pathname.replace(/%20/g,' '),
            re=/(%[0-9A-Fa-f]{2}){3}/g;
        //能够正确显示中文，将三字节的字符转换为utf-8编码
        pathname=pathname.replace(re,function(word){
            var buffer=new Buffer(3),
                array=word.split('%');
            array.splice(0,1);
            array.forEach(function(val,index){
                buffer[index]=parseInt('0x'+val,16);
            });
            return buffer.toString('utf8');
        });
        if(pathname=='/'){
            listDirectory(root,req,res);
        }else{
            filename=path.join(root,pathname);
            fs.exists(filename,function(exists){
                if(!exists){
                    util.error('找不到文件'+filename);
                    write404(req,res);
                }else{
                    fs.stat(filename,function(err,stat){
                        if(stat.isFile()){
                            showFile(filename,req,res);
                        }else if(stat.isDirectory()){
                            listDirectory(filename,req,res);
                        }
                    });
                }
            });
        }
        
        
    }).listen(port,host);

    util.debug("服务器开始运行 http://"+host+":"+port);

    return server;
}

//关闭Server
function closeServer(server){
    server.close(function(){
         console.log("server close!");
    });
}

module.exports.createServer =  function(root,host,port){
   return creatServer(root,host,port);
}
module.exports.closeServer =  function(server){
    closeServer(server);
}