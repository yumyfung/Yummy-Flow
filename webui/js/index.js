var child_process = require('child_process'); 
var path = require('path');
var win = require('remote').getCurrentWindow();
var dialog = require('remote').require('dialog'); 
var clipboard = require('remote').require('clipboard');
//var app = require('remote').require('app');

var menuId = 0;
var task = null;
var globalServers = null;
var F5Finish = true;
var initData;
var globalCpCallback = {};
var hostsJson = null;

// UI上Shell命令缓存管理器
var globalShellCommand = {
  cmd: [], 
  key: 0,
  add: function(cmd){
    this.cmd.push(cmd);
    this.key = this.cmd.length;
  },
  next: function(){
    this.key++;
    return this._getCmd();
  },
  pre: function(){
    this.key--;
    return this._getCmd();
  },
  _getCmd: function(){
    if(this.key < 0) this.key = 0;
    if(this.key > this.cmd.length - 1) this.key = this.cmd.length - 1;
    return this.cmd[this.key] || '';
  }
};

// 任务库公用
var menuLib = {
  // hash表
  hash: {
    radio_cssmin: {
      type: 'tools',
      who: '压缩CSS文件',
      F5: null,
      rules: ['.css'],
      child: null,
      tips: '请把CSS文件拖到这里压缩'
    },
    radio_imgmin: {
      type: 'tools',
      who: '压缩图片',
      F5: null,
      rules: ['.png', '.jpg', '.gif'],
      child: ['#png8_fun'],
      tips: '请把图片拖到这里压缩'
    },
    radio_sprite: {
      type: 'tools',
      who: '合并图片',
      F5: null,
      rules: ['.png', '.jpg', '.gif'],
      child: ['#png8_fun'],
      tips: '请把图片拖到这里合并'
    }
  },
  // 过滤合法文件
  getLeaglePath: function(files, hashId, root){
    var filesArr = [];
    for(var i = 0, len = files.length; i < len; i++){
      var fileExtname = path.extname(path.basename(files[i].path));
      // html页面不需要限定样式root目录
      if(menuLib.hash[hashId].type == 'flow' && !['.html','.htm'].contains(fileExtname) && path.normalize(files[i].path).indexOf(path.normalize(root)) != 0){
        console.log('The file path ' + files[i].path + '  is wrong!');
        alert('文件路径 ' + files[i].path + ' 不合规则 ！');
        return false;
      }
      if(!this.hash[hashId].rules.contains(fileExtname)){
        console.log('This file ' + files[i].path + ' has a wrong format!');
        alert('文件 ' + files[i].path + ' 格式不被允许！');
        return false;
      }
      filesArr.push(files[i].path);
    }
    return filesArr;
  },
  // 生成提单
  getArs: function(arr){
    var strArs = '<div class="ars_list"><h3>提单文件列表：</h3><div class="ars_content">';
    var strSite = '<div class="site_list"><h3>网址列表：</h3><div class="site_content">';
    var tmpArs = globalServers[menuId.replace('base_server_','')].ars;
    var tmpSite = globalServers[menuId.replace('base_server_','')].site;
    for(var i = 0, len = arr.length; i < len; i++){
      strArs += '<p>' + arr[i].replace(/.+?(?=mediastyle)/, tmpArs).replace(/\\/g, '/') + '</p>';
      strSite += '<p>' + arr[i].replace(/.+?(?=mediastyle)/, tmpSite).replace(/\\/g, '/') + '</p>';
    }
    strArs += '</div><p class="btn_ars_wrap"><a class="btn_copy_ars" href="#">狠狠点击这里复制提单</a></p></div>';
    strSite += '</div></div>';
    var $strWrapNode = $('<div class="special_list"></div>');
    $strWrapNode.append(strArs).append(strSite);
    $('#holder').append($strWrapNode);
    // 复制提单
    $strWrapNode.on('click', '.btn_copy_ars', function(){
      var copyText = '';
      $(this).parent().parent().find('.ars_content > p').each(function(){
        copyText += $(this).text() + '\r\n';
      });
      clipboard.writeText(copyText);
    });
  },
  // 打印提示
  print: function(hashId, arr){
    if(arguments.length == 1){
      for(var i = 0, len = arguments[0].length; i < len; i++){
        $('#holder').append('<p>' + arguments[0][i] + '</p>');
      }
    }else if(arguments.length == 2){
      for(var i = 0, len = arr.length; i < len; i++){
        $('#holder').append('<p>正在上传' + this.hash[hashId].who + '：' + arr[i] + '</p>');
      }
    }
  },
  // 等待提示
  showTaskWaitingTips: function(){
    $('#holder').append('<div class="waiting_loading line-scale-pulse-out-rapid"><div></div><div></div><div></div><div></div><div></div></div>');
  },
  // 关闭等待提示
  closeTaskWaitingTips: function(){
    $('#holder .waiting_loading').eq(-1).hide();
  },
  // 内部提示文字更新
  showInnerTips: function(hashId){
    $('.inner_tips').html(this.hash[hashId].tips);
  }
};

