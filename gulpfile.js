/*============================================================
      @作者：yumyfeng
      @说明：Yummy 新一代跨平台的前端构建工具
      @版本：V2.0
      @最后编辑：$Author:: yumyfeng       $
                 $Date:: 2015-06-03 22:06:05#$
=============================================================*/
console.log('\nPlease waiting...\n');
var gulp = require('gulp');
var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');
var gutil = require('gulp-util');
var argv = require('yargs').argv;
var minifyCSS = require('gulp-minify-css');
var rename = require('gulp-rename');
var changed = require('gulp-changed'); 
var cssimport = require('gulp-cssimport');
var tap = require('gulp-tap');
var spritesmith = require('gulp.spritesmith');
var imagemin = require('gulp-imagemin');
var pngquant = require('imagemin-pngquant');
var tobase64 = require("gulp-tobase64");
var ySprite = require('gulp-ysprite');
var yStamp = require('gulp-ystamp');
var next = require('gulp-next');
var iconv = require('iconv-lite');
var gulpif = require('gulp-if');
var jsonFormat = require('gulp-json-format');
var hosts = require('hosts-group');

//工具扩展类
function Tools(){}

//广度文件夹遍历
Tools.walk = Tools.prototype.walk = function(walkPath, format, callback){
    var dirList = fs.readdirSync(walkPath);
    var fileList = [];
   
    dirList.forEach(function(item){
      if(fs.statSync(walkPath + '/' + item).isFile()){
        if(format.contains(path.extname(item))){
          fileList.push(walkPath + '/' + item);
        }
      }
    });
   
    callback(fileList, walkPath);

    dirList.forEach(function(item){
      if(fs.statSync(walkPath + '/' + item).isDirectory()){
        Tools.walk(walkPath + '/' + item, format, callback);
      }
    });
}

//多级路径创建文件(夹)
Tools.mkDirFileSync = Tools.prototype.mkDirFileSync = function(walkPath, fileContent){
    function mdf(walkPath, fileContent, deep){
        if (!fs.existsSync(walkPath)) {
            mdf(path.dirname(walkPath), fileContent, ++deep);
        }else return;
        --deep;
        if(deep == 1 && !!fileContent){
            fs.writeFileSync(walkPath, fileContent);
        }else {
            fs.mkdirSync(walkPath);
        }
    }
    mdf(walkPath, fileContent, 1)
}

//判断一个值是否在数组中
Array.prototype.contains = function(search){
    for(var i in this){
        if(this[i] == search){
            return true;
        }
    }
    return false;
}

//数组去重
Array.prototype.unique = function(){
 var res = [];
 var json = {};
 for(var i = 0; i < this.length; i++){
    if(!json[this[i]]){
        res.push(this[i]);
        json[this[i]] = 1;
    }
 }
 return res;
}

// 自定义计时函数类
function TimeCount(){
    this._times = {};
}

// 计时开始
TimeCount.prototype.time = function(label) {
  this._times[label] = Date.now();
};

// 计时结束
TimeCount.prototype.timeEnd = function(label) {
  var time = this._times[label];
  if (!time) {
    throw new Error('No such label: ' + label);
  }
  var duration = Date.now() - time;
  console.log('%s: %dms', label, duration);
  return duration;
};

// 对Date的扩展，将 Date 转化为指定格式的String   
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，   
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)   
// 例子：   
// (new Date()).format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423   
// (new Date()).format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
Date.prototype.format = function(fmt){ 
  var o = {   
    "M+" : this.getMonth()+1,                 //月份   
    "d+" : this.getDate(),                    //日   
    "h+" : this.getHours(),                   //小时   
    "m+" : this.getMinutes(),                 //分   
    "s+" : this.getSeconds(),                 //秒   
    "q+" : Math.floor((this.getMonth()+3)/3), //季度   
    "S"  : this.getMilliseconds()             //毫秒   
  };   
  if(/(y+)/.test(fmt))   
    fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));   
  for(var k in o)   
    if(new RegExp("("+ k +")").test(fmt))   
  fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));   
  return fmt;   
}

