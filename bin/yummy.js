#!/usr/bin/env node  
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

// 迭代数据更新
var VERSION =  'v' + JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'))).version;
var versionAttr = VERSION.replace(/\./g, '');

// 预处理命令
var preCommand = [
	'npm cache clean -f'
];

try{
	require('commander');
}catch(e){
	preCommand.push('npm install --save-dev commander --registry=https://registry.npm.taobao.org');
}

try{
	require('cnpm');
}catch(e){
	preCommand.push('npm install -g cnpm@3.0.0 --registry=https://registry.npm.taobao.org');
}

// 全局安装命令
var globalPlugins = {
	base: ['gulp@3.9.0', 'electron-prebuilt@0.30.0','phantomjs@1.9.18']
};
// 本地安装命令
var localPlugins = {
	base: ['gulp@3.9.0', 'iconv-lite@0.4.8','gulp-if@1.2.5','gulp-util@3.0.4','yargs@1.3.3','gulp-uglify@1.2.0','gulp-base64@0.1.2','gulp-rename@1.2.2','gulp-cssimport@1.3.1','gulp.spritesmith@3.5.4','gulp-concat@2.5.2','gulp-minify-css@1.0.0','gulp-tap@0.1.3','gulp-changed@1.2.1','gulp-imagemin@2.2.1','imagemin-pngquant@4.1.2','gulp-tobase64', 'gulp-if@1.2.5', 'gulp-next', 'gulp-ysprite', 'gulp-ystamp', 'electron-prebuilt@0.30.0','phantomjs@1.9.18', 'phantomjssmith@0.7.5', 'hosts-group@0.1.1', 'gulp-json-format@1.0.0', 'gulp-ysprite', 'gulp-ystamp', 'gulp-download', 'gulp-unzip', 'gulp-copy']
};

globalPlugins[versionAttr] = [];
localPlugins[versionAttr] = ['gulp-content-includer','gulp-html-prettify','gulp-autoprefixer','gulp-strip-css-comments','urllib-sync','gulp-yhtml','gulp-ftp', 'gulp-ssh', 'gulp-ystamp', 'gulp-grep-contents', 'gulp-next', 'cheerio@0.20.0'];


runPreCMD(function(){
	var program = require('commander');
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
		var g_install = [], l_install = [];
		for(var key in globalPlugins){
			g_install = g_install.concat(globalPlugins[key]).unique();
		}
		for(var key in localPlugins){
			l_install = l_install.concat(localPlugins[key]).unique();
		}
		installPlugins(g_install, l_install);
		return;
	}

	// 更新
	if(program.update){
		console.log('\n!@#$%^&*-----update Yummy-----');
		installPlugins(globalPlugins[versionAttr], localPlugins[versionAttr]);
		return;
	}

});


// 执行预处理命令
function runPreCMD(callback){
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
	var program = require('commander');
	console.log('\n开始安装插件，请稍后...');
	var plugins = globalPlugins.concat(localPlugins);
	var len = plugins.length;
	var npm = program.npm ? 'npm' : 'cnpm';
	var globalCmd = npm + ' install -g ';
	var localCmd = npm + ' install --save-dev ';
	var pluginsIng = 0;
	var errInstallPlugin = [];
	function install(i){
		var cmd = localCmd + plugins[i];
		var tip = '本地';
		if(i < globalPlugins.length){
			cmd = globalCmd + plugins[i];
			tip = '全局';
		}
		(function(i){
			console.log('\n正在安装' + tip + '插件' + plugins[i] + '...');
			++pluginsIng;
			runCMD(cmd, function(sucess){
				--pluginsIng;
				if(sucess){
					console.log('\n' + tip + '插件' + plugins[i] + '安装完毕...');
				}else{
					errInstallPlugin.push(plugins[i]);
					console.log('\n' + tip + '插件' + plugins[i] + '执行失败，请稍后手动安装...');
				}
					
			});
		})(i);
		++i;
		if(i < len){ 
			install(i);
		}
	};
	install(0);
	var timePluginsIng = pluginsIng;
	var timer = setInterval(function(){
		if(pluginsIng){
			if(pluginsIng == timePluginsIng) return;
			timePluginsIng = pluginsIng;
			console.log('\n还有'+pluginsIng+'个插件正在安装，请稍后...');
		}else{
			clearInterval(timer);
			if(errInstallPlugin.length){
				console.log('\nYummy插件命令执行完毕，部分插件安装有误，请手动安装...');
				console.log('\n需要手动安装的插件有：' + errInstallPlugin.join(',') + '\n');
			}else{
				console.log('\n恭喜，Yummy插件安装完毕...\n');
			}
			process.exit(0);
		}
	}, 5000);
	process.stdin.resume();//这句话是为了不让控制台退出
}

//  执行命令
function runCMD(cmd, callback){
	//mac平台
	if(/^darwin/gi.test(require('os').platform())){
	    cmd = 'sudo ' + cmd;
	}
	childProcess.exec(cmd, function(err,stdout,stderr){
		var sucess = 1;
		if(err){
			console.log('error=>' + err);
			sucess = 0;
		}
		callback(sucess);
	});
}