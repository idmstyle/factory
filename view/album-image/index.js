(async function(window) {
    'use strict';
    // const path = require('path');
    // const fs = require('fs');
    
    /**
     * 从 URL 的查询字符串中获取相册 id
     * 
     * @returns string
     */
    function getAlbumIdFromSearchParams() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id') || '';
    }
    
    const vm = new Vue({
        delimiters: ['<{', '}>'],
        el: '#app',
        data: {
            options: {
                title: '款式合集',
                themeCode: '',
                quantityShow: false,
                unitName: '个',
                columns: 7,
                sortType: 'SORT_BY_GROUP',
                canvasWidth: 0,
                canvasHeight: 0,
                scale: 10,
            },
            designsWrapperWidth: 0,
            dragover: null,
            images: [],
            sortType: 'asc',
            imageType: 0,
            theme: window.theme,
            album: {},
            albumId: null,
            category: null,
            files: [],
            uploadData: {},
            baseURL: axios.defaults.baseURL,
            history: [],
            child: '',
            zoom: {}
        },
        mounted: async function () {
            const params = new URLSearchParams(window.location.search);
            const albumId = this.albumId = params.get('albumId');
            let zoom = params.get('zoom');
            if ( typeof zoom == 'string') {
                this.zoom = {zoom: zoom}
            }
            

            this.handleGetImages(albumId, '');
        },
        methods: {
            handleOpenChildFolder: async function (item) {
                this.handleGetImages(this.albumId, item.child);
            },
            handleGetImages: async function (albumId, child) {
                const response = await axios.post('/album-image/get', {albumId: albumId, child: child});
                const images = response.data;
                this.images = images;

                if ( !this.history.includes(child) ) this.history.push(child);
                this.child = child;
            },
            handleHistoryBack: async function () {
                const index = this.history.indexOf(this.child);
                // 当前已经是顶层文件夹了
                if (index == 0) return true;

                this.handleGetImages(this.albumId, this.history[index - 1]);
            },
            handleHistoryForward: async function () {
                const index = this.history.indexOf(this.child);
                // 没有更新的记录了
                if (index == this.history.length - 1) return true;

                this.handleGetImages(this.albumId, this.history[index + 1]);
            },
            handleHistoryReload: async function () {
                this.handleGetImages(this.albumId, this.child);
            },
            handleImageSelect: async function(index, image) {
                image.isActive = !image.isActive;
                this.$set(this.images, index, image);

                sendSelectedImagesToParent();
            },
            handleUnselectAll: async function () {
                for(let image of this.images) image.isActive = false;
            },
            handleUpdateAlbum: async function () {
                const album = this.album;
                const result = await AlbumService.upsert(album);
                
                if (result.ok) {
                    this.$message({type: 'success', message: '更新成功'})
                    localStorage.setItem('_dmstyle_album_path_' + album._id, album.path);
                } else {
                    this.$message.error('更新出错，请稍后重试');
                }
            },
            handleUploadSuccess: function (response, file, fileList) {
                let isNew = true;
                for(let index in this.images) {
                    const image = this.images[index];                
                    if (image.id != response.id) continue;
                    isNew = false;
                    // 避免由于浏览器cache导致的图片不刷新问题
                    // response.url += '?timestamp=' + Date.now();
                    this.images.splice(index, 1, response);
                    break;
                }
    
                if (isNew) this.images.push(response);
                // this.$message({type: 'success', message: '操作成功'});
            },
            handleRefresh: async function () {
                window.location.reload();
            },
            handleAlbumPathMappingChange: async function () {
                // console.log('changed');
                // const album = this.album;
                // const userDataPath = localStorage.getItem('_dmstyle_user_data_path');
                // const filepath = path.resolve(userDataPath, 'settings', 'album-path-mappings.json');
                // const mappings = getAlbumPathMappings(filepath);
                // mappings[album._id] = album.path;
    
                // writeAlbumPathMappingsToFile(mappings, filepath);
            },
            handleShowOpenDialog: async function () {
                const { ipcRenderer } = require('electron');
    
                ipcRenderer.once('show-open-dialog-response', (_event, message) => {
                    if (!!message) vm.album.path = message;
                    vm.handleUpdateAlbum();
                });
                
                const message = {};
                if (!!this.album.path && !this.album.path.startsWith('/')) message.defaultPath = this.album.path;
                ipcRenderer.send('show-open-dialog', message);
            }
        }
    });

    function writeAlbumPathMappingsToFile(mappings, filepath) {
        const str = JSON.stringify(mappings);
    
        fs.open(filepath, "w", (err, fd)=>{ 
            if(err){ 
                console.log(err.message); 
            }else{ 
                fs.write(fd, str, (err, bytes)=>{ 
                    if(err){ 
                        console.log(err.message); 
                    }else{ 
                        console.log(bytes +' bytes written'); 
                    } 
                })         
            } 
        });
    
        return true;
    }
    
    function dragOverHandler(event) {
        event.preventDefault();
    }
    
    function dropHandler(event) {
        event.preventDefault();
    
        const items = event.dataTransfer.items;
        const files = validImageFileFilter(items);
    
        const images = [], itemLength = items.length;
        files.forEach(function (file) {
            const image = {name: file.fileName, baseName: file.baseName, fileName: file.fileName, quantity: 0};
    
            // 从文件名中自动读取前6个字符作为 themeCode
            if (!vm.options.themeCode) vm.options.themeCode = image.baseName.slice(0, 6);
    
            const reader = new FileReader();
            reader.onloadend = function(e){
                image.url = e.target.result;
                images.push(image);
                if (images.length === itemLength) vm.images = listAlignment(vm.images.concat(images), vm.options.columns);
                vm.refreshHandler();
            };
            reader.readAsDataURL(file.file);
        });
    }
    
    /**
     * 筛选有效的图片类型文件
     * 
     * @param {DataTransferItemList} items 
     * @returns Array 通过测试的文件数组
     */
    function validImageFileFilter(items) {
        const valid = [];
        for (var i = 0; i < items.length; i++) {
            const item = items[i];
            // 仅支持图片类型的文件
            if (item.kind !== 'file' || !item.type.match('^image/')) continue;
            
            const file = item.getAsFile();
            valid.push({
                file: file,
                baseName: file.name, // 包含扩展名
                fileName: file.name.replace(/\.([0-9a-z]+)(?:[\?#]|$)/i, ''), // 不含扩展名
            });
        }
    
        return valid;
    }
    
// async function getImages(path) {
//     const response = await axios.get(`/factory/storage/album/${path}`);
//     const data = response.data;
//     let html = data.replace("<pre>", "");
//     html = html.replace("</pre>", "");
//     let dom = document.createElement("div");
//     dom.innerHTML = html;
//     let links = dom.querySelectorAll('a');
//     let list = [];
//     links.forEach(link => {
//         let item = {
//             'name': link.innerText,
//         };
        
//         if (item.name.endsWith("/")) {
//             item.name = item.name.slice(0, -1);
//             item.type = 'folder';
//             item.url = `storage/browser.html?path=${path}/${item.name}`;
//         } else {
//             item.type = 'file';
//             item.url = `/factory/storage/album/${path}/${item.name}`;
//         }

//         list.push(item);
//     })
//     list = list.sort((first, second) => {
//         return second.type.localeCompare(first.type);
//     });
//     return list
// }

async function getImages(path) {
}

// async function sendSelectedImagesToParent() {
//     return new Promise((resolve, reject) => {
//         if(window.parent == window) return reject("没有父级窗口，无需发送消息");

//         const activeImages = [];
//         for(const image of vm.images) {
//             if (image.isActive) activeImages.push(image);
//         }

//         const message = {
//             'channel': 'album-image-selection-change',
//             'message': activeImages
//         }
//         window.parent.postMessage(message, window.location.origin);

//         resolve();
//     });
// }

async function sendSelectedImagesToParent() {
    return new Promise((resolve, reject) => {
        if(window.parent == window) return reject("没有父级窗口，无需处理");

        const activeImages = [];
        for(const image of vm.images) {
            if (image.isActive) activeImages.push(image);
        }

        window.parent.albumImageSelectedListener(activeImages);

        // const message = {
        //     'channel': 'album-image-selection-change',
        //     'message': activeImages
        // }
        // window.parent.postMessage(message, window.location.origin);

        resolve();
    });
}


window.history.back = function () {
    vm.handleHistoryBack();
}

window.history.forward = function () {
    vm.handleHistoryForward();
}

window.history.reload = function () {
    vm.handleHistoryReload();
}

window.unselectAll = function() {
    vm.handleUnselectAll();
}

})(window);