//基础参数配置
var config = {
    dir_local_html: '',
    dir_local_css: '',
    root_html: '',
    root_mediastyle: '',
    base_ars: 'ars/',
    servers: null,
    tools: {
        minifyCssIn: 'tools/minifyCss.in/',
        minifyCssOut: 'tools/minifyCss.out/',
        minifyImgIn: 'tools/minifyImg.in/',
        minifyImgOut: 'tools/minifyImg.out/',
        spriteIn: 'tools/sprite.in/',
        spriteOut: 'tools/sprite.out/'
    },
    task: {
        config: 'config',
        add: 'add',
        del: 'delete',
        set: 'set',
        jobs: 'jobs',
        minifyImg: 'minifyImg',
        minifyCss: 'minifyCss',
        sprite: 'sprite',
        ars: 'ars',
        current: 'current',
        open: 'open'
    },
    template: {},
    //命令任务对应表
    taskFun: {},
    jobFilePath: 'config/job.json',
    baseFilePath: 'config/base.json',
    jobs: null,
    baseJson: null,
    projection: null,
    init:  function(){
        Tools.mkDirFileSync(config.baseFilePath, '{}');
        Tools.mkDirFileSync(config.jobFilePath, '{}');
        var flagWrite = false;
        //工作项目记录初始化
        var source = fs.readFileSync(this.jobFilePath, {encoding: 'utf8'});
        this.jobs = JSON.parse(source);
        //映射盘初始化及基础数据初始化
        var base = fs.readFileSync(this.baseFilePath, {encoding: 'utf8'});
        var baseJson = JSON.parse(base);
        this.baseJson = baseJson;
        // 服务器
        if(!baseJson.servers){
            baseJson.servers = [
                {
                    name: '样式服务器',
                    cmd: "u233",
                    dir: "W:/",
                    format: [
                        ".css",
                        ".png",
                        ".jpg",
                        ".gif",
                        ".js",
                        ".swf"
                    ],
                    ars: "/xxx/xxx/xxx/xxx/",
                    site: "http://xxx.xxx.cn/"
                }
            ];
            flagWrite = true;
        }
        this.servers = baseJson.servers;
        // 基础HTML目录
        if(!baseJson.root_html){
            baseJson.root_html = 'E:/SvnProject/html';
            flagWrite = true;
        }
        this.root_html = baseJson.root_html + '/';
        // 基础样式目录
        if(!baseJson.root_mediastyle){
            baseJson.root_mediastyle = "E:/SvnProject/mediastyle";
            flagWrite = true;
        }
        this.root_mediastyle = baseJson.root_mediastyle + '/';
        // 基础命令 
        if(!baseJson.task){
            baseJson.task = {
                add: "add",
                del: "delete",
                set: "set",
                jobs: "jobs",
                hosts: "hosts",
                minifyImg: "minifyImg",
                minifyCss: "minifyCss",
                sprite: "sprite",
                ars: "ars",
                current: "current",
                open: "open"
            };
            flagWrite = true;
        }
        //自定义命令
        if(baseJson.task && typeof baseJson.task == 'object'){
            for(var key in baseJson.task){
                if(!!baseJson.task[key] && typeof baseJson.task[key] == 'string'){
                    this.task[key] = baseJson.task[key];
                }
            }
        }
        // 映射关系
        if(!baseJson.projection){
            baseJson.projection = [
                {
                    "name": "normal",
                    "rules": [
                        {
                            "domain": "imgcache.gtimg.cn",
                            "localpath": "E:/SvnProject"
                        }
                    ]
                }
            ];
            flagWrite = true;
        }
        // 补充新版本的定义json结构
        if(flagWrite){
            fs.writeFileSync(config.baseFilePath, JSON.stringify(config.baseJson));
            gulp.src(config.baseFilePath).pipe(jsonFormat(4)).pipe(gulp.dest(path.dirname(config.baseFilePath)));
        }
        // 初始化服务器设置
        this.initServer();
        // 模板初始化
        this.initTemplate('template');
        // 自定义功能模块
        this.initExtend('extend');
    },
    // 初始化服务器设置
    initServer: function(){
        for(var i = 0, len = this.servers.length; i < len; i++){
            var server = this.servers[i];
            // 动态添加服务器任务
            gulp.task(server.cmd, uploadServer(argv, server));
            config.taskFun[server.cmd] = uploadServer;
        }
    },
    // 初始化模板
    initTemplate: function(walkPath){
       var dirList = fs.readdirSync(walkPath);
       var fileList = [];
       var tpls = [];
       dirList.forEach(function(item){
         if(fs.statSync(path.join(walkPath + '/' + item)).isDirectory()){
            var rule = require('./' + walkPath + '/' + item + '/rule.js').rule;
            var tpl = {
                dir: item,
                rule: rule
            };
            //console.log('初始化模板 ====> ' + rule.command);
            // 保存模板tpl对象
            config.template[item] = tpl;
            // 动态添加模板任务
            gulp.task(rule.command, taskTemplate(argv, tpl));
            config.taskFun[rule.command] = taskTemplate;
         }
       }); 
    },
    // 自定义功能模块初始化
    initExtend: function(extendPath){
        if (!fs.existsSync(extendPath)) {
            fs.mkdirSync(extendPath);
        }
        Tools.walk(extendPath, ['.js'], function(fileList, walkPath){
            var taskObj;
            for(var i = 0, len = fileList.length; i < len; i++){
                taskObj = require('./' + fileList[i]);
                for(var key in taskObj){
                    gulp.task(key, taskObj[key]);
                    config.taskFun[key] = taskObj[key];
                }
            }
        });
    },
    // 设置当前工作目录
    setCurrentJob: function(){
        var json = this.jobs;
        if(!json['_current_']) {
            console.log('Warnning：请先设置当前工作目录...');
            throw '';
        }
        var arr = json['_current_'].split(',');
        if(arr.length != 2) {
            console.log('Warnning：请先设置当前工作目录...');
            throw '';
        }
        this.dir_local_html = this.root_html + arr[0];
        this.dir_local_css = this.root_mediastyle + arr[1];
    }
}
config.init();

