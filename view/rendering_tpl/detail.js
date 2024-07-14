(async function(window) {
'use strict';

const vm = new Vue({
    delimiters: ['<{', '}>'],
	el: '#app',
	data: {
        files: [],
        resource: {},
        resourceId: null,
        images: [],
        uploadData: {},
        uploadHeaders: {},
        tag: "圆形",
        uploadURL: "",
        imageDetailVisible: false,
        currentImage: {},
        currentImageIndex: null,
        watermarks: [],
        waterSelectorDialogVisible: false,
        currentPrint: {},
        currentPrintIndex: null
    },
    mounted: async function () {
        const resourceId = getURLSearchParams('id');
        this.resourceId = resourceId;

        this.uploadURL = core.axios.defaults.baseURL + "/api/rendering_tpl_images";
        this.uploadData = {
            tplId: this.resourceId
        };
        this.uploadHeaders = {
            Authorization: core.axios.defaults.headers.common["Authorization"]
        };

        const response = await core.axios.get(`api/rendering_tpls/${resourceId}`, {id: resourceId});
        this.resource = response.data;
        
        // 在页面标题中显示更多信息，便于切换用户快速定位相应的标签页
        window.parent.document.title = `${this.resource.code} ${this.resource.name} - 效果图模板详情`;

        this.loadImages();
    },
    watch: {
        printDeletePopoverVisible: function (val) {
            console.log('val:', val);
        }
    },
	methods: {
        handleUpdateResource: async function () {
            const resource = this.resource;
            const response = await core.axios.put(`api/rendering_tpls/${resource.id}`, resource);
            if (response.status == 200) {
                this.resource = Object.assign(resource, response.data);
                this.$message({type: 'success', message: '更新成功'});
            } else {
                this.$message.error('更新出错，请稍后重试');
            }
        },
        loadImages: async function() {
            const resourceId = this.resourceId;
            const tag = this.tag;
            const config = {
                params: {
                    tplId: resourceId
                }
            };
            const response = await core.axios.get('api/rendering_tpl_images', config);
            const images = response.data;
            this.images = images;
        },
        handleImageSelect: async function (index, image) {
            if (image.prints == null) {
                image.prints = [{
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0,
                    rotate: 0
                }]
            } else {
                image.prints.push({
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0,
                    rotate: 0
                })
            }
            this.currentImage = image;
            this.currentImageIndex = index;
        },
        handleSetAsAlbumCover: async function () {
            let albumId = this.albumId;
            let url = this.currentImage.url;
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
        handleImageUpdate: async function (index) {
            if (index == this.currentImage.prints.length - 1) {
                this.currentImage.prints.push({
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0,
                    rotate: 0
                })
            }
            const image = JSON.parse(JSON.stringify(this.currentImage));
            image.prints.pop();
            for(let print of image.prints) {
                for(let key of ['width', 'height', 'left', 'top', 'rotate']) {
                    print[key] = parseFloat(print[key])
                }
            }
            const response = await core.axios.put(`api/rendering_tpl_images/${image.id}`, image);
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
        },
        handlePrintClone(index, row) {
            let newRow = JSON.parse(JSON.stringify(row));
            this.currentImage.prints.splice(index, 0, newRow);
            this.handleImageUpdate();
        },
        handlePrintDelete(index, row) {
            this.currentImage.prints.splice(index, 1);
            this.handleImageUpdate();
        },
        hideDeletePopover: function (index) {
            this.printDeletePopoverVisible = false;
        },
        handleWaterSelectorDialogOpened: async function () {
            const response = await core.axios.get('api/rendering_watermarks');
            this.watermarks = response.data;
        },
        handleWaterSelected: function(index, image) {
            this.currentPrint.watermark_id = image.id;
            this.currentPrint.watermark = image.url;
            this.waterSelectorDialogVisible = false;
            this.handleImageUpdate();
        },
        handleShowWaterSelector(index, row){
            this.waterSelectorDialogVisible = true;
            this.currentPrintIndex = index;
            this.currentPrint = row;
        },
	}
});

})(window);