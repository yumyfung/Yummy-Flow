# Yummy

Yummy就是一个基于nodejs和gulp来开发的前端自动化流程工具，它将前端开发人员常用的样式压缩、图片压缩、合并和上传等一系列繁杂的工作整合起来，提供智能一条龙服务，能够用于辅助团队规范开发，提高团队的工作效率。

Yummy工具的优点：

- 跨平台性，适合在windows、mac等OS上运行
- 基于Javascript语言开发，学习门槛相对较低，更方便团队扩展与维护
- 通过gulp流式操作，减少频繁的IO操作，速度优于grunt
-工具的可扩展性强，团队可根据实际情况进行修改使用
- 支持命令行操作与界面化两种操作方式，命令少而简单，非常容易上手
- 支持团队沉淀模板接入，提升团队开发效率

## 安装

下载好安装包在要地目录后，运行命令：

```
node install.js
```
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