//公用类
var Common = {
    cssFiles: [],
    imgFiles: [],
    htmlFiles: [],
    init: function(argv){
        //如果是指定文件上传，只会上传指定的文件，并且文件不受项目约束 
        //非指定文件上传，会将项目下需要的文件全部上传
        var allFiles = [];
        if(argv.f && typeof argv.f == 'string'){
            var allFiles = argv.f.split(',');
            for(var i = 0, len = allFiles.length; i < len; i++){
                var extraname = path.extname(path.basename(allFiles[i]));
                if(extraname == '.css'){
                    var relativefilePath = path.join(config.root_mediastyle, allFiles[i].split(path.basename(config.root_mediastyle))[1]);
                    Common.cssFiles.push(relativefilePath);
                }else if(['.jpg','.png','.gif'].contains(extraname)){
                    var relativefilePath = path.join(config.root_mediastyle, allFiles[i].split(path.basename(config.root_mediastyle))[1]);
                    Common.imgFiles.push(relativefilePath);
                }else if(['.html','.htm'].contains(extraname)){
                    Common.htmlFiles.push(allFiles[i]);
                }
            }
        }
    },
    uploadStyle: function(argv, server, cb){
        //处理样式过程中会产生sprite合并图片，先上传css再上传图片
        var that = this;
        this.uploadCss(argv, server, Common.cssFiles, function(){
            that.uploadImg(argv, server, Common.imgFiles, function(){
                cb && typeof cb == 'function' ? cb() : '';
            });
        });
    },
    uploadCss: function(argv, server, arr, cb){
        var dir = server.dir;
        var cssSrc = [config.dir_local_css + '/**/*.css', '!' + config.dir_local_css + '/**/*.import.css'];
        //指定文件上传
        if(argv.f && typeof argv.f == 'string'){
            if(arr && arr.length){
                cssSrc = arr;
            }else {
                cb && typeof cb == 'function' ? cb() : '';
                return;
            }
        }
        var changedDir = dir + config.dir_local_css.replace(config.root_mediastyle, '');
        gulp.src(cssSrc, {base: config.root_mediastyle})
            .pipe(gulpif(argv.u && !argv.f , changed(changedDir)))
            .pipe(cssimport({extensions: ["!less", "!sass"]}))
            .pipe(tobase64({
                    maxsize: 8,        
                    ignore: /(?!.*\bbase64\b)^.*$/g
                }
            ))
            .pipe(ySprite({
                slice: config.dir_local_css,
                sprite: config.dir_local_css + '/sprite',
                engine: require('phantomjssmith'),
                callback: function(stream){
                    stream.pipe(yStamp({
                        stamp: {
                            md5: true,
                            // d: (new Date()).format("yyyyMMddhhmmss"),
                            max_age: '2592000'
                        },
                        callback: function(stream, backgroundImgs){
                            //需不需要把相关资源也上传
                            if(argv.r){
                                Common.imgFiles = Common.imgFiles.concat(backgroundImgs).unique();
                            }
                            stream.pipe(minifyCSS({
                                advanced: false,//类型：Boolean 默认：true [是否开启高级优化（合并选择器等）]
                                compatibility: 'ie7',//类型：String 默认：''or'*' [启用兼容模式； 'ie7'：IE7兼容模式，'ie8'：IE8兼容模式，'*'：IE9+兼容模式]
                                keepBreaks: true//类型：Boolean 默认：false [是否保留换行]
                            }))
                            .pipe(gulp.dest(dir)).pipe(next(function(){
                                console.log('样式上传到' + server.name + '完毕...');
                                cb && typeof cb == 'function' ? cb() : '';
                            }));
                        }
                    }));
                }
            }));
    },
    uploadImg: function(argv, server, arr, cb){
        var dir = server.dir;
        var imgSrc = [config.dir_local_css + '/**/*.png', config.dir_local_css + '/**/*.jpg', config.dir_local_css + '/**/*.gif', '!' + config.dir_local_css + '/slice/**/*', '!' + config.dir_local_css + '/base64/**/*'];
        //指定文件上传
        if(argv.f && typeof argv.f == 'string'){
            if(arr && arr.length){
                imgSrc = arr;
            }else {
                cb && typeof cb == 'function' ? cb() : '';
                return;
            }
        }
        var changedDir = dir + config.dir_local_css.replace(config.root_mediastyle, '');
        function uploadImg(key){
            var imageminParamObj = {
                quality: '65-80', 
                optimizationLevel: 3, 
                progressive: true, 
                interlaced: true , 
                svgoPlugins: [{removeViewBox: false}]
            };
            if(argv.p){
                imageminParamObj['use'] = [pngquant()];
            }
            gulp.src(imgSrc[key], {base: config.root_mediastyle})
                .pipe(gulpif(argv.u && !argv.f, changed(changedDir)))
                .pipe(imagemin(imageminParamObj))
                .pipe(gulp.dest(dir))
                .pipe(next(function(){
                    if(++key < imgSrc.length){
                        uploadImg(key);
                    }else {
                        console.log('图片上传到' + server.name + '完毕...');
                        cb && typeof cb == 'function' ? cb() : '';
                    }
                }));
        }
        uploadImg(0);
    },
    //上传html
    uploadHtml: function(argv, server, cb){
        var dir = server.dir;
        var htmlSrc = [config.dir_local_html+'/**/*.html'];
        //指定文件上传
        if(argv.f && typeof argv.f == 'string'){
            if(Common.htmlFiles.length){
                htmlSrc = Common.htmlFiles;
            }else {
                cb && typeof cb == 'function' ? cb() : '';
                return;
            }
        }
        var nameIndex = 1;
        gulp.src(htmlSrc)
            .pipe(rename(function (pathDir) {
                //重命令新上传的html为1.html,2.html,3.html...
                pathDir.basename = nameIndex++;
            }))
            .pipe(gulpif(argv.u && !argv.f, changed(dir)))
            .pipe(tap(function(file){
                var reg = /\bhttp:\/\/imgcache.gtimg.cn\/mediastyle\//g;
                var content = file.contents.toString().replace(reg, '');
                file.contents = new Buffer(content);
            }))
            .pipe(gulp.dest(dir))
            .pipe(next(function(){
                //打开1.html页面
                var projDir = path.basename(dir);
                var username = path.basename(path.dirname(dir));
                Common.openLink(server.site + username + '/' + projDir + '/1.html')
                cb && typeof cb == 'function' ? cb() : '';
            }));
    },
    //创建模板
    createTemplate: function (argv, cfg, taskCallback){
        var name = cfg.name;
        var templateName = cfg.templateName;
        var replaceLink = cfg.replaceLink;
        var dirHtml = cfg.dirHtml;
        var dirCss = cfg.dirCss;

        if(argv.d){
            var arr = argv.d.split(',');
            argv.h = arr[0];
            argv.s = arr[1];
        }

        if(!argv.h || !argv.s){
            console.log('创建' + name + '失败，你的命令可能缺少-h或-s参数，或-d参数格式有误...');
            if(!!taskCallback) taskCallback();
            return;
        }
        var timePre = new Date().format("yyyyMMdd") + '_';
        // -n 正常状态，不加时间前缀
        if(argv.n){
            timePre = '';
        }
        var htmlFolder = timePre + argv.h;
        var cssFolderr = timePre + argv.s;
        var htmlDirPath = path.normalize(path.join(dirHtml, htmlFolder)).replace(/\\/g, '/');
        var cssDirPath = path.normalize(path.join(dirCss, cssFolderr)).replace(/\\/g, '/');

        //同步模板html文件夹
        gulp.src('template/' + templateName + '/*.html')
            .pipe(tap(function(file){
                var content = file.contents.toString().replace(replaceLink[0], path.join(replaceLink[1], cssFolderr, 'index.css').replace(/\\/g, '/') + '" />');
                file.contents = new Buffer(content);
            }))
            .pipe(gulp.dest(htmlDirPath))
            .pipe(next(function(){
                //打开窗口
                Common.openFolder(htmlDirPath);
                console.log('创建' + name + 'html成功...');
                //同步模板css到文件夹
                gulp.src(['!template/' + templateName + '/*.html', '!template/' + templateName + '/rule.js', 'template/' + templateName + '/**/*'])
                    .pipe(gulp.dest(cssDirPath))
                    .pipe(next(function(){
                        //打开窗口
                        Common.openFolder(cssDirPath);
                        console.log('创建' + name + 'css成功...');
                    }))
                    .pipe(next(function(){
                        //顺便把任务添加到库存里去
                        if(argv.a){
                            var addHtmlPath = htmlDirPath.replace(config.root_html, '');
                            var addCssPath = cssDirPath.replace(config.root_mediastyle, '');
                            childProcess.exec('gulp add -d ' + argv.a + ',' + addHtmlPath + ',' + addCssPath, function(err,stdout,stderr){
                                if(err){
                                    console.log('\n任务' + argv.a +'添加到库存失败...');
                                }else {
                                    console.log('\n任务' + argv.a +'已添加到库存...');
                                }
                                if(!!taskCallback) taskCallback();
                            });
                        }else {
                            if(!!taskCallback) taskCallback();
                        }
                    }));
            }));
    },
    //打开文件夹窗口
    openFolder: function(dir){
        //windows平台
        if(/^win32/gi.test(process.platform)){
            childProcess.exec('start "" ' + dir);
        }
        //mac平台
        else if(/^darwin/gi.test(process.platform)){
            childProcess.exec('open ' + dir);
        }
    },
    //打开网页链接
    openLink: function(link){
        //windows平台
        if(/^win32/gi.test(process.platform)){
            childProcess.exec('explorer ' + link);
        }
        //mac平台
        else if(/^darwin/gi.test(process.platform)){
            childProcess.exec('open ' + link);
        }
    },
    //顺序执行命令
    orderExec: function(arr){
        var len = arr.length;
        function _exec(i){
            childProcess.exec(arr[i], function(err,stdout,stderr){
                if(err){
                    console.log('命令'+arr[i]+'执行失败...');
                }
                if(++i < len){
                    console.log('iii==='+i);
                    _exec(i);
                }
            });
        }
        _exec(0);
    }
}

