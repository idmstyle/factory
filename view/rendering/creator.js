const vm = new Vue({
    delimiters: ['<{', '}>'],
	el: '#app',
    mixins: [sourceMixin, dialogMixin, templateMixin, previewMixin],
	data: {
        env: "production",
        sourceImageClones: [],
        sourceCount: 0,
        tplCount: 0,
        tplMaps: {},
        checked: false,
        tpl: [],
        // ------------------------------------------------------
		db: null,
		shapeCollectionName: "1688_composition_shapes",
        paths: {psRootPath: 'D:\\ps'},
        sourcePath: "",
        tplPath: "/assets/product-templates",
        outputPath: "",
        dialogVisible: false,
        dialogImageUrl: '',
        disabled: false,
        fileList: [],
        tpls: [],
        sources: [], 
        // 各司其职：开始 -------------------------------------------------
        sourceImages: [], // 源文件
        sourceImageUrls: [], // 源文件大图浏览列表
        
        selectedTplSuits: [],
        canvas: null, // 通用画布
        ctx: null, // 通用画笔
        previewImages: [], // 预览图片
        previewImageUrls: [], // 预览图片大图列表
        previewImageCount: 0,
        previewBlobs: [],
        previewLoading: false, // 图片预览区域加载等待动画
        sourceLoading: false, // 源文件区域加载等待动画
        // 各司其职：结束 -------------------------------------------------
        options: {
            themeCode: '',
            composeModel: 0,
            imageSize: '8x',
            templateBaseURL: "/assets/product-templates/",
            dataBaseURL: "/api/product/sku-template/list",
            isAddWatermark: true
        },

        tplCategories: [], // TPL_GROUP_CATEGORIES
        selectedTplCategory: null,
        previews: [],
        suits : [],
        // categoryName: "",
        categories: {},
        // 按照相册选择图片 -----------------------------------------
        selectorDialogVisible: false,
        selectorThemeCode: '',
        selectorImages: [],
        selectedImages: [],
        selectedImageCache: [],
        // -------------------------------------------------------
        albumId: '',
        watermarks: [],
        tplTags: [
            '项链', '戒指', '耳饰', '钥匙链', '胸针', '夹片手链', '合金手镯', '牛皮手链', '绒绳手链', '弹力绳手链', '金刚结手链', '绑绳手链', '袖扣',
        ]
	},
	mounted: async function() {
        const response = await core.axios.get('api/rendering_watermarks');
        this.watermarks = response.data;
    },
	methods: {
        handleSourceChange: function() {
            this.sourceLoading = true;
            const files = this.$refs.sourceFileSelector.files;
            this.sourceCount = files.length;
            
            // files的类型为Filelist(object)，所以不能用数组的函数forEach
            for(const file of files) {
                file.code = file.name.slice(0, -4);
                file.url = window.URL.createObjectURL(file);
                this.sourceImages.push(file);
                this.sources.push(file);
                this.sourceImageUrls.push(file.url);
            }
            return true;
        },
        handleSelectFromAlbum: function () {

        },
        handleSuitCodeChange: function(value) {
            return this.updatePreviewImages(false);
        },
        handleThemeCodeChange: function(value) {
            return this.updatePreviewImages(false);
        },
        handleComposeModelChange: function(value) {
            return this.updatePreviewImages(false);
        },
        handleCreateImage: function(tpl, source) {
            if ( !source.imageDom || !tpl.imageDom || !tpl.markDom ) return '';
            if (null === this.canvas) this.canvas = document.getElementById('canvas');
            if (null === this.ctx) this.ctx = this.canvas.getContext('2d');

            const canvas = this.canvas, ctx = this.ctx;

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(tpl.imageDom, 0, 0);
            ctx.drawImage(source.imageDom, tpl.x, tpl.y, tpl.sourceWidth, tpl.sourceHeight);
            ctx.drawImage(tpl.markDom, tpl.x, tpl.y, tpl.sourceWidth, tpl.sourceHeight);

            return canvas.toDataURL();
        },
        
	}
});



function createImage() {

}

/**
 * 利用 canvas 合并图像
 * 
 * @param {Array} images [{id, left, top, width, height, rotate}]
 * @returns 
 */
