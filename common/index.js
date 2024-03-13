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