var app = require('app');  // Module to control application life.
var BrowserWindow = require('browser-window');  // Module to create native browser window.

// Report crashes to our server.
require('crash-reporter').start();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
var loginWindow = null;
// 当app所有的窗口都关闭的情况退出
app.on('window-all-closed', function() {
  if (process.platform != 'darwin')
    app.quit();
});

// This method will be called when atom-shell has done everything
// initialization and ready for creating browser windows.
app.on('ready', function() {
  // Create the browser window.
  var atomScreen = require('screen');
 //创建窗口
 loginWindow = new BrowserWindow({
    "width": 1000,
    "height": 600,
    "center": true,
    "resizable": false,
    "auto-hide-menu-bar": true
  });
  // 加载登录页面.
  loginWindow.loadUrl('http://dmdc.oa.com/yummy/index.html');
  //loginWindow.openDevTools({detach:true});
  // Emitted when the window is closed.

  loginWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    loginWindow = null;
  });
});