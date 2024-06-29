(async function(window) {
'use strict';

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
        sortType: 'asc',
        imageType: 0,
        theme: window.theme,
        album: {},
        albumId: null,
        category: null,
        files: [],
        history: [],
        child: '',

        images: [],
        uploadData: {},
        uploadHeaders: {},
        baseURL: core.axios.defaults.baseURL,
        zoom: {},
        tag: "圆形",
        uploadURL: "",
        imageDetailVisible: false,
        currentImage: {},
    },
    mounted: async function () {
        const albumId = getAlbumIdFromSearchParams();
        this.albumId = albumId;

        this.uploadURL = core.axios.defaults.baseURL + "/api/album_images/upload";
        this.uploadData = {
            albumId: this.albumId,
            tag: this.tag,
        };
        this.uploadHeaders = {
            Authorization: core.axios.defaults.headers.common["Authorization"]
        };

        const response = await core.axios.get(`api/albums/${albumId}`, {id: albumId});
        this.album = response.data;
        
        // 在页面标题中显示更多信息，便于切换用户快速定位相应的标签页
        document.title = `${this.album.code} ${this.album.name} - 我的相册`;

        this.loadAlbumImages();
    },
    watch: {
        tag: async function (newTag, oldTag) {
            this.uploadData = {
                albumId: this.albumId,
                tag: this.tag
            };

            this.loadAlbumImages();
        }
    },
	methods: {
        handleUpdateAlbum: async function () {
            const album = this.album;
            const response = await core.axios.put(`api/albums/${album.id}`, album);
            if (response.status == 200) {
                this.album = Object.assign(this.album, response.data);
                this.$message({type: 'success', message: '更新成功'});
            } else {
                this.$message.error('更新出错，请稍后重试');
            }
        },
        loadAlbumImages: async function() {
            const albumId = this.albumId;
            const tag = this.tag;
            const config = {
                params: {
                    albumId: albumId,
                    tag: tag
                }
            };
            const response = await core.axios.get('api/album_images', config);
            const images = response.data;
            this.images = images;
        },
        handleImageSelect: async function (index, image) {
            this.imageDetailVisible = true;
            this.currentImage = image;
        },
        handleSetAsAlbumCover: async function () {
            let albumId = this.albumId;
            let url = this.currentImage.url;
            let response = await core.axios.put(`api/albums/${albumId}`, {cover: url});
            console.log('response:', response);
        },
        handleUploadSuccess: function (response, file, fileList) {
            let isNew = true;
            for(let index in this.images) {
                const image = this.images[index];                
                if (image.id != response.id) continue;
                isNew = false;
                this.images.splice(index, 1, response);
                break;
            }

            if (isNew) this.images.push(response);
            // this.$message({type: 'success', message: '操作成功'});
        },
        handleShowOpenDialog: async function () {
            const options = {
                defaultPath: this.album.path
            };
            const response = await axios.post('dialog/selectDirectory', options);

            // 没有选择文件夹，不需要更新
            if (!response.data) return true;

            this.album.path = response.data;
            this.handleUpdateAlbum();
            this.handleRefresh();
        },
        handleHistoryBack: function () {
            getAlbumImageFrameContentWindow().history.back();
        },
        handleHistoryForward: function () {
            getAlbumImageFrameContentWindow().history.forward();
        },
        handleRefresh: async function () {
            getAlbumImageFrameContentWindow().history.reload();
        },
	}
});

function getAlbumImageFrameContentWindow() {
    return document.getElementById('album-image-frame').contentWindow
}

// function getAlbumPathMappings(filepath) {
//     try {
//         return require(filepath);
//     } catch (error) {
//         return {};
//     }
// }

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

})(window);