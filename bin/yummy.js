#!/usr/bin/env node  
var program = require('commander');
var childProcess = require('child_process');

// 迭代数据更新
var VERSION =  'v2.0.0';
var versionAttr = VERSION.replace(/\./g, '');

// 预处理命令
var preCommand = [
	'npm install -g cnpm --registry=https://registry.npm.taobao.org'
];
// 全局安装命令
var globalPlugins = {
	base: ['gulp', 'electron-prebuilt']
};
// 本地安装命令
var localPlugins = {
	base: ['gulp', 'iconv-lite','gulp-if','gulp-util','yargs','gulp-uglify','gulp-base64','gulp-rename','gulp-cssimport','gulp.spritesmith','gulp-concat','gulp-minify-css','gulp-tap','gulp-changed','gulp-imagemin','imagemin-pngquant','gulp-tobase64', 'gulp-if', 'iconv-lite', 'gulp-next', 'gulp-ysprite', 'gulp-ystamp', 'electron-prebuilt']
};

globalPlugins[versionAttr] = ['phantomjs'];
localPlugins[versionAttr] = ['phantomjs', 'phantomjssmith', 'hosts-group', 'gulp-json-format', 'gulp-ysprite', 'gulp-ystamp'];

// 命令设置
program
    .version(VERSION)
    .option('-i, --install', 'install base plugins')
    .option('-u, --update', 'update Yummy in new version')
    .option('-n, --npm', 'use default npm, not cnpm')
    .parse(process.argv);

// 安装
if(program.install){
	console.log('\n!@#$%^&*-----install Yummy-----');
	runPreCMD(function(){
		var g_install = [], l_install = [];
		for(var key in globalPlugins){
			g_install = g_install.concat(globalPlugins[key]).unique();
		}
		for(var key in localPlugins){
			l_install = l_install.concat(localPlugins[key]).unique();
		}
		installPlugins(g_install, l_install);
	});
	return;
}

// 更新
if(program.update){
	console.log('\n!@#$%^&*-----update Yummy-----');
	runPreCMD(function(){
		installPlugins(globalPlugins[versionAttr], localPlugins[versionAttr]);
	});
	return;
}

// 默认启动界面
var path = require('path');
var binPath = path.dirname(path.dirname(process.argv.pop()));
process.chdir(binPath);
require('../gulpfile.js').run();

// 执行预处理命令
function runPreCMD(callback){
	if(program.npm) return;
	console.log('\n请稍后，正在设置Yummy环境...');
	var len = preCommand.length, i = 0;
	if(!len) return;
	function _pre(i){
		runCMD(preCommand[i], function(){
			if(++i < len){
			 	_pre(i);
			}else {
				console.log('\nYummy环境设置完成...');
				callback();
			}
		});
	}
	_pre(0);
}

// 安装插件
function installPlugins(globalPlugins, localPlugins){
	console.log('\n开始安装插件，请稍后...');
	var plugins = globalPlugins.concat(localPlugins).unique();
	var len = plugins.length;
	var npm = program.npm ? 'npm' : 'cnpm';
	var globalCmd = npm + ' install -g ';
	var localCmd = npm + ' install --save-dev ';
	function install(i){
		var cmd = localCmd + plugins[i];
		var tip = '本地';
		if(i < globalPlugins.length){
			cmd = globalCmd + plugins[i];
			tip = '全局';
		}
		console.log('\n正在安装' + tip + '插件' + plugins[i] + '...');
		runCMD(cmd, function(){
			console.log('\n' + tip + '插件' + plugins[i] + '安装完毕...，剩余' + (len-i-1) + '个安装插件...');
			if(++i < len){
			 	install(i);
			}else {
				console.log('\n恭喜，Yummy插件安装完毕...');
			}
		});
	};
	install(0);
}

//  执行命令
function runCMD(cmd, callback){
	//mac平台
	if(/^darwin/gi.test(require('os').platform())){
	    cmd = 'sudo ' + cmd;
	}
	childProcess.exec(cmd, function(err,stdout,stderr){
		if(err){
			console.log('\n' + '命令' + cmd + '执行失败...');
			console.log('error=>' + err);
		}
		callback();
	});
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