//修改配置
function taskSetConfig(argv, taskCallback){
    return function(){
        if(!argv.s){
            console.log('没有指定要修改的配置属性，请用-s指定...');
            if(!!taskCallback) taskCallback();
            return;
        }
        var arr = argv.s.split('=');
        if(arr.length != 2){
            console.log('-s指定的属性格式有误...');
            if(!!taskCallback) taskCallback();
            return;
        }
        var attr = arr[0].trim().split('.');
        // 禁止直接使用命令修改模板配置
        if(attr == 'template'){
            console.log('模板配置只能在对应的rule.js里修改哦！');
            if(!!taskCallback) taskCallback();
            return;
        }
        var str = '';
        for(var i = 0; i < attr.length; i++){
            str += '["' + attr[i] + '"]';
        }
        str = 'config.baseJson' + str + '="' + arr[1] + '"';
        console.log('修改配置--->'+str);
        eval(str);
        //同步修改config对象中的属性
        eval(str.replace('config.baseJson', 'config'));
        fs.writeFileSync(config.baseFilePath, JSON.stringify(config.baseJson));
        gulp.src(config.baseFilePath).pipe(jsonFormat(4)).pipe(gulp.dest(path.dirname(config.baseFilePath)));
        if(!!taskCallback) taskCallback();
    }
}

// 服务器管理
function taskServer(argv, taskCallback){
    return function(){
        switch(argv.w){
            case 'add':
                var arr = argv.d.split(',');
                var obj = {};
                for(var i = 0, len = arr.length; i < len; i++){
                    var arr2 = arr[i].split('=');
                    if(arr2[0] == 'format'){
                        arr2[1] = arr2[1].split('&');
                    }
                    obj[arr2[0]] = arr2[1];
                }
                // config.servers与config.baseJson.servers指向相同对象
                config.baseJson.servers.push(obj);  
                break;
            case 'update':
                var arr = argv.d.split(',');
                var obj = config.baseJson.servers[argv.n];
                for(var i = 0, len = arr.length; i < len; i++){
                    var arr2 = arr[i].split('=');
                    if(arr2[0] == 'format'){
                        arr2[1] = arr2[1].split('&');
                    }
                    obj[arr2[0]] = arr2[1];
                }
                break;

            case 'delete':
                config.baseJson.servers.splice(argv.n, 1);
                break;
        }
        fs.writeFileSync(config.baseFilePath, JSON.stringify(config.baseJson));
        gulp.src(config.baseFilePath).pipe(jsonFormat(4)).pipe(gulp.dest(path.dirname(config.baseFilePath)));
        if(!!taskCallback) taskCallback();
    }
}

//添加工作记录
function taskAdd(argv, taskCallback){
    return function(){
        if(!argv.d){
            console.log("添加工作记录失败，缺少指定参数-d...");
            if(!!taskCallback) taskCallback();
            return;
        }
        var job = argv.d.split(',');
        if(job.length != 3){
            console.log("你输入的参数内容不符合规格，必须用一个,隔开，且两端内容不能为空哦...");
            if(!!taskCallback) taskCallback();
            return;
        }
        var cbDataArr = [];
        //替换因为复制可能存在的 XX\XX\XXX 目录格式为 XX/XX/XXX
        job[1] = job[1].replace(/\\/g, '/');
        job[2] = job[2].replace(/\\/g, '/');
        var json = config.jobs;
        json[job[0]] = job[1] + "," + job[2];
        fs.writeFileSync(config.jobFilePath, JSON.stringify(json));
        gulp.src(config.jobFilePath).pipe(jsonFormat(4)).pipe(gulp.dest(path.dirname(config.jobFilePath)));
        console.log('已成功添加一个工作记录：' + job[0] + ' <==> ' + job[1] + ' ' + job[2]);
        cbDataArr.push('已成功添加一个工作记录：' + job[0] + ' <==> ' + job[1] + ' ' + job[2]);
        if(!!taskCallback) taskCallback(cbDataArr);
    }
}

//删除一个工作记录
function taskDel(argv, taskCallback){
    return function(){
        if(!argv.d){
            console.log("添加工作记录失败，缺少指定参数-d...");
            return;
        }
        var json = config.jobs;
        if(!json[argv.d]){
            console.log('找不到要删除的工作记录...');
            return;
        }
        var cbDataArr = [];
        var temp = json[argv.d];
        delete json[argv.d];
        fs.writeFileSync(config.jobFilePath, JSON.stringify(json));
        config.setCurrentJob();
        console.log('已成功删除工作记录：' + argv.d + ' <==> ' + temp);
        cbDataArr.push('已成功删除工作记录：' + argv.d + ' <==> ' + temp);
        if(!!taskCallback) taskCallback(cbDataArr);
    }
}

//设置当前工作记录
function taskSet(argv, taskCallback){
    return function(){
        if(!argv.d){
            console.log("添加工作记录失败，缺少指定参数-d...");
            return;
        }
        var cbDataArr = [];
        var json = config.jobs;
        json['_current_'] = json[argv.d];
        fs.writeFileSync(config.jobFilePath, JSON.stringify(json));
        config.setCurrentJob();
        console.log('已成功设置当前工作记录为：' + json[argv.d]);
        cbDataArr.push('已成功设置当前工作记录为：' + json[argv.d]);
        if(!!taskCallback) taskCallback(cbDataArr);
    }
}

//查看所有工作记录
function taskJobs(argv, taskCallback){
    return function(){
        var cnt = 0;
        var json = config.jobs;
        var cbDataArr = [];
        for(var key in json){
            cnt++;
            var arr = json[key].split(',');
            console.log(key + ' <==> ' + arr[0] + ' ' + arr[1]);
            cbDataArr.push(key + ' <==> ' + arr[0] + ' ' + arr[1]);
        }
        if(cnt == 0){
            console.log('当前没有任何工作记录');
        }
        if(!!taskCallback) taskCallback(cbDataArr);
    }
}

//查看当前工作记录
function taskCurrent(argv, taskCallback){
    return function(){
        var cnt = 0;
        var json = config.jobs;
        var cbDataArr = [];
        for(var key in json){
            if(key == '_current_'){
                cnt++;
                var arr = json[key].split(',');
                console.log(key + ' <==> ' + arr[0] + ' ' + arr[1]);
                cbDataArr.push(key + ' <==> ' + arr[0] + ' ' + arr[1]);
                break;
            }
        }
        if(cnt == 0){
            console.log('当前没有任何工作记录');
        }
        if(!!taskCallback) taskCallback(cbDataArr);
    }
}

