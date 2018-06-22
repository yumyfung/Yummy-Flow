#!/usr/bin/env node  
;(function(){
	var childProcess = require('child_process');
	var fs = require('fs');
	var path = require('path');

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


	// 迭代数据更新
	var VERSION =  'v' + JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'))).version;

	var program = require('commander');
	// 命令设置
	program
	    .version(VERSION)
	    .option('-i, --install', 'install plugins')
	    .option('-u, --update', 'update Yummy-Flow in new version')
	    .parse(process.argv);

	// 安装
	if(program.install){
		console.log('\n!@#$%^&*-----install Yummy-Flow -----');
		runCMD('yarn global add yummy-flow --ignore-engines', function(err){
			if(!err) console.log('安装Yummy-Flow成功');
		});
		return;
	}

	// 更新
	if(program.update){
		console.log('\n!@#$%^&*-----update Yummy-----');
		runCMD('yarn global upgrade yummy-flow --latest --ignore-engines', function(err){
			if(!err) console.log('更新Yummy-Flow成功');
		});
		return;
	}

	// 默认启动
	runCMD('node start-bin.js', function(err){
		if(!err) console.log('正在启动Yummy-Flow...');
	});

})();