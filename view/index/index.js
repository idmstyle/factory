async function onload() {
    return new Promise((resolve, reject) => {
        const { ipcRenderer } = require('electron/renderer');
        // ipcRenderer.send('get-accent-color', 'window');
        // ipcRenderer.on('get-accent-color-response', (event, color) => {
        //     document.getElementById('app-header').style.backgroundColor = '#' + color;
        // });
        
        // active-caption
        // const key = '_path_';
        // const params = new URLSearchParams(window.location.search);
        // const path = params.get(key);

        // let url = 'src/home.html';
        // if (path != null) {
        //     // 去掉_path_参数
        //     params.delete(key);
        //     // 重新构建查询字符串并添加到url
        //     url = `src/${path}?${params.toString()}`;
        // }

        // // iframe重定向
        // if (url) document.getElementById('topframe-main').setAttribute('src', url);

        function updateDocumentTitle(title = '') {
            if (!title) title = event.target.contentWindow.document.title;
            if (title) document.title = title + ' - dmstyle';
        }

        const localStorageUserDataPathKey = '_dmstyle_user_data_path';
        function updateUserDataPath() {
            ipcRenderer.invoke('app-get-path', 'userData').then((path) => {
                localStorage.setItem(localStorageUserDataPathKey, path);
            });
        }
        if (localStorage.getItem(localStorageUserDataPathKey) == null) updateUserDataPath();

        for(const element of document.querySelectorAll('a[target="_blank"]')) {
            element.onclick = function (event) {
                event.preventDefault();
                const title = element.innerHTML;
                const url = element.getAttribute('href');
                openNewTab(title, url);
            }
        }

        document.querySelector('a[target="_blank"]').click();
    });
}

const tabs = new Map();
        function openNewTab(title, url) {
            const tab = tabs.get(url);

            // 已经存在的标签页，直接切换过去
            if (tab != null) return switchTo(tab.id)
            
            const id = Date.now();
            // 1、创建tab
            createTab(id, title);
            // 2、创建content
            createTabPanel(id, url);
            tabs.set(url, {title: title, id: id, url: url});
            
            switchTo(id);
        }

        function switchTo(id) {
            for(const item of document.querySelectorAll(".tab-panel")) {
                item.classList.remove("current");
                if (item.id == id) item.classList.add('current');
            }
            for(const item of document.querySelectorAll(".tab-item")) {
                item.classList.remove("current");
                if (item.id == id) item.classList.add('current');
            }
        }

        function closeTab(id) {
            if (tabs.size == 1) return true;

            const iterator = tabs.entries();
            let next = iterator.next();
            let prev;
            while(!next.done) {
                const [key, value] = next.value;
                if (value.id != id) {
                    prev = next;
                    next = iterator.next();
                    continue;
                }

                tabs.delete(key);
                break;
            }

            if (prev == undefined) prev = iterator.next();
            switchTo(prev.value[1].id);
            document.querySelectorAll('[id="' + id + '"]').forEach(element => element.remove());
        }

        function createTab(id, title) {
            const div = document.createElement("div");
            div.innerHTML = `<li class="tab-item" id="${id}"><span class="tab-title">${title}</span><span class="close-btn">&times;</span></li>`;
            document.getElementById('tab-list').append(div.childNodes[0]);
        }

        function createTabPanel(id, url) {
            // fetch(url).then(response => response.text()).then(function (text) {
            //     const div = document.createElement("div");
            //     const li = document.createElement("li");
            //     li.className = "tab-panel";
            //     li.id = id;
            //     const iframe = document.createElement('iframe');
            //     iframe.srcdoc = text;
            //     // div.innerHTML = `<li class="tab-panel" id="${id}"><iframe srcdoc='${text}'></iframe></li>`;
            //     // console.log(div.getElementsByTagName('iframe'));
            //     // div.getElementsByTagName('iframe')[0].srcdoc = text;
            //     li.append(iframe);
            //     // div.append(li);
            //     document.getElementById('tab-panel-list').append(li);
            // });
            const div = document.createElement("div");
            div.innerHTML = `<li class="tab-panel" id="${id}"><iframe src="${url}"></iframe></li>`;
            document.getElementById('tab-panel-list').append(div.childNodes[0]);
        }

        document.getElementById('tab-list').addEventListener('click', event => {
            const className = event.target.className
            const id = event.target.parentNode.id;
            if (className == 'tab-title') switchTo(id);
            if (className == 'close-btn') closeTab(id);
        });

window.onload = onload();

async function checkUpdate() {
    const currentVersion = await fetch('dms://localhost/app/getVersion').then(response => response.text());
    let interval = setInterval(async () => {
        const url = 'https://github.com/idmstyle/dmstyle-for-factory/releases/download/latest/updates.json';
        let latest;
        try {
            latest = await fetch(url).then(response => response.json());
            clearInterval(interval);
        } catch (error) {
            return ;
        }

        if (latest.Version > currentVersion) {
            latest.CurrentVersion = currentVersion;
            const options = {
                body: JSON.stringify(latest),
                method: 'POST'
            };
            fetch('dms://localhost/app/upgrade', options);
        }
    }, 5* 60 * 1000);
}

// 1分钟后开启更新检测
setTimeout(checkUpdate, 1 * 60 * 1000);