// hosts管理
// gulp hosts -d groupname,127.0.0.1,imgcache.gtimg.cn -f groupname,0 -s groupname,0
function taskHosts(argv, taskCallback){
    return function(){
        for(var key in argv){
            switch(key){
                case 'a':
                    var aArr = argv.a.split(',');
                    if(aArr.length == 1){
                        hosts.addGroup(aArr[0]);
                        console.log('已添加hosts组 => ' + aArr[0]);
                    }else if(aArr.length == 2){
                        hosts.addGroup(aArr[0], aArr[1]);
                        console.log('已添加hosts组 => ' + aArr[0]);
                    }else if(aArr.length >= 3){
                        hosts.set(aArr[2], aArr[1], {groupName: aArr[0], disabled: !!aArr[3]});
                        console.log('已从组' + aArr[0] + '添加hosts => ' + aArr[2] + ' ' + aArr[1]);
                    }
                    break;

                case 'd':
                    var dArr = argv.d.split(',');
                    if(dArr.length == 1){
                        hosts.removeGroup(dArr[0]);
                        console.log('已删除hosts组 => ' + dArr[0]);
                    }else if(dArr.length == 3){
                        hosts.remove(dArr[2], dArr[1], dArr[0]);
                        console.log('已从组' + dArr[0] + '删除hosts => ' + dArr[2] + ' ' + dArr[1]);
                    }
                    break;

                case 's':
                    var sArr = argv.s.split(',');
                    if(sArr.length == 1){
                       hosts.activeGroup(sArr[0]); 
                       console.log('已启用hosts组 => ' + sArr[0]);
                    }else if(sArr.length == 3){
                       hosts.active(sArr[2], sArr[1], sArr[0]);
                       console.log('已从组' + sArr[0] + '启用hosts => ' + sArr[2] + ' ' + sArr[1]);
                    }
                    break;

                case 'f':
                    var fArr = argv.f.split(',');
                    if(fArr.length == 1){
                       hosts.disableGroup(fArr[0]); 
                       console.log('已注释hosts组 => ' + fArr[0]);
                    }else if(fArr.length == 3){
                       hosts.disable(fArr[2], fArr[1], fArr[0]);
                       console.log('已从组' + fArr[0] + '注释hosts => ' + fArr[2] + ' ' + fArr[1]);
                    }
                    break;

                case 'l':
                    console.log('所有hosts如下:');
                    console.dir(hosts.get());
                    break;
            }
        }
        if(!!taskCallback) taskCallback();
    }
}

// 规则映射管理 
// gulp projection -a(-f,-d,-s) name,imgcache.gtimg.cn,"E:/SvnProject"
function taskProjection(argv, taskCallback){
    return function(){
        if(argv.a){
        }
        if(!!taskCallback) taskCallback();
    }
}

//压缩功能，覆盖当前图片
function taskMinifyImg(argv, taskCallback){
    return function(){
        var srcArr = [config.tools.minifyCssIn + '**/*.+(jpg|png|gif)'];
        var output = config.tools.minifyCssOut;
        if(argv.f && typeof argv.f == 'string'){
            srcArr = argv.f.split(',');
        }
        if(argv.o && typeof argv.o == 'string'){
            output = argv.o;
        }
        var imageminParamObj = {
            quality: '65-80', 
            optimizationLevel: 3, 
            progressive: true, 
            interlaced: true , 
            svgoPlugins: [{removeViewBox: false}]
        };
        if(argv.p){
            //pngquant 是一个用来压缩 PNG 图像的命令行脚本和 C 库。经过转换能显著缩小图片体积 (通常压缩幅度高达 70%) 并且能保留完整的 alpha 透明度。转换生成的图片可以兼容所有浏览器, 并且 在 IE6 中比 24-bit 的 PNG 图片有更好的表现。
            imageminParamObj['use'] = [pngquant()];
        }
        gulp.src(srcArr)
            .pipe(imagemin(imageminParamObj))
            .pipe(gulp.dest(output))
            .pipe(next(function(){
                console.log('图片压缩成功...');
                if(!!taskCallback) taskCallback(['图片压缩成功...']);
            }));
    }
}

//基础压缩CSS功能，在tools/minifyCss.out目录生成.min.css格式文件
function taskMinifyCss(argv, taskCallback){
    return function(){
        var srcArr = [config.tools.minifyCssIn + '*.css', '!' + config.tools.minifyCssIn + '*.import.css'];
        var output = config.tools.minifyCssOut;
        if(argv.f && typeof argv.f == 'string'){
            srcArr = argv.f.split(',');
        }
        if(argv.o && typeof argv.o == 'string'){
            output = argv.o;
        }
        gulp.src(srcArr)
            .pipe(rename({'suffix': '.min'}))
            .pipe(tobase64({
                    maxsize: 8,        
                    ignore: /(?!.*\bbase64\b)^.*$/g
                }
            ))
            .pipe(minifyCSS({
                advanced: false,//类型：Boolean 默认：true [是否开启高级优化（合并选择器等）]
                compatibility: 'ie7',//类型：String 默认：''or'*' [启用兼容模式； 'ie7'：IE7兼容模式，'ie8'：IE8兼容模式，'*'：IE9+兼容模式]
                keepBreaks: false//类型：Boolean 默认：false [是否保留换行]
            }))
            .pipe(gulp.dest(output))
            .pipe(next(function(){
                console.log('CSS压缩成功...');
                if(!!taskCallback) taskCallback(['CSS压缩成功...']);
            }));
    }
}

//基础雪碧图功能
function taskSprite(argv, taskCallback){
    return function(){
        var imgDirArr = [];
        var fileIsFixed = false;
        //指定图片合并
        if(argv.f && typeof argv.f == 'string'){
            imgDirArr = [argv.f.split(',')];
            fileIsFixed = true;
        }
        //默认工具文件夹合并
        else {
            var imgPathArr = [];
            //广度搜索config.tools.spriteIn文件夹
            Tools.walk(config.tools.spriteIn, ['.jpg','.png','.gif'], function(arr, path){
                if(!arr.length) return;
                imgDirArr.push(arr);
                imgPathArr.push(path);
            });
            //如果文件夹为空
            if(!imgDirArr.length){
                callback();
                if(!!taskCallback) taskCallback();
                return;
            }
        }

        var output = config.tools.spriteOut;

        if(argv.o && typeof argv.o == 'string') {
            output = argv.o;
        }
        
        var cbDataArr = [];
        //合并图片
        for(var key = 0;key <imgDirArr.length;key++){
          (function(key){             
                var imgFile = fileIsFixed ? 'sprite' : 'sprite_' + path.basename(imgPathArr[key]);
                output = fileIsFixed ? output : path.normalize(path.join(output, imgFile));
                var spriteData = gulp.src(imgDirArr[key])
                    .pipe(spritesmith({
                        imgName: imgFile + '.png',
                        cssName: imgFile + '.import.css',
                        algorithm: 'binary-tree',
                        engine: require('phantomjssmith') || 'pixelsmith',
                        padding: 2,
                        cssVarMap: function(sprite) {
                            //替换sprite文件图片名字中的@字符，生成的类名要引用到图片中的名字，不能有@
                            sprite.name = sprite.name.replace('@', '-');    
                            console.log('正在合并%s...', sprite.name);
                            cbDataArr.push('正在合并'+sprite.name+'...');
                        }
                    }));
                spriteData.img.pipe(gulp.dest(output))
                    .pipe(next(function(){
                        spriteData.css.pipe(gulp.dest(output))
                            .pipe(next(function(){
                                if(key == imgDirArr.length - 1){
                                    if(!!taskCallback) taskCallback(cbDataArr);
                                }
                            }));  
                    }));
          })(key);
        }
    }
}

