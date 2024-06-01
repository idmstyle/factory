// const url = require('url');
// const path = require('path');

if (typeof axios == 'function') axios.defaults.baseURL = 'dms://localhost';

/**
 * 获取系统环境标识
 * 
 * production 部署环境
 * testing 测试环境
 * development 开发环境
 */
if ( !('env' in window) ) window.env = function () {
    const env = window.localStorage.getItem("environment");
    return env in ["production", "development", "testing"] ? env : "production";
}

/**
 * 在不支持 clipboard api 的环境中利用 document.execCommand() 实现复制功能
 * 
 * 依赖：clipboard.js
 */
if (typeof navigator.clipboard == 'undefined') {
    navigator.clipboard = {
        writeText: async function (text) {
            return new Promise( (resolve, reject) => {
                let clipboardElement = document.createElement('input');
                clipboardElement.setAttribute('data-clipboard-text', text);

                let clipboard = new ClipboardJS(clipboardElement);
                
                clipboard.on('success', function (e) {
                    e.clearSelection();
                    delete clipboardElement;
                    clipboard.destroy();
                    resolve('success');
                });

                clipboard.on('error', function(e) {
                    clipboard.destroy();
                    reject('error');
                });

                clipboardElement.click();
            });
        }
    };
}

/**
 * 把图片 URI 转换成 file 协议地址
 * 
 * 本函数依赖 localStorage 存储的数据，如果查询失败，则返回原始字符串
 * 
 * @param {string} url 559/20x20心/01.png
 */
function imageURIToFileURL(uri) {
    if (uri.startsWith('/')) uri = uri.slice(1);

    const paths = uri.split('/');

    const pathname = localStorage.getItem('_dmstyle_album_path_' + paths[0]);
    if (pathname === null) return uri;

    paths[0] = pathname;
    return url.pathToFileURL(path.resolve(...paths)).href;
}

/**
 * 打开新的标签页
 */
const openNewTab = window.parent ? window.parent.openNewTab : function (title, url) {
    // 如果没有父页面或二者父页面定义openNewTab函数，则在当前标签页打开
    console.log('test open');
    window.location.href = url;
};