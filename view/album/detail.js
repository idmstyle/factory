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
        files: [],
        album: {},
        albumId: null,
        images: [],
        uploadData: {},
        uploadHeaders: {},
        baseURL: core.axios.defaults.baseURL,
        zoom: {},
        tag: "圆形",
        uploadURL: "",
        imageDetailVisible: false,
        currentImage: {},
        currentImageIndex: null
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
        window.parent.document.title = `${this.album.code} ${this.album.name} - 相册详情`;

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
            this.currentImageIndex = index;
        },
        handleSetAsAlbumCover: async function () {
            let albumId = this.albumId;
            let url = this.currentImage.url;

            // 这里需要更新一下cover，因为在编辑相册详情时会把旧的cover发送到服务器
            this.album.cover = url;

            let response = await core.axios.put(`api/albums/${albumId}`, {cover: url});
            if(response.status == 200) this.$message({type: 'success', message: '设置成功'});
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
        },
        handleImageUpdate: async function () {
            const image = this.currentImage;
            const response = await core.axios.put(`api/album_images/${image.id}`, image);
            this.$message({type: 'success', message: '操作成功'});
        },
        handleDeleteImage: async function () {
            this.$confirm('此操作将永久删除该文件, 是否继续?', '警告', {
                confirmButtonText: '确认删除',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(this.deleteImage).catch(() => {});
        },
        deleteImage: async function () {
            const image = this.currentImage;
            const response = await core.axios.delete(`api/album_images/${image.id}`);

            if (response.status == 200) {
                this.$message({ type: 'success', message: '删除成功!'});
                this.imageDetailVisible = false;
                this.images.splice(this.currentImageIndex, 1);
            } else {
                this.$message({ type: 'error', message: '操作失败，请刷新页面后重试'});
            }
        }
	}
});

})(window);