// 上传文件到服务器
function uploadServer(argv, server, taskCallback){
    return function(){
        config.setCurrentJob();
        Common.init(argv);
        // 服务器指定创建一个目录文件夹
        if(argv.d){
            dir += argv.d + '/';
        }
        // 上传相关文件到服务器
        Common.uploadStyle(argv, server, function(){
            if(argv.h){
                //上传html
                Common.uploadHtml(argv, server, function(){
                    if(!!taskCallback) taskCallback(['上传相关文件到服务器任务完成...']);
                });
            }else {
                if(!!taskCallback) taskCallback(['上传相关文件到服务器任务完成...']);
            }
        });
    }
}

//生成ars提单列表
function taskArs(argv, taskCallback){
    return function(){
        if (!fs.existsSync(config.base_ars)) {
            fs.mkdirSync(config.base_ars);
        }
        console.log('\n*****生成ars提单列表任务*****\n');
        config.setCurrentJob();
        var fileList = [];
        var fileUrl = [];
        var arsTxt = path.basename(config.jobs._current_.split(',').pop());
        var arsFile = config.base_ars + arsTxt + '.txt';

        gulp.src([config.dir_local_css + '/**/*.+(jpg|png|css)', '!' + config.dir_local_css + '/**/*.import.*', '!' + config.dir_local_css + '/extra/**/*', '!' + config.dir_local_css + '/slice/**/*', '!' +  config.dir_local_css + '/base64/**/*'])
            .pipe(tap(function(file){
                var mediastyle = path.basename(config.root_mediastyle);
                var dirItem = path.normalize(mediastyle + file.path.split(mediastyle)[1]).replace(/\\/g, '/');  
                console.log('/usr/local/imgcache/htdocs/' + dirItem);
                fileList.push('/usr/local/imgcache/htdocs/' + dirItem);
                fileUrl.push('http://imgcache.gtimg.cn/' + dirItem);
            })).pipe(next(function(){
                fs.writeFileSync(arsFile, '\r\n提单文件列表: \r\n' + fileList.join('\r\n') + '\r\n文件路径: \r\n' + fileUrl.join('\r\n'));
                console.log('\n提单文件列表' + arsTxt + '生成成功...');
                //打开提单文件
                Common.openFolder(arsFile);
                console.log('\narsFile-->'+arsFile);
                if(!!taskCallback) taskCallback();
            }));
    }
}

//快速创建活动页面模板目录
function taskTemplate(argv, tpl, taskCallback){
    return function(){
        var cfg = {
            name: tpl.rule.name || '活动模板',
            templateName: tpl.dir,
            replaceLink: tpl.rule.replaceLink || [],
        }
        if(!tpl.rule.dir.length){
            console.err('该活动模板的rule.js文件配置没指定具体的文件生成目录！');
        }
        cfg.dirHtml = tpl.rule.dir[0];
        cfg.dirCss = tpl.rule.dir[1];
        Common.createTemplate(argv, cfg, taskCallback);
    }
}

//快速打开任务文件夹
function taskOpen(argv, taskCallback){
    return function(){
        var th = config.dir_local_html;
        var ts = config.dir_local_css;
        if(argv.d){
            if(typeof argv.d != 'string'){
                console.log('-d参数指定具体工作任务名字应该是字符串...');
                if(!!taskCallback) taskCallback();
                return;
            }
            if(!config.jobs[argv.d]){
                console.log('工作任务'+ argv.d +'不存在...');
                if(!!taskCallback) taskCallback();
                return;
            }
            var arr = config.jobs[argv.d].split(',');
            th = config.root_html + arr[0];
            ts = config.root_mediastyle + arr[1];
        }
        config.setCurrentJob();
        Common.openFolder(th);
        Common.openFolder(ts);
        if(!!taskCallback) taskCallback();
    }
}

//测试用例
function taskTest(argv, taskCallback){
    return function(){
        gulp.src('test/*.css')
            .pipe(tobase64({
                    maxsize: 8,        
                    ignore: /(?!.*\bbase64\b)^.*$/g
                }
            ))
            .pipe(ySprite({
                slice: 'test',
                sprite: 'test/sprite',
                engine: require('phantomjssmith'),
                callback: function(stream){
                    stream.pipe(yStamp({
                        stamp: {
                            md5: true,
                            // d: (new Date()).format("yyyyMMddhhmmss"),
                            max_age: '2592000'
                        },
                        callback: function(stream){
                            stream.pipe(gulp.dest('test/result'))
                                .pipe(next(function(){
                                    console.log('测试运行成功...');
                                    if(!!taskCallback) taskCallback(['测试运行OK...']);
                                }));;
                        }
                    }))
                }
            }))
    }
}

//修改配置
gulp.task(config.task.config, taskSetConfig(argv));
config.taskFun[config.task.config] = taskSetConfig;
//服务器管理
gulp.task('server', taskServer(argv));
config.taskFun['server'] = taskServer;
//添加工作记录
gulp.task(config.task.add, taskAdd(argv));
config.taskFun[config.task.add] = taskAdd;
//删除一个工作记录
gulp.task(config.task.del, taskDel(argv));
config.taskFun[config.task.del] = taskDel;
//设置当前工作记录
gulp.task(config.task.set, taskSet(argv));
config.taskFun[config.task.set] = taskSet;
//查看所有工作记录
gulp.task(config.task.jobs, taskJobs(argv));
config.taskFun[config.task.jobs] = taskJobs;
//查看当前工作记录
gulp.task(config.task.current, taskCurrent(argv));
config.taskFun[config.task.current] = taskCurrent;
//hosts管理
gulp.task(config.task.hosts, taskHosts(argv));
config.taskFun[config.task.hosts] = taskHosts;
//生成ars提单列表
gulp.task(config.task.ars, taskArs(argv));
config.taskFun[config.task.ars] = taskArs;
//快速打开任务文件夹
gulp.task(config.task.open, taskOpen(argv));
config.taskFun[config.task.open] = taskOpen;
//压缩功能，覆盖当前图片
gulp.task(config.task.minifyImg, taskMinifyImg(argv));
config.taskFun[config.task.minifyImg] = taskMinifyImg;
//基础压缩CSS功能
gulp.task(config.task.minifyCss, taskMinifyCss(argv));
config.taskFun[config.task.minifyCss] = taskMinifyCss;
//基础雪碧图功能
gulp.task(config.task.sprite, taskSprite(argv));
config.taskFun[config.task.sprite] = taskSprite;
//测试用例
gulp.task('test', taskTest(argv));
config.taskFun['test'] = taskTest;
//UI上传服务器
config.taskFun['ui_upload_server'] = uiUploadServer;
//UI任务
gulp.task('ui', taskUI(argv));
config.taskFun['ui'] = taskUI;

