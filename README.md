# Yummy-Flow

Yummy-Flow就是一个基于nodejs和gulp来开发的前端自动化流程工具，它将前端开发人员常用的样式压缩、图片压缩、合并和上传等一系列繁杂的工作整合起来，提供智能一条龙服务，能够用于辅助团队规范开发，提高团队的工作效率。

## 安装Yummy-Flow

建议使用facebook的yarn代替npm安装，快速&少报错，运行如下命令：

```
npm i -g yarn

```
yarn命令与npm的全局安装路径不一样，请执行如下命令将输出的结果路径配到环境变量中

```
yarn global bin

```

下载Yummy-Flow项目，安装Yummy-Flow

```
cd yumy-flow
npm run run:win (for windows)
npm run run:mac (for macOs)

```

## 启动

建议选择位置本地安装Yumy-Flow，如果非全局安装，安装目录下执行如下命令启动界面

```

gulp ui

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

3、问：报错如下怎呀处理？

```
error pngjs@0.4.0: The engine "node" is incompatible with this module. Expected version "0.8.x".
error Found incompatible module
info Visit https://yarnpkg.com/en/docs/cli/add for documentation about this command.
```

答：在命令后加--ignore-engines参数

4、有时候很容易报一些git,gc++之类的错误，一般都是环境问题，可以安装依赖环境（一般都是针对新电脑，如已安装请忽略此步骤）

请先确保你的电脑环境安装了Git、BuildTools_Full(C++编译工具和Python)，没有的话可以执行下面的命令安装

安装BuildTools

```
npm i -g build-tools

```

安装phantomjs

```
npm install -g phantomjs

```
安装Git，Windows下自行下载安装，MacOS下可用以下命令

```
brew install git

```

配置Git和Python到环境变量，可输入命令git --version和python --version分别查看是否安装成功，成功后请重新打开命令窗口执行接下来的步骤。

5、mac下插件phantomjs经常会报错安装失败，建议使用brew安装

公司网络有代理的，先配置代理，否则会下载失败（这个命令只对当前终端有效，退出就不行了

```
export ALL_PROXY=http://web-proxy.xxx.com:8080

```

然后执行phantomjs -v如果还是找不到，建议执行如下命令进行强制brew link

```
brew link --overwrite phantomjs

```
如果有多个phantomjs环境变量导致混乱，建议执行如下命令添加环境变量

```
vi ~/.bash_profile
export PATH=$PATH:/usr/xxx/xxx/bin (这里是brew install phantomjs的安装路径)
source ~/.bash_profile
```


[更多内容查看使用教程](http://yumyfung.github.io/yummy.github.io/)