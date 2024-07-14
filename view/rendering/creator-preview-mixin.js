var previewMixin = {
    data: {

    },
    methods: {
        handlePreviewItemClick: function (preview, index) {
            preview.isActive = !preview.isActive;
            this.$set(this.previews, index, preview);
        },
        handlePreviewImageLoad: function(event) {
            if (++this.previewImageCount >= this.previewImages.length) this.previewLoading = false;
        },
        imageExportHandle: function() {
            const images = imagesToExport();
            const imageSize = this.options.imageSize;
            const exporter = imageSize == '10x' ? exportToDefaultSize : exportToNewSize;
            images.forEach( (image, index) => {
                const filename = image.dataset.title + ".jpg";
                // 为避免出现因高频下载导致的文件写入失败，这里的时间间隔一定不要省
                setTimeout(function() { exporter(image, filename, imageSize)}, 1500 * index);
            });

            return true;
        },
        updatePreviewImages: async function(loading = true) {
            const vm = this;
            // 页面加载完成时，会自动触发模版列表的selection，这时源文件为空，不需要生成预览图片
            if(this.selectedSources.length == 0 || this.selectedTpls.length == 0) return true;
            const options = {
                themeCode: vm.options.themeCode,
                albumCode: this.options.albumCode,
                composeType: vm.options.composeModel,
                baseURL: vm.tplPath,
                createModel: vm.options.composeModel, 
                imageSize: vm.options.imageSize
            };

            const images = await createImages(vm.selectedTpls, vm.sources, options);
            vm.previews = images;
        },
    }
}

/**
 * 利用 canvas 合并图像
 * 
 * @param {Array} imagesToDraw [{id, left, top, width, height, rotate}]
 * @returns 
 */
function composeImagesByCanvas(imagesToDraw) {
    if ( !window.ctx ) {
        window.canvas = document.getElementById('canvas');
        window.ctx = this.canvas.getContext('2d');
    }

    const canvas = window.canvas, ctx = window.ctx;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for(let image of imagesToDraw) {
        const dom = document.getElementById(image.targetId);
        if (image.rotate == '0') {
            ctx.drawImage(dom, parseFloat(image.left), parseFloat(image.top), parseFloat(image.width), parseFloat(image.height));
        } else {
            ctx.translate(parseFloat(image.left), parseFloat(image.top)); // 549, 674
            ctx.rotate(parseFloat(image.rotate) * Math.PI / 180);

            ctx.drawImage(dom, 0, 0, parseFloat(image.width), parseFloat(image.height));

            // 恢复设置（恢复的步骤要跟你修改的步骤向反）
            ctx.rotate(-1 * parseFloat(image.rotate) * Math.PI / 180);
            ctx.translate(-1 * parseFloat(image.left), -1 * parseFloat(image.top));
        }
    }

    return canvas.toDataURL("image/jpeg", 1.0);
}


async function createImages(tpls, sources, customOptions) {
    let userOptions = {
        create_model: customOptions.composeType,
        theme_code: customOptions.themeCode,
        image_size: customOptions.imageSize,
    };

    const data = {"templates": tpls, "tpls": tpls, "sources": sources, "options": userOptions};
    let images = batchCreate(tpls, sources, userOptions);
    for(let image of images)
    {
        image.isActive = true;
        image.src = composeImagesByCanvas(image.sources);
    }

    return images;
}