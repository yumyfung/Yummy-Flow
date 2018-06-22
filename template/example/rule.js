/*============================================================
      @说明：模板规则定制，
      		每个模板都需要一个
=============================================================*/
module.exports.rule = {
	// 模板名字
	name: '分屏滑动模板',	
	// 模板生成路径
	dir: [
			'E:/DIR/myproject', 	
		  	'E:/DIR/myproject/style'
		 ],	
	// 模板命令，用于命令启动模式下使用，自定义
	command: 'template_slide',
	// 模板样式路径替换
	replaceLink: [
		'<link rel="stylesheet" href="index.css" />',
	  	'<link rel="stylesheet" href="http://example.com/style/'
	 ]
}