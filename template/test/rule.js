/*============================================================
      @作者：yumyfeng
      @说明：模板规则定制
      @最后编辑：$Author:: yumyfeng       $
                 $Date:: 2015-05-16 14:06:05#$
=============================================================*/

module.exports.rule = {
	name: '测试模板',
	dir: ['E:/test/html', 'E:/test/style'],
	command: 'template_test',
	replaceLink: ['<link rel="stylesheet" href="index.css" />','<link rel="stylesheet" href="http://xxx.com/style/']
}