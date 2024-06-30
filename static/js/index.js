
// if (typeof axios == 'function') axios.defaults.baseURL = 'http://localhost:7001';

/**
 * 获取系统环境标识
 * 
 * production 部署环境
 * testing 测试环境
 * development 开发环境
 */
if ( !('env' in window) ) {
    let env = window.localStorage.getItem("environment");
    if ( !["production", "development", "testing"].includes(env) ) env = "production";

    window.env = env;
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
    window.location.href = url;
};

// 使用 core 包裹，减少命名冲突
const core = {
    _user: null,
    _axios: null,

    init: function () {
        this.forceAuth();
    },

    get user () {
        if (this._user == null) {
            let userStr = window.localStorage.getItem('user');
            if (!userStr) return null;
        
            this._user = JSON.parse(userStr);
        }

        return this._user;
    },

    get axios () {
        if (typeof axios != 'function') return null;

        if (this._axios == null) {
            const instance = axios.create();
            // 根据当前的环境变量来初始化 api 的 baseURL
            instance.defaults.baseURL = window.env == 'production' ? 'https://open.dmstyle.cn' : 'http://localhost:3333';
            
            if (this.user != null) {
                let token = this.user.authorization;
                if (!token.toLowerCase().startsWith('bearer')) {
                    token = 'Bearer ' + token;
                }
                token.replace('bearer', 'Bearer');
                instance.defaults.headers.common['Authorization'] = token;
            }
    
            this._axios = instance;
        }

        return this._axios;
    },
    // 简单的强制登录
    forceAuth: function () {
        if (this.user == null || this.user.authorization == undefined) {
            let win = window.parent;
            win.location.href = '/auth/login?redirect=' + encodeURIComponent(win.location.href);
        }
    }
}

core.init();