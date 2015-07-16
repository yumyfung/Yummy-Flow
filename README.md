# Yummy

Yummy就是一个基于nodejs和gulp来开发的前端自动化流程工具，它将前端开发人员常用的样式压缩、图片压缩、合并和上传等一系列繁杂的工作整合起来，提供智能一条龙服务，能够用于辅助团队规范开发，提高团队的工作效率。

## 安装

下载好安装包在要地目录后，运行命令：

```
node install.js
```
[查看使用教程](http://yumyfung.github.io/yummy.github.io/)

## 文件目录体系

```
 项目/
│
│
├── css/                
│   ├── global.important.css                
│   ├── index.css                
│   └── play.css
│
├── img/                
│   ├── logo.png                
│   └── bg.png
│
├── slice/                
│   │
│   ├── index/                
│   │   ├── icon_share.png                
│   │   └── icon_more.png
│   │
│   └── 2x/                 // 2x文件夹存放2倍图片
│       │
│       └── play/
│           ├── icon_play.png                
│           └── icon_pause.png
│
├── sprite/         // 自动合并生成雪碧图                
│   ├── index.png                
│   └── play@2x.jpg             // 2x文件夹生成的2倍雪碧图
│
└── base64/                 // 存放需要转换为base64格式的小图片
    ├── up.png                
    └── down.png
```
## 常见问题

1、问：使用 node install.js 安装插件时存在失败的情况怎么办？

答：插件安装失败的情况是可能存在的，有很多情况可能导致安装失败，包括公司网络，node版本过低等，在公司安装时建议配置好代理：

```
npm config set proxy http://proxy.xxx.com:8080
```

如果确定网络是配置没问题，插件安装还是失败，有可能是node版本过低或者缓存导致的，这时候可以使用命令清除一下缓存，并更新一下node的版本。

```
npm cache clean -f
npm install -g n
n stable
```

2、问：到底选择命令操作方式还是可视化操作方式好？

答：两种方式都可以使用，甚至可以混合使用，取决于个人喜好，可视化操作是建立在命令操作方式之上的，相对会更加完善，具有方便性，一般情况下效率也更高效一些，但命令操作方式非常的适合基于文件夹维度的项目需求来使用，效率更高，而且命令行中有些挺好用的命令任务并没有完全迁移到界面中去，在命令中使用还是蛮不错的。