function combineImagesByCanvas(images) {
    if ( !window.ctx ) {
        window.canvas = document.getElementById('canvas');
        window.ctx = this.canvas.getContext('2d');
    }

    const canvas = window.canvas, ctx = window.ctx;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for(let image of images) {
        const dom = document.getElementById(image.id);
        
        if (image.rotate == 0) {
            ctx.drawImage(dom, image.left, image.top, image.width, image.height);
        } else {
            ctx.translate(image.left, image.top); // 549, 674
            ctx.rotate(image.rotate * Math.PI / 180);

            ctx.drawImage(dom, 0, 0, image.width, image.height);

            // 恢复设置（恢复的步骤要跟你修改的步骤向反）
            ctx.rotate(-1 * image.rotate * Math.PI / 180);
            ctx.translate(-1 * image.left, -1 * image.top);
        }
    }

    return canvas.toDataURL("image/jpeg", 1.0);
}

// const ImageCreator = {
//     initialOptions: {themeCode: '201', composeType: 0, baseURL: 'generator/image/tpl'},
//     create: function(suits, sources, options) {
//         options = Object.assign({}, this.initialOptions, options);
        
//     },
// };

// /**
//  * 创建图片文件名
//  * 
//  * 文件名示例：22300101-模特图
//  * 文件名格式：主题编号（223） + 模版套件编号（001） + 产品在当前 SKU 组中的序号（01）
//  * 
//  * @param {string} suitCode 
//  * @param {string} templateName 
//  * @param {int} index 
//  * @returns 
//  */
// ImageCreator.prototype.filename = function (suitCode, templateName, index = 0) {
//     index = String(index).padStart(2, '0');

//     let name = suitCode + index;
//     if (templateName.length > 0) name += "-" + templateName;

//     return name;
// };

// ImageCreator.create(1, 1, {});

/**
 * 创建图片文件名
 * 
 * 文件名示例：22300101-模特图
 * 文件名格式：主题编号（223） + 模版套件编号（001） + 产品在当前 SKU 组中的序号（01）
 * 
 * @param {*} tplCode 
 * @param {*} tplName 
 * @param {*} index 
 * @returns 
 */
 function createImageTitle(tplCode, tplName, index = 0) {
    index = String(index).padStart(2, '0');

    let title = tplCode + index;
    if (tplName.length > 0 && tplName != '主图') title += "-" + tplName;

    return title;
};

/**
 * 创建 image 文件名对应的缓存文件名
 * 
 * 这个字段主要用于生成图片的 URL 中，移除 themeCode 可以避免在 themeCode 发生改变时，前端重复请求图片数据的问题
 * 
 * @param {*} imageFilename 
 * @returns 
 */
function createImageCacheFilename(imageFilename) {
    return imageFilename.slice(2);
}

/**
 * 创建图片的预览 URL
 * 
 * 示例："generator/image/preview/001/01-a.png,01-b,png?filename=00101-模特图"
 * 
 * @param {String} templateCode 模版编号，注意不是 suitCode
 * @param {Array} sources 生成当前图片需要包含的所有源图
 * @param {String} filename 
 * @returns 
 */
function createImagePreviewURL(templateCode, sources, filename) {
    // const cacheFilename = createImageCacheFilename(filename);
    // ?cachename=" + cacheImageFilename
    if (!sources) sources = ["01.png"];
    return `generator/image/preview/${templateCode}/` + sources.join(",");
}


/**
 * 按照图片默认尺寸导出，当前为1000px*1000px
 * 
 * @param {DOM} image 
 * @param {String} filename 
 * @param {String} size 
 */
function exportToDefaultSize(image, filename, size) {
    saveAs(image.src, filename);
}

/**
 * 按照特定尺寸导出图片
 * 
 * 当前依赖预置的 canvas dom 元素，可用的 size 取决于是否已经创建了对应的 canvas
 * 
 * @param {DOM} image 
 * @param {String} filename 
 * @param {String} size 
 */
function exportToNewSize(image, filename, size) {
    const canvasId = 'canvas-' + size;
    if ( !window.canvases ) window.canvases = {};
    const canvases = window.canvases;
    if ( !canvases.hasOwnProperty(canvasId) ) {
        canvases[canvasId] = { canvas: document.getElementById(canvasId)};
        canvases[canvasId].ctx = canvases[canvasId].canvas.getContext("2d");
    }
    
    const canvas = canvases[canvasId].canvas;
    const ctx = canvases[canvasId].ctx;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    saveAs(canvas.toDataURL("image/jpeg", 1.0), filename);
}

/**
 * 获取需要导出的图片列表
 * 
 * @returns 包含图片信息的数组
 */
function imagesToExport() {
    return document.querySelectorAll(".preview-image-item.active .preview-image img");
}

function albumImageSelectedListener(images) {
    vm.diaSourceImages = vm.selectedImages = images;
}