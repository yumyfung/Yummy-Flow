#!/usr/bin/env node  
var program = require('commander');
var childProcess = require('child_process');

// 迭代数据更新
var VERSION =  'v2.0.0';
var versionAttr = VERSION.replace(/\./g, '');

var globalPlugins = {
	base: ['gulp', 'electron-prebuilt']
};
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
    .option('-c, --cnpm', 'replace npm with cnpm in taobao')
    .parse(process.argv);

if(program.install){
	console.log('!@#$%^&*-----install Yummy-----');
	var g_install = [], l_install = [];
	for(var key in globalPlugins){
		g_install = g_install.concat(globalPlugins[key]);
	}
	for(var key in localPlugins){
		l_install = l_install.concat(localPlugins[key]);
	}
	installPlugins(g_install, l_install);
	return;
}

if(program.update){
	console.log('!@#$%^&*-----update Yummy-----');
	installPlugins(globalPlugins[versionAttr], localPlugins[versionAttr]);
	return;
}

// 默认启动界面
var path = require('path');
var binPath = path.dirname(path.dirname(childProcess.argv.pop()));
childProcess.chdir(binPath);
require('../gulpfile.js').run();

// 安装插件
function installPlugins(globalPlugins, localPlugins){
	console.log('\n开始安装插件，请稍后...');
	var plugins = globalPlugins.concat(localPlugins);
	var len = plugins.length;
	var npm = program.cnpm ? 'cnpm' : 'npm';
	var globalCmd = npm + ' install -g ';
	var localCmd = npm + ' install --save-dev ';
	//mac平台
	if(/^darwin/gi.test(childProcess.platform)){
	    globalCmd = 'sudo ' + globalCmd;
	    localCmd = 'sudo ' + localCmd;
	}
	function install(i){
		var cmd = localCmd + plugins[i];
		var tip = '本地';
		if(i < globalPlugins.length){
			cmd = globalCmd + plugins[i];
			tip = '全局';
		}
		console.log('\n正在安装' + tip + '插件' + plugins[i] + '...');
		childProcess.exec(cmd, function(err,stdout,stderr){
			if(err){
				console.log('\n' + tip + '插件' + plugins[i] + '安装失败...');
				console.log('error=>' + err);
			}else {
				console.log('\n' + tip + '插件' + plugins[i] + '安装完毕...，剩余' + (len-i-1) + '个安装插件...');
			}
			if(++i < len){
			 	install(i);
			}else {
				console.log('\n恭喜，Yummy插件安装完毕...');
			}
		});
	};
	install(0);
}