var start_process = function (child_process, indexFile) { 
    // 生成子进程
    var cp = child_process.fork(indexFile); 
    // 初始化数据
    cp.send({action: 'init_data'});

    // domInit是否已经执行，防止多次初始化数据时domInit函数多次执行
    var domIsInit = false; 

    cp.on('message', function(message){
      switch(message.action){
        // 数据初始化
        case 'init_data':
          initData = message;
          $('.root_text').val(message.root_mediastyle);
          globalServers = message.servers;
          // hosts管理
          hostsJson = JSON.parse(message.hosts);
          $('#hosts_group_list ul').html('');
          for(var key in hostsJson){
            var hostListStr = '';
            var selectAll = false;
            for(var i = 0, len = hostsJson[key].length; i < len; i++){
              var checkedStr = '';
              if(!hostsJson[key][i].disabled){
                checkedStr = 'checked';
                selectAll = true;
              }
              hostListStr += '<p class="hosts_list_item"><label><input type="checkbox" ' + checkedStr + ' group="' + key + '"/><span class="hosts_ip">' + hostsJson[key][i].ip + '</span><span class="hosts_domain">' + hostsJson[key][i].domain + '</span></label></p>';
            }
            $('#hosts_group_list ul').prepend('\
              <li>\
                  <a class="btn_update" data-group="' + key + '" href="#">update</a>\
                  <a class="btn_delete" data-group="' + key + '" href="#">remove</a>\
                  <h3 class="hosts_title"><label><input type="checkbox" ' + (selectAll ? 'checked' : '') + ' groupbox="' + key + '"/>' + key + '</label></h3>\
                  <div class="hosts_list">' + hostListStr + '</div>\
              </li>\
            ');
          }
          // 清空
          $('.sidebar_servers ul').html('');
          $('#servers').html('');
          for(var i = 0, len = message.servers.length; i < len; i++){
            var server = message.servers[i];
            var checkedVal = (i == 0 ? 'checked' : '');
            // 侧边栏服务器
            $('.sidebar_servers ul').append('\
                <li class="main_li">\
                    <label for="base_server_'+ i +'" class="main_nav" href="#">\
                        <p>\
                          <input type="radio" '+ checkedVal +' name="radio__base" data-id="base_server_'+ i +'" server-id="'+ i +'" class="base_server base_server_'+ i +'" id="base_server_'+ i +'"/>\
                          <span>'+ server.name +'</span>\
                        </p>\
                    </label>\
                </li>\
            ');
            // 设置栏服务器
            $('#servers').append('<p class="server_item"><a class="btn_view_server" server-id="'+ i +'" href="#">'+ server.name +'</a><i class="btn_server_delete" server-id="'+ i +'"></i></p>');
            // 动态添加服务器信息记录
            menuLib.hash['base_server_' + i] = {
              type: 'flow',
              who: server.name,
              F5: null,
              rules: server.format,
              child: ['#sync_fun', '#stamp_fun', '#absolute_fun', '#folder_fun', '#png8_fun'],
              tips: '请把文件拖到这里上传到' + server.name
            };
          };
          task = message.task;
          var tplOptStr = '';
          for(var key in message.template){
            tplOptStr += '<option value="' + message.template[key].rule.command + '">' + message.template[key].rule.name + '</option>'
          }
          $('#tpl_select_name').html(tplOptStr);
          // 初始化DOM
          if(!domIsInit){
            domIsInit = true; 
            domInit(cp);
          }
          break;

        // 同步资源补充提单和网址列表
        case 'sync':
          // 展示同步资源上传服务器的补充提单和网址列表
          var tmpArs = globalServers[menuId.replace('base_server_','')].ars;
          var tmpSite = globalServers[menuId.replace('base_server_','')].site;
          if(tmpArs){
            var strArs = '';
            var strSite = '';
            for(var i = 0, len = message.imgs.length; i < len; i++){
              strArs += '<p>' + message.imgs[i].replace(/.+?(?=mediastyle)/, tmpArs).replace(/\\/g, '/') + '</p>';
              strSite += '<p>' + message.imgs[i].replace(/.+?(?=mediastyle)/, tmpSite).replace(/\\/g, '/') + '</p>';
            }
            $('.ars_list .ars_content').eq(-1).append(strArs);
            $('.site_list .site_content').eq(-1).append(strSite);
          }
          // 展示普通同步资源上传服务器
          else {
            var imgsArr = [];
            for(var i = 0, len = message.imgs.length; i < len; i++){
              imgsArr.push(message.imgs[i]);
            }
            menuLib.print(menuId, imgsArr);
          }
          break;

        // 展示链接和二维码体验
        case 'qrcode':
          var html = '<div class="mod_link_qrcode"><h3>体验链接与二维码如下：</h3>';
          for(var i = 0, len = message.linkArr.length; i < len; i++){
            html += '<p class="mod_link"><a href="###">' + message.linkArr[i] + '</a></p>';
            html += '<p class="mod_qrcode" data-link="' + message.linkArr[i] + '"></p>';
          }
          html += '</div>';
          var $html = $(html);
          $('#holder').append($html);
          $html.find('.mod_qrcode').each(function(){
            $(this).qrcode({'size': 100, 'text': $(this).attr('data-link')});
          }).end().find('.mod_link a').each(function(){
              $(this).click(function(){
                  var link = $(this).html().trim();
                  cp.send({action: 'openLink', link: link});
              });
          });
          break;

        // 命令
        case 'command':
          menuLib.closeTaskWaitingTips();
          if(message.cbDataArr && message.cbDataArr.length){
            menuLib.print(message.cbDataArr);
          }
          F5Finish = true;
          // 升级版本提示特殊处理
          if(message.code == task['update']){
            if(message.state == 0){
              $('.update_wrap').hide();
              return;
            }else if(message.state == 1){
              $('.update_wrap').addClass('updating');
              return;
            }else if(message.state == 2){
              $('.update_wrap').removeClass('updating').hide();
              menuLib.print(['正在重新启动程序...']);
              win.reload(); //重新加载页面
              alert('升级新版本完成！');
            }
          }
          // 命令执行完毕成功提示
          if(message.result){
            $('#holder').append('<p>' + message.result + '</p>');
          }
          break;

        // 输出有需要的console.log调试信息
        case 'debug':
          $('#holder').append('<p>' + message.data + '</p>');
          break;

      }
      // 命令发送成功后回调函数
      if(!!message.callback && !!globalCpCallback[message.callback]){
        globalCpCallback[message.callback]();
      }
      // 滚动条滑动到底部
      $('#holder').animate({scrollTop: holder.scrollHeight}, 600); 
    });

    cp.on('exit', function () { 
        start_process(child_process, indexFile); 
    }) 
} 

