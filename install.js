/*============================================================
      @作者：yumyfeng
      @说明：批量安装CutFlow基础依赖的gulp插件
      @最后编辑：$Author:: yumyfeng       $
                 $Date:: 2015-07-06 14:06:05#$
=============================================================*/
var process = require('child_process');

var globalPlugins = ['gulp', 'electron-prebuilt'];
var localPlugins = ['gulp', 'iconv-lite','gulp-if','gulp-util','yargs','gulp-uglify','gulp-base64','gulp-rename','gulp-cssimport','gulp.spritesmith','gulp-concat','gulp-minify-css','gulp-tap','gulp-changed','gulp-imagemin','imagemin-pngquant','gulp-tobase64', 'gulp-if', 'iconv-lite', 'gulp-next', 'gulp-ysprite', 'gulp-ystamp', 'electron-prebuilt'];

function installPlugins(){
	console.log('\n开始安装插件，请稍后...');
	var plugins = globalPlugins.concat(localPlugins);
	var len = plugins.length;
	var globalCmd = 'npm i --g ';
	var localCmd = 'npm i --save-dev ';
	//mac平台
	if(/^darwin/gi.test(process.platform)){
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
		process.exec(cmd, function(err,stdout,stderr){
			if(err){
				console.log('\n' + tip + '插件' + plugins[i] + '安装失败...');
				console.log('error=>' + err);
			}else {
				console.log('\n' + tip + '插件' + plugins[i] + '安装完毕...，剩余' + (len-i-1) + '个安装插件...');
			}
			if(++i < len){
			 	install(i);
			}else {
				console.log('\n恭喜，所有插件安装完毕...');
			}
		});
	};
	install(0);
}

installPlugins();