//高性能执行方式入口
gulp.task('default', function() {
    function loop(){
        console.log('\n-------------------------------------------------------------------------------');
        console.log('\n童鞋，你可以在下面输入命令哟^_^\n');
        console.log('-------------------------------------------------------------------------------\n');
        process.stdin.resume();
        process.stdin.setEncoding('binary');
        process.stdin.once('data', function (chunk) {
            chunk = chunk.replace(/\r\n/g, '').trim();
            //解决命令有中文时在windows下console输出时会乱码的问题
            chunk = iconv.decode(new Buffer(chunk, 'binary'), 'GBK');
            //同一进程中不能多次执行default任务
            if(chunk == 'gulp'){
               console.log('\ngulp任务中执行此命令无效哟...');
               loop();
            }
            console.time('耗时');
            var commandResult = gulpCommandSplit(chunk);
            //gulp相关的任务命令自定义执行
            if(commandResult){
                gulpCommandRun(commandResult, function(){
                    console.log('\n-------------------------------------------------------------------------------');
                    console.log('\n命令 %s 执行完毕...', chunk);
                    console.timeEnd('耗时');
                    loop();
                });
            }
            //其它命令执行
            else {
                var command = childProcess.exec(chunk, function(err,stdout,stderr){
                    if(err){
                        console.log('\n你的命令执行失败了，原因如下：\n');
                        console.log(err);
                    }
                    console.log('\n-------------------------------------------------------------------------------');
                    console.log('\n命令 %s 执行完毕...', chunk);
                    console.timeEnd('耗时');
                    loop();
                });
                command.stdout.on('data', function(data){
                    console.log(data); 
                });
                command.stderr.on('data', function(data){
                    console.log(data); 
                });
            }
        });    
    }
    //稍微延时去除gulp default讨厌的console输出
    setTimeout(function(){
        loop();
    }, 10)
});