start_process(child_process, 'gulpfile.js'); 

function domInit(cp){

  // 打开选择文件夹
  function openDirectory(cb){
    var args = [{properties: ['openDirectory']}, function(filenames){
      if(!filenames) return;
      filePath = path.normalize(filenames[0]).replace(/\\/g, '/');
      cb(filePath);
    }];
    dialog.showOpenDialog.apply(this, args);
  }

  $(function(){
    // 左侧栏栏目初始化
    function initSidebar(){
      menuId = $('.main_li input:radio[name="radio__base"]:checked').attr('data-id');
      console.log('\nmenuId--->'+menuId);
      menuLib.showInnerTips(menuId);
      // 子选项
      var child = menuLib.hash[menuId].child;
      $('.main_li').removeClass('current').find('.sub_nav_box').remove();
      $('#child_menu li').removeClass('current').hide();
      if(child){
        for(var i = 0; i < child.length; i++){
          $(child[i]).show();
          if($(child[i]).find('input').attr('checked')){
            $(child[i]).addClass('current');
          }
        }
      }
      $('#'+menuId).parent().parent().parent().addClass('current').append($('#child_menu').html());
    }

    initSidebar();

    globalCpCallback['callback_init_sidebar'] = initSidebar;
    globalCpCallback['callback_init_data'] = function(){
      cp.send({action: 'init_data'}); 
    }
    globalCpCallback['callback_init_data_sidebar'] = function(){
      cp.send({action: 'init_data', callback: 'callback_init_sidebar'}); 
    }

    // 改变左侧任务时
    $('.sidebar_item').on('change', 'input:radio[name="radio__base"]', function(){
        initSidebar();
    }); 

    // main_menu切换
    $('.main_menu .menu_item').click(function(){
      var index = $(this).index();
      $(this).parent().find('.menu_item').removeClass('current').eq(index).addClass('current');
      $('.main_menu_content .sidebar_item').hide().eq(index).show().find('input:radio[name="radio__base"]').attr('checked', false).eq(0).attr('checked', true);
      initSidebar();
    });

    // 可先项事件
    $('.sidebar_item .main_li').on('click', '.sub_nav_box li', function(){
      if($(this).find('input').attr('checked')){
        $(this).addClass('current');
        return;
      }
      $(this).removeClass('current');
    });

    // 关闭浮层面板
    $('.mod_layer_wrap .mod_layer_wrap_close').click(function(){
      $(this).parent().parent().hide();
    });

    // 关闭配置面板
    $('#dir_config_layer').click(function(e){
        var $this = $(this);
        // 保存设置数据 => 站点根目录
        var root = $('.root_text').val();
        if(root != initData.root_mediastyle){
          cp.send({action: 'command', code: task['config'], name: '修改站点根目录', command: 'gulp ' + task['config'] + ' -s root_mediastyle=' + filePath});
        }
        $this.find('.mod_layer_anim').removeClass('play');
        setTimeout(function(){
            $this.hide();
        }, 800);
        e.stopPropagation();  //阻止事件向上冒泡 
    });

    $('#dir_config_layer .mod_layer_anim').click(function(e){
      e.stopPropagation();  //阻止事件向上冒泡 
    });

    // 打开配置面板
    $('.btn_config').click(function(){
      //重新初始化一下数据，可能已经修改
      cp.send({action: 'init_data', callback: 'initSidebar'}); 
      $('#dir_config_layer').show(10, function(){
        $('#dir_config_layer .mod_layer_anim').addClass('play');
      });
    });

    // 切换配置面板tab
    $('.setting_menu').on('click', '.setting_menu_item', function(){
        var index = $(this).index();
        $('.setting_menu .setting_menu_item').removeClass('current');
        $(this).addClass('current');
        $('#dir_config_layer .content').removeClass('current').eq(index).addClass('current');
    });

    // 选择路径目录
    $('.mod_flex_layout__row').on('click', '.mod_choose_dir', function(){
      var that = this;
      var cb = function(filePath){
        $(that).parent().find('.mod_flex_layout__text').val(filePath);
      };
      openDirectory(cb);
    });

    // 点击单个服务器进行配置
    $('#servers').on('click', '.server_item .btn_view_server', function(){
      // 回填数据
      $('#server_layer').show();
      var sId = $(this).attr('server-id');
      var server = globalServers[sId];
      $('#server_layer .mod_layer_title').text(server.name);
      $('#server_layer .server_name .mod_flex_layout__text').val(server.name);
      $('#server_layer .server_cmd .mod_flex_layout__text').val(server.cmd);
      $('#server_layer .server_dir .mod_flex_layout__text').val(server.dir);
      $('#server_layer .server_format .mod_flex_layout__text').val(server.format);
      $('#server_layer .server_ars .mod_flex_layout__text').val(server.ars);
      $('#server_layer .server_site .mod_flex_layout__text').val(server.site);
      // 更新数据
      $('#server_layer .mod_layer_btn').off('click');
      $('#server_layer .mod_layer_btn').on('click', function(){
        // 数据检查
        $('#server_layer .mod_flex_layout__text').each(function(){
          if((typeof $(this).attr('required') != 'undefined') && !$(this).val().trim()){
            $(this).addClass('warnning');
            throw '';
          }
          $(this).removeClass('warnning');
        });
        var name = $('#server_layer .server_name .mod_flex_layout__text').val().trim();
        var cmd = $('#server_layer .server_cmd .mod_flex_layout__text').val().trim();
        var dir = $('#server_layer .server_dir .mod_flex_layout__text').val().trim();
        var format = $('#server_layer .server_format .mod_flex_layout__text').val().trim().split(',').join('&');
        var ars = $('#server_layer .server_ars .mod_flex_layout__text').val().trim();
        var site = $('#server_layer .server_site .mod_flex_layout__text').val().trim();
        if(name == server.name && cmd == server.cmd && dir == server.dir && format == server.format.join('&') && ars == server.ars && site == server.site){
          alert('没有配置信息的更新');
          return;
        }
        var str = 'name=' + name + ',cmd=' + cmd + ',dir=' + dir + ',format=' + format + ',ars=' + ars + ',site=' + site;
        cp.send({action: 'command', code: 'server', name: '更新新服务器' + name + '信息', command: 'gulp server -w update -n '+ sId +' -d "'+ str +'"', callback: 'callback_init_data_sidebar'});
        $('#server_layer').hide();
      });
    });

    // 添加hosts
    $('#btn_add_hosts').on('click', function(){
      $('#hosts_layer').show();
      $('#hosts_layer .mod_layer_btn').off('click');
      $('#hosts_layer .mod_layer_btn').on('click', function(){
        var groupName = $('#hosts_groupname').val().trim();
        var hostsContent = $('#hosts_list_content').val().trim();
        if(!groupName || !hostsContent){
          alert('hosts的组名和内容都不要为空哟！');
          return;
        }
        var hostsArr = hostsContent.split(/\n/g);
        for(var i = 0, len = hostsArr.length; i < len; i++){
          var disabled = '';
          if(hostsArr[i].trim().charAt(0) == '#'){
            disabled = true;
            hostsArr[i] = hostsArr[i].replace(/#/g, '');
          }
          var hostsLineArr = hostsArr[i].trim().split(/\s+/g);
          cp.send({action: 'command', code: task['hosts'], name: '添加hosts => ' + hostsLineArr[0] + ' ' + hostsLineArr[1], command: 'gulp ' + task['hosts'] + ' -a ' + groupName + ',' + hostsLineArr[0] + ',' + hostsLineArr[1] + ',' + disabled, callback: 'callback_init_data'});
        }
        $('#hosts_layer').hide();
      });
    });

    // 更新hosts组
    $('#hosts_group_list').on('click', 'li .btn_update', function(){
      var oldGroupName = $(this).attr('data-group').trim();
      var arr = [];
      for(var i = 0, len = hostsJson[oldGroupName].length; i < len; i++){
        var disabledFlag = '';
        if(hostsJson[oldGroupName][i].disabled){
          disabledFlag = '#';
        }
        arr.push(disabledFlag + hostsJson[oldGroupName][i].ip + ' ' + hostsJson[oldGroupName][i].domain);
      }
      var oldHostsContent = arr.join('\n');
      $('#hosts_groupname').val(oldGroupName);
      $('#hosts_list_content').val(oldHostsContent);
      $('#hosts_layer').show();
      $('#hosts_layer .mod_layer_btn').off('click');
      $('#hosts_layer .mod_layer_btn').on('click', function(){
        // 删除原hosts组
        cp.send({action: 'command', code: task['hosts'], command: 'gulp ' + task['hosts'] + ' -d ' + oldGroupName});
        var groupName = $('#hosts_groupname').val().trim();
        var hostsContent = $('#hosts_list_content').val().trim();
        if(!groupName || !hostsContent){
          alert('hosts的组名和内容都不要为空哟！');
          return;
        }
        if(groupName == oldGroupName && hostsContent == oldHostsContent){
          alert('没有hosts信息的更新');
          return;
        }
        var hostsArr = hostsContent.split(/\n/g);
        for(var i = 0, len = hostsArr.length; i < len; i++){
          var disabled = '';
          if(hostsArr[i].trim().charAt(0) == '#'){
            disabled = true;
            hostsArr[i] = hostsArr[i].replace(/#/g, '');
          }
          var hostsLineArr = hostsArr[i].trim().split(/\s+/g);
          if(i == len - 1){
            cp.send({action: 'command', code: task['hosts'], name: '更新hosts组 => ' + groupName, command: 'gulp ' + task['hosts'] + ' -a ' + groupName + ',' + hostsLineArr[0] + ',' + hostsLineArr[1] + ',' + disabled, callback: 'callback_init_data'});
          }else {
            cp.send({action: 'command', code: task['hosts'], command: 'gulp ' + task['hosts'] + ' -a ' + groupName + ',' + hostsLineArr[0] + ',' + hostsLineArr[1] + ',' + disabled});
          }
        }
        $('#hosts_layer').hide();
      });
    });

    // 删除hosts组
    $('#hosts_group_list').on('click', 'li .btn_delete', function(){
      var groupName = $(this).attr('data-group').trim();
      cp.send({action: 'command', code: task['hosts'], name: '删除hosts组 => ' + groupName, command: 'gulp ' + task['hosts'] + ' -d ' + groupName, callback: 'callback_init_data'});
    });

    // hosts全选
    $('.hosts_group_list').on('change', '.hosts_title label', function(){
      var groupbox = $(this).find('input[type=checkbox]');
      if(groupbox.attr('checked')){
        $('.hosts_group_list .hosts_list input[type=checkbox][group=' + groupbox.attr('groupbox') + ']').attr('checked', false);
        cp.send({action: 'command', code: task['hosts'], name: '启用hosts组 => ' + groupbox.attr('groupbox'), command: 'gulp ' + task['hosts'] + ' -s ' + groupbox.attr('groupbox'), callback: 'callback_init_data'});
      }else {
        $('.hosts_group_list .hosts_list input[type=checkbox][group=' + groupbox.attr('groupbox') + ']').attr('checked', true);
        cp.send({action: 'command', code: task['hosts'], name: '禁用hosts组 => ' + groupbox.attr('groupbox'), command: 'gulp ' + task['hosts'] + ' -f ' + groupbox.attr('groupbox'), callback: 'callback_init_data'});
      }
    });

    // hosts选中子选项同时选中全选选项
    $('.hosts_group_list').on('change', '.hosts_list_item label', function(){
      var group = $(this).find('input[type=checkbox]');
      var domain = $(this).find('.hosts_domain').text();
      var ip = $(this).find('.hosts_ip').text();
      if(group.attr('checked')){
        $('.hosts_group_list .hosts_title input[type=checkbox][groupbox=' + group.attr('group') + ']').attr('checked', true);
         cp.send({action: 'command', code: task['hosts'], name: '启用hosts => ' + ip + ' ' + domain, command: 'gulp ' + task['hosts'] + ' -s ' + group.attr('group') + ',' + ip + ',' + domain, callback: 'callback_init_data'});
        return;
      }
      cp.send({action: 'command', code: task['hosts'], name: '禁用hosts => ' + ip + ' ' + domain, command: 'gulp ' + task['hosts'] + ' -f ' + group.attr('group') + ',' + ip + ',' + domain, callback: 'callback_init_data'});
      var selectAll = false;
      $('.hosts_group_list .hosts_list_item input=[type=checkbox][group=' + group.attr('group') + ']').each(function(){
        if($(this).attr('checked')) {
          selectAll = true;
          return false;
        }
      });
      $('.hosts_group_list .hosts_title input[type=checkbox][groupbox=' + group.attr('group') + ']').attr('checked', selectAll);
    });

    // 添加新服务器映射
    $('#btn_add_server').on('click', function(){
      $('#server_layer').show();
      $('#server_layer .mod_layer_title').text('添加新服务器映射');
      $('#server_layer .mod_flex_layout__text').removeClass('warnning').val('');
      $('#server_layer .mod_layer_btn').off('click');
      $('#server_layer .mod_layer_btn').on('click', function(){
        // 数据检查
        $('#server_layer .mod_flex_layout__text').each(function(){
          if((typeof $(this).attr('required') != 'undefined') && !$(this).val().trim()){
            $(this).addClass('warnning');
            throw '';
          }
          $(this).removeClass('warnning');
        });
        var name = $('#server_layer .server_name .mod_flex_layout__text').val().trim();
        var cmd = $('#server_layer .server_cmd .mod_flex_layout__text').val().trim();
        var dir = $('#server_layer .server_dir .mod_flex_layout__text').val().trim();
        var format = $('#server_layer .server_format .mod_flex_layout__text').val().trim().split(',').join('&');
        var ars = $('#server_layer .server_ars .mod_flex_layout__text').val().trim();
        var site = $('#server_layer .server_site .mod_flex_layout__text').val().trim();
        var str = 'name=' + name + ',cmd=' + cmd + ',dir=' + dir + ',format=' + format + ',ars=' + ars + ',site=' + site;
        cp.send({action: 'command', code: 'server', name: '添加新服务器' + name, command: 'gulp server -w add -d "'+ str +'"', callback: 'callback_init_data_sidebar'});
        $('#server_layer').hide();
      });
    });

    // 删除服务器
    $('#servers').on('click', '.server_item .btn_server_delete', function(){
      if(!confirm('确定删除该服务器映射？')) return;
      var sId = $(this).attr('server-id');
      var server = globalServers[sId];
      cp.send({action: 'command', code: 'server', name: '删除服务器' + server.name, command: 'gulp server -w delete -n '+ sId, callback: 'callback_init_data_sidebar'});
    });

    // 升级新版本
    $('#btn_update_version').on('click', function(){
      $('.update_wrap').show();
      cp.send({action: 'command', code: task['update'], name: '升级新版本', command: 'gulp ' + task['update']});
    });

    // 打开快速创建活动模板浮层
    $('.btn_create_template').click(function(){
        $('#create_tpl_layer').show();
    });

    // 提交创建活动模板
    $('#create_tpl_layer .mod_layer_btn').click(function(){
      var timePre = $('#input_timepre').attr('checked');
      var tplName = $('#tpl_select_name option:checked').val();
      var htmlPath = $('#create_tpl_layer .tpl_html .mod_flex_layout__text').val().trim();
      var stylePath = $('#create_tpl_layer .tpl_mediastyle .mod_flex_layout__text').val().trim();
      if(!htmlPath || !stylePath){
        console.log('The path to create template can not be null!');
        alert('创建活动模板的路径不能为空');
        return;
      }
      var cmd = 'gulp ' + tplName + ' -h ' + htmlPath + ' -s ' + stylePath;
      if(!timePre){
        cmd += ' -n';
      }
      cp.send({action: 'command', code: tplName, name: '创建活动模板', command: cmd});
      $('#create_tpl_layer').hide();
    });

    // UI命令shell操作
    function sendShellCommand(){
      var cmd = $('.command_shell_input').val().trim();
      if(!cmd){
        alert('命令行不能为空哟！');
        return;
      }
      globalShellCommand.add(cmd);
      cp.send({action: 'command', code: 'uishell', name: '命令 ' + cmd + ' 执行', command: cmd});
      $('.command_shell_input').val('');
    }

    // UI命令shell点击发送
    $('.btn_command_shell').click(function(e){
      sendShellCommand();
    });

    // UI命令键盘事件
    $('.command_shell_input').keyup(function(e){
      switch(e.keyCode){
        case 13:
          sendShellCommand();
          break;
        case 38:
          $('.command_shell_input').val(globalShellCommand.pre());
          break;
        case 40:
          $('.command_shell_input').val(globalShellCommand.next());
          break;
        }
    });

    // F5重新上传
    $(document).keyup(function(e){
       if(e.keyCode != 116 || !menuLib.hash[menuId].F5 || !F5Finish) return;
       F5Finish = false;
       menuLib.hash[menuId].F5();
    });

    // 禁止document拖拽效果 -> 拖拽
    document.addEventListener("drop", function(e) {
        e.preventDefault();            //
    }, false);

    // 禁止document拖拽效果 -> 拖拽结束
    document.addEventListener("dragover", function(e) {
          e.preventDefault();            // 必须调用。否则浏览器会进行默认处理，比如文本类型的文件直接打开，非文本的可能弹出一个下载文件框。
    }, false);

    // 拖拽区域限制在holder上
    var holder = document.getElementById('holder');

    holder.ondragover = function () {
      $('.dragbox').addClass('hover');
      return false;
    };

    holder.ondragleave = holder.ondragend = function () {
      $('.dragbox').removeClass('hover');
      return false;
    };

    // 放置拖动文件
    holder.ondrop = function (e) {
      e.preventDefault();
      $('.dragbox').removeClass('hover');
      var root = $('.root_text').val();
      console.log('\nroot--->'+root);
      var filesArr = [];
      var files = e.dataTransfer.files;
      // 过滤合法文件
      var result = menuLib.getLeaglePath(files, menuId, root);
      if(!result) return;

      // 判断是否是服务器模块
      if(/^base_server_\w+$/.test(menuId)){
        var serverId = menuId.replace('base_server_', '');
        menuId = 'base_server_';
      }

      switch(menuId){
          case 'base_server_':
            menuId = menuId + serverId; // 还原menuId
            function _uploadServer(serverDir){
              var cmd = 'gulp ui_upload_server -i ' + serverId + ' -d "' + serverDir + '" -f "' + result.join(',') + '"';
              if($('#sync').attr('checked')){
                cmd += ' -r';
              }
              if($('#stamp').attr('checked')){
                cmd += ' -m';
              }
              if($('#absolute').attr('checked')){
                cmd += ' -a';
              }
              if($('#png8').attr('checked')){
                cmd += ' -p';
              }
              menuLib.print(menuId, result);
              cp.send({action: 'command', code: 'ui_upload_server', name: globalServers[serverId].name, command: cmd});
              if(globalServers[serverId].ars){
                menuLib.getArs(result);
              }
              $('#holder').animate({scrollTop: holder.scrollHeight}, 600);
              menuLib.showTaskWaitingTips();
            };
            // 如果要创建新目录
            if($('#folder').attr('checked')){
              $('#dir_mobile_layer').show();
              // 确定上传
              $("#dir_mobile_layer .mod_layer_btn").one('click', function(){
                  menuLib.hash[menuId].F5 = function(){
                    var mobileDir = $('#dir_mobile_layer .mobile_dir').val();
                    if(!mobileDir.trim()){
                      console.log('文件名不能为空哟～');
                      alert('文件名不能为空哟～');
                      return;
                    }
                    $('#dir_mobile_layer').hide(); 
                    _uploadServer( path.join(globalServers[serverId].dir, mobileDir) );
                  };
                  menuLib.hash[menuId].F5();
              });
              // 关闭浮层按钮
              $('.mod_layer .close').one('click', function(){
                $('#dir_mobile_layer').hide();
              })
            } else {
              menuLib.hash[menuId].F5 = function(){
                _uploadServer(globalServers[serverId].dir);
              }
              menuLib.hash[menuId].F5();
            }
            break;

            case 'radio_cssmin':
              menuLib.hash[menuId].F5 = function(){
                var output = path.join(path.dirname(files[0].path), '__smartgulp__');
                menuLib.print(menuId, result);
                cp.send({action: 'command', code: task['minifyCss'], name: '压缩CSS文件', command: 'gulp ' + task['minifyCss'] + ' -o ' + output + ' -f "' + result.join(',') + '"'});
                $('#holder').animate({scrollTop: holder.scrollHeight}, 600);
                menuLib.showTaskWaitingTips();
              };
              menuLib.hash[menuId].F5();
              break;

            case 'radio_imgmin':
              menuLib.hash[menuId].F5 = function(){
                var output = path.join(path.dirname(files[0].path), '__smartgulp__');
                menuLib.print(menuId, result);
                var cmd = 'gulp ' + task['minifyImg'] + ' -o ' + output + ' -f "' + result.join(',') + '"';
                if($('#png8').attr('checked')){
                  cmd += ' -p';
                }
                cp.send({action: 'command', code: task['minifyImg'], name: '压缩图片', command: cmd});
                $('#holder').animate({scrollTop: holder.scrollHeight}, 600);
                menuLib.showTaskWaitingTips();
              };
              menuLib.hash[menuId].F5();
              break;

            case 'radio_sprite':
              menuLib.hash[menuId].F5 = function(){
                var output = path.join(path.dirname(files[0].path), '__smartgulp__');
                menuLib.print(menuId, result);
                var cmd = 'gulp ' + task['sprite'] + ' -o ' + output + ' -f "' + result.join(',') + '"';
                if($('#png8').attr('checked')){
                  cmd += ' -p';
                }
                cp.send({action: 'command', code: task['sprite'], name: '合并图片', command: cmd});
                $('#holder').animate({scrollTop: holder.scrollHeight}, 600);
                menuLib.showTaskWaitingTips();
              };
              menuLib.hash[menuId].F5();
              break;
      }
      return false;
    };

  });
}

// 判断一个值是否在数组中
Array.prototype.contains = function(search){
    for(var i in this){
        if(this[i] == search){
            return true;
        }
    }
    return false;
}

