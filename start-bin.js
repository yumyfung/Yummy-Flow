;(function(){    
    var childProcess = require('child_process');
    //  执行命令
    function runCMD(cmd, callback){
        //mac平台
        if(/^darwin/gi.test(require('os').platform())){
            cmd = 'sudo ' + cmd;
        }
        childProcess.exec(cmd, {env: process.env, maxBuffer: 20*1024*1024,  /*stdout和stderr的最大长度*/}, function(err,stdout,stderr){
            var sucess = 1;
            if(err){
                console.log('error=>' + err);
                sucess = 0;
            }
            callback(sucess);
        });
    }

    // 默认启动
    runCMD('gulp ui', function(err){
        if(!err) console.log('正在启动Yummy-Flow...');
    });
})();