//自定义gulp命令分割器
function gulpCommandSplit(str){
    var argv = {};
    var parameter = [];
    var checkArr = [];
    var reg = /(?=.+\s+)(-(\w))\s+?((("|').+?\5(?=\s+))|(\S+(?!-\w\s+))|\s*?)/gi;

    // 获取命令名称
    var arr = str.split(/\s+(?=-\w\s+)/g)[0].split(/\s+/g);
    checkArr.push(arr[0], arr[1]);

    // 获取argv参数对象
    var childStrReg = /("|')(.+)\1/;
    (str + ' ').replace(reg, function($0, $1, $2, $3){
        argv[$2] = $3.replace(childStrReg, function($0, $1, $2){return $2;}) || true;
        checkArr.push($1, $3);
    });

    // 检查自定义命令语法是不是gulp相关是否正确
    var oldCheckCmd = str.replace(/\s+/g, ' ').trim();
    var newCheckCmd = checkArr.join(' ').replace(/\s+/g, ' ').trim();
    if(oldCheckCmd != newCheckCmd || arr[0] != 'gulp' || !config.taskFun[arr[1]]){
        console.log('\n童鞋你输入的命令非gulp任务命令，正在转向由系统执行，请稍后...\n');
        return null;
    }

    parameter.push(argv);

    // 服务器参数配置
    for(var key in config.servers){
        if(arr[1] == config.servers[key].cmd){
            parameter.push(config.servers[key]);
        }
    }

    // 模板命令参数配置
    for(var key in config.template){
        if(arr[1] == config.template[key].rule.command){
            parameter.push(config.template[key]);
        }
    }

    return [arr[1], parameter];
}

//执行自定义gulp命令
function gulpCommandRun(arr, callback){
    //空任务
    if(!arr || !(arr instanceof Array) || !arr.length){
        callback();
        return;
    }
    //非gulp任务
    if(!config.taskFun[arr[0]]){
        callback();
        return;
    }
    if(!callback || typeof callback != 'function'){
        callback = function(){};
    }
    config.taskFun[arr[0]].apply(this, arr[1].concat([callback]))();
}

//UI上传服务器
function uiUploadServer(argv, cb){
    return function(){
        new UIClass(argv).init(cb);
    }
}

// 打开UI操作
function taskUI(){
    return function(){
        var uicommand = childProcess.exec('electron webui/main.js', function(err,stdout,stderr){
            if(err){
                console.log('\n打开Yummy界面失败，原因如下：\n');
                console.log(err);
            }
        });
        uicommand.stdout.on('data', function(data){
            console.log(data); 
        });
        uicommand.stderr.on('data', function(data){
            console.log(data); 
        });
    }
}

// UI类
function UIClass(argv) {
    this.argv = argv;
    this.dir = argv.d;
    this.serverId = argv.i;
    this.cssFiles = [];
    this.imgFiles = [];
    this.htmlFiles = [];
    this.otherFiles = [];
    this.cssBasePath = '';
}

// UI初始化
UIClass.prototype.init = function(cb){
    var allFiles = this.argv.f.split(',');
    for(var i = 0, len = allFiles.length; i < len; i++){
        var extraname = path.extname(path.basename(allFiles[i]));
        if(extraname == '.css'){
            this.cssBasePath = path.dirname(allFiles[i]);
            var relativefilePath = path.join(config.root_mediastyle, allFiles[i].split(path.basename(config.root_mediastyle))[1]);
            this.cssFiles.push(relativefilePath);
        }else if(['.jpg','.png','.gif'].contains(extraname)){
            var relativefilePath = path.join(config.root_mediastyle, allFiles[i].split(path.basename(config.root_mediastyle))[1]);
            this.imgFiles.push(relativefilePath);
        }else if(['.html','.htm'].contains(extraname)){
            this.htmlFiles.push(allFiles[i]);
        }else {
            this.otherFiles.push(allFiles[i]);
        }
    }
    var queen = [];
    if(this.cssFiles.length){
        queen.push(this.uploadCss);
    }
    if(this.imgFiles.length){
        queen.push(this.uploadImg);
    }
    if(this.htmlFiles.length){
        queen.push(this.uploadHtml);
    }
    if(this.otherFiles.length){
        queen.push(this.uploadFile);
    }
    if(!queen.length){
        cb && typeof cb == 'function' ? cb() : '';
        return;
    }
    // 顺序执行上传过程
    function orderRun(that, i){
        queen[i].call(that, function(){
            if(++i < queen.length){
                orderRun(that, i);
            }
            if(i == queen.length){
                cb && typeof cb == 'function' ? cb() : '';  
            }
        });
    }
    orderRun(this, 0);
}

// UI上传文件（普通格式）
UIClass.prototype.uploadFile = function(cb){
    var that = this;
    gulp.src(that.otherFiles, {base: config.root_mediastyle})
        .pipe(gulp.dest(that.dir))
        .pipe(next(function(){
            cb && typeof cb == 'function' ? cb() : '';
        }));
}

// UI上传样式
UIClass.prototype.uploadCss = function(cb){
    var that = this;
    var stamp = {
        max_age: '2592000'
    };
    if(this.argv.m){
        stamp.md5 = true;
    }
    gulp.src(that.cssFiles, {base: config.root_mediastyle})
        .pipe(cssimport({extensions: ["!less", "!sass"]}))
        .pipe(tobase64({
                maxsize: 8,        
                ignore: /(?!.*\bbase64\b)^.*$/g
            }
        ))
        .pipe(ySprite({
            slice: that.cssBasePath,
            sprite: that.cssBasePath + '/sprite',
            engine: require('phantomjssmith'),
            callback: function(stream){
                stream.pipe(yStamp({
                    stamp: stamp,
                    callback: function(stream, backgroundImgs){
                        //需不需要把相关资源也上传
                        var isNeedToUploadImg = !!that.imgFiles.length;
                        if(that.argv.r){
                            that.imgFiles = that.imgFiles.concat(backgroundImgs).unique();
                            process.send({action: 'sync', imgs: that.imgFiles});
                        }
                        stream.pipe(minifyCSS({
                            advanced: false,//类型：Boolean 默认：true [是否开启高级优化（合并选择器等）]
                            compatibility: 'ie7',//类型：String 默认：''or'*' [启用兼容模式； 'ie7'：IE7兼容模式，'ie8'：IE8兼容模式，'*'：IE9+兼容模式]
                            keepBreaks: false//类型：Boolean 默认：false [是否保留换行]
                        }))
                        .pipe(gulp.dest(that.dir)).pipe(next(function(){
                            // 如果没有同步资源，有可能会因为sprite产生图片
                            if(!that.argv.r){
                                that.imgFiles.push(that.cssBasePath + '/sprite/*');
                            }
                            // 如果本来是不需要上传图片的，但具有图片时（同步资源或sprite产生）需要上传
                            if(!isNeedToUploadImg && that.imgFiles.length){
                                that.uploadImg(function(){
                                    console.log('样式上传到完毕...');
                                    cb && typeof cb == 'function' ? cb() : '';
                                });
                                return;
                            } 
                            console.log('样式上传到完毕...');
                            cb && typeof cb == 'function' ? cb() : '';
                        }));
                    }
                }));
            }
        }));
}

// UI上传图片
UIClass.prototype.uploadImg = function(cb){
    var that = this;
    if(!that.imgFiles.length){
        cb && typeof cb == 'function' ? cb() : '';
        return;
    }
    function upImg(key){
        var imageminParamObj = {
            quality: '65-80', 
            optimizationLevel: 3, 
            progressive: true, 
            interlaced: true , 
            svgoPlugins: [{removeViewBox: false}]
        };
        if(that.argv.p){
            imageminParamObj['use'] = [pngquant()];
        }
        gulp.src(that.imgFiles[key], {base: config.root_mediastyle})
            .pipe(imagemin(imageminParamObj))
            .pipe(gulp.dest(that.dir))
            .pipe(next(function(){
                if(++key < that.imgFiles.length){
                    upImg(key);
                }else {
                    console.log('图片上传到完毕...');
                    cb && typeof cb == 'function' ? cb() : '';
                }
            }));
    }
    upImg(0);
}

// UI上传HTML
UIClass.prototype.uploadHtml = function(cb){
    var that = this;
    var nameIndex = 1;
    gulp.src(that.htmlFiles)
        .pipe(rename(function (pathDir) {
            //重命令新上传的html为1.html,2.html,3.html...
            pathDir.basename = nameIndex++;
        }))
        .pipe(tap(function(file){
            var reg = /\bhttp:\/\/imgcache.gtimg.cn\/mediastyle\//g;
            var content = file.contents.toString().replace(reg, '');
            file.contents = new Buffer(content);
        }))
        .pipe(gulp.dest(that.dir))
        .pipe(next(function(){
            //打开1.html页面
            var projDir = path.basename(that.dir);
            var username = path.basename(path.dirname(that.dir));
            console.log('mobileDir----->'+that.dir);
            var linkPre = config.servers[that.serverId].site + username + '/' + projDir + '/';
            var linkArr = [];
            for(var i = 1; i < nameIndex; i++){
                linkArr.push(linkPre + i + '.html');
            }
            process.send({action: 'qrcode', linkArr: linkArr});
            Common.openLink(linkArr[0]);
            cb && typeof cb == 'function' ? cb() : '';
        }));
}

//通过进程message来监听主进程传递进来的数据 
process.on("message",function(message) { 
    switch(message.action){
        case 'init_data':
            process.send({
                action: 'init_data',
                root_mediastyle: config.root_mediastyle,
                task: config.task,
                template: config.template,
                servers: config.servers,
                hosts: JSON.stringify(hosts.get()),
                callback: message.callback || ''
            });
            break;

        case 'openLink':
            Common.openLink(message.link);
            break;

        case 'command':
            console.log('Your command is: ' + message.command);
            var tcnt = new TimeCount();
            tcnt.time('耗时');
            var commandResult = gulpCommandSplit(message.command);
            if(!!commandResult){
                gulpCommandRun(commandResult, function(cbDataArr){
                    var timeNeed = tcnt.timeEnd('耗时');
                    process.send({action: 'command', result: message.name ? (message.name + '成功......   耗时：' + timeNeed + 'ms') : '', cbDataArr: cbDataArr, callback: message.callback});
                });
            }else {
                var childCmdProcess = childProcess.exec(message.command, function(err,stdout,stderr){
                    if(err){
                        console.log('\n你的命令执行失败了，原因如下：\n');
                        console.log(err);
                        process.send({action: 'debug', data: '命令执行失败，原因如下：'});
                        for(var key in err){
                            process.send({action: 'debug', data: key + '：' + err[key]});
                        }
                        return;
                    }
                    var timeNeed = tcnt.timeEnd('耗时');
                    process.send({action: 'command', result: message.name + '成功......   耗时：' + timeNeed + 'ms', callback: message.callback});
                });
                childCmdProcess.stdout.on('data', function(data){
                    console.log(data); 
                    process.send({action: 'debug', data: data});
                });
                childCmdProcess.stderr.on('data', function(data){
                    console.log(data); 
                    process.send({action: 'debug', data: data});
                });
            }
    }
    
});


module.exports.run = function(){
    gulp.run('ui');
}
