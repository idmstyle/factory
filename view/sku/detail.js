(async function(window) {
'use strict';
const vm = new Vue({
    el: '#app',
    delimiters: ['<{', '}>'],
    data: {
        inputCode: '120126',
        inputType: 'I',
        skuItems: [],
        skuId: '',
        parentId: '200001',
        preshapes: {}, // 用于 UI 遍历
        shapeMap: new Map(), // 用于数据处理时 shape 预设信息的查询

        sourcePath: '',
        imagePath: '',
        imageBasePath: '',
        skuType: 'I',
        skuItem: {},
        skuInfo: {name: '演示信息，无需编辑', image_url: ''},
        child: '12012601', // 弃用

        imageSelectorDialogVisible: false,
        theme: {code: '', images: []},
        albumCode: '',
        albumId: '',
        albumImageIndexURL: '',
        albumImages: [],

        // 当前操作的 shape 行，在操作选择图片时要用到
        curShape: {},
        curShapeIndex: null,
        // 删除按钮的Popover弹出框
        deletePopoverVisible: {},
        category: undefined,

        sku: {id: null, code: '', image: '', shapes: []},
    },
    mounted: async function () {
        const vm = this;

        const params = new URLSearchParams(window.location.search);
        this.sku.id = vm.skuCode = vm.skuId = vm.id = params.get('id') || '';
        this.sku.code = params.get('code') || '';

        const response = await core.axios.get('api/shapes');
        const shapes = response.data;
        const preshapes = {};
        for(let shape of shapes) preshapes[shape.id] = shape;
        this.preshapes = preshapes;

        if (!!this.sku.id || !!this.sku.code) this.handleSearch();
    },
    methods: {
        getEmptyShape: function () {
            const vm = this;
            return {shape_id: null, width: 0, height: 0, image_url: '', removable: false}
        },
        handleSearch: async function() {
            // 更新浏览器地址栏的查询参数，以实现刷新后恢复查询状态
            // let href = window.location.href;
            // let index = href.indexOf('code');
            // if (index === -1) {
            //     href = href + (href.endsWith('/') ? 'code/' : '/code/') + this.skuId;
            // } else {
            //     href = href.slice(0, index + "code".length) + '/' + this.skuId;
            // }
            // window.history.replaceState(null, null, href);

            const params =  {code: this.sku.code};
            const response = await core.axios.get('api/skus', {params: params});

            if (response.data.length > 0) {
                this.sku = response.data[0];
            } else {
                this.sku = {id: null, code: this.sku.code, image: '', shapes: []};
            }

            if (this.sku.shapes.length == 0 || this.sku.shapes.at(-1).shape_id != null )this.sku.shapes.push(this.getEmptyShape());
        },

        // 修改了shape属性
        handleShapeChange: async function(index, shape) {
            const sku = this.sku;
            const selected = JSON.parse( JSON.stringify( this.preshapes[shape.shape_id] ) );
            
            // 这两个字段必须删除
            delete selected.id;

            shape = Object.assign({}, shape, selected);
            sku.shapes.splice(index, 1, shape);

            const isNew = sku.id ? false : true;
            if (isNew) {
                this.createSku();
            } else {
                this.updateSku();
            }


            this.$emit('shapeUpdateEvent', index, shape);

            // 如果操作的是列表中最后一项，需要创建一个新的空白模板
            if (index === sku.shapes.length - 1) this.$emit('createEmptyShapeEvent');
        },
        createSku: async function () {
            const sku = JSON.parse(JSON.stringify(this.sku));
            if (sku.shapes.at(-1).shape_id == null) sku.shapes.pop();

            const response = await core.axios.post('api/skus', sku);
            const created = response.data;
            this.sku.id = created.id;
            this.sku.createdAt = created.createdAt;
        },
        updateSku: async function () {
            const sku = JSON.parse(JSON.stringify(this.sku));
            if (sku.shapes.at(-1).shape_id == null) sku.shapes.pop();

            const response = await core.axios.put(`api/skus/${sku.id}`, sku);
            const updated = response.data;
            this.sku.updatedAt = updated.updatedAt;
        },

        handleShowImageSelector: async function (index, row) {
            const vm = this;
            vm.imageSelectorDialogVisible = true;
            vm.curShapeIndex = index;
            vm.curShape = row;
        },

        /**
         * 重置某一个shape项，相当于删除功能
         *
         * @param {Number} index
         * @param {Object} shape
         * @returns
         */
        handleShapeReset: async function(index, shape) {
            this.hideDeletePopover(index);
            const sku = this.sku;
            
            if (!shape.shape_id || shape.shape_id === null) return sku.shapes.splice(index, 1, this.getEmptyShape());

            // 从列表中删除
            sku.shapes.splice(index, 1);
            this.updateSku();

            // 重置的是列表中最后一项，需要创建一个新的空白shape
            if (index === sku.shapes.length - 1) this.$emit('createEmptyShapeEvent');
        },
        showDeletePopover: function (index) {
            this.deletePopoverVisible[index] = false;
        },
        hideDeletePopover: function (index) {
            this.deletePopoverVisible[index] = false;
        },
        /**
         * 复制shape
         *
         * @param {Number} index
         * @param {Object} row
         */
        handleShapeClone: function (index, row) {
            let shape = JSON.parse(JSON.stringify(row));

            this.sku.shapes.splice(index + 1, 0, shape);
            this.updateSku();
        },
        /**
         * 图片选择窗口打开事件
         */
        handleSelectorDialogOpened: function() {
            // 只有在图片列表为空时，才自动拉取图片列表
            // if ( !this.theme.images || this.theme.images.length === 0 ) this.handleShowAlbumImages();
            if ( !this.theme.images || this.theme.images.length === 0 ) this.handleUpdateAlbumImageIndexURL();
        },
        /**
         * 获取主题相关数据
         *
         * @returns
         */
        handleThemeSearch: async function () {
            // if (!this.theme.code || this.theme.code.length === 0) return false;

            const dir = encodeURIComponent(this.album.path);
            const response = await axios.get(`/storage/files/${dir}`);
            this.theme.images = response.data;
            this.albumImages = response.data;
        },
        handleUpdateAlbumImageIndexURL: async function () {
            this.albumImageIndexURL = `album-image/index.html?albumId=${this.albumId}`;
        },
        handleShowAlbumImages: async function () {
            const parsed = SkuService.parse(this.skuId);
            const albumId = this.albumId = this.albumCode = parsed.albumcode;

            // const response = await axios.get('album-image/get', {albumId: albumId});
            // const album = await AlbumService.findById(albumId);
            // const dir = album.dir || album.path;

            // const selector = {
            //     albumId: albumId,
            //     albumPath: album.path,
            //     category: this.category
            // };
            // const images = await AlbumImageService.findAll({selector: selector});
            // this.albumImages = images;

            // const response = await axios.get(`/storage/files/${encodeURIComponent(dir)}`);
            // const images = response.data;

            // for(let image of images) {
            //     if (!image.url.startsWith('http')) image.url = axios.defaults.baseURL + image.url;
            // }

            // this.albumImages = images;
        },
        /**
         * 选择图片
         *
         * @params {Number} index
         * @params {Object} image
         * @returns
         */
        handleImageSelect: function (image) {
            // this.curShape.image_url = this.addTimestampToUrl(image.url);
            this.curShape.image_url = image.url;
            this.curShape.image_path = image.path;
            this.imageSelectorDialogVisible = false;

            // 如果是没有shape.id属性，极有可能也没有设置shape信息，这时候不需要把数据写入后台
            this.$emit('shapeUpdateEvent', this.curShapeIndex, this.curShape);
        },
        /**
         * 为链接添加时间戳
         * 
         * @param {string} url 
         * @returns {string}
         */
        addTimestampToUrl(url) {
            return url;
            // 只是用来辅助创建URL对象，不会出现在返回值中
            let base = 'https://www.hostnamejustforurlfunc.com';
            url = new URL(url, base);
            
            let searchParams = new URLSearchParams(url.search);
            searchParams.set('v', Date.now());

            let origin = base.length === 0 ? url.origin : '';
            return `${origin}${url.pathname}?${searchParams}`;
        },
        /**
         * 图片属性变化事件
         *
         * @param {Number} index
         * @param {Object} row
         */
        imageUrlChangeHandle: function (index, row) {
            this.$emit('shapeUpdateEvent', index, row);
        }
    }
});

/**
 * shape 更新事件
 *
 * @param {Number} index
 * @param {Object} row
 */
vm.$on('shapeUpdateEvent', async function (index, shape) {
    // 只有同时编辑好了 shape 和 image 信息，才需要执行存储动作
    if (!shape.shape_tpl_id || !shape.image_url) return false;
    const isNew = shape._id ? false : true;

    // const response = isNew
    //     ? await axios.post('/api/composition/sku_shapes', shape)
    //     : await axios.put(`/api/composition/sku_shapes/${shape._id}`, shape);

    // if (response.status !== 200 && response.status !== 201) return this.$message.error(response.data);

    // const data = response.data;


    // const skuShapeService = new SkuShapeService();
    // const result = await skuShapeService.upsert(shape);
    // if (result.ok) {
    //     shape._id = result.id;
    //     shape._rev = result.rev;
    // }

    // this.shapes.splice(index, 1, shape);

    const api = isNew ? '/sku-shape/create' : '/sku-shape/update';
    const response = await axios.post(api, shape);
    const data = response.data;
    if (data.ok) {
        shape._id = data.id;
        shape._rev = data.rev;
    }

    this.shapes.splice(index, 1, shape);
});

async function updateRemoteShape(shape) {
    // 只有同时编辑好了 shape 和 image 信息，才需要执行存储动作
    if (!shape.shape_tpl_id || !shape.image_url) throw new Error('不完整的 shape 数据');

    let isNew = shape._id ? false : true;
    return isNew
        ? await axios.post('/api/composition/sku_shapes', shape)
        : await axios.put(`/api/composition/sku_shapes/${shape._id}`, shape);
}


vm.$on('createEmptyShapeEvent', function () {
    const last = this.sku.shapes.at(-1);

    // 列表中最后一项是空白模板，就不用创建新的了
    if (last.shape_id === null) return false;

    // this.shapes.push(this.getEmptyShape());
    const shape = {shape_id: null, width: 0, height: 0, image_url: ''};
    this.sku.shapes.push(shape);
});


async function themeSearchHandle() {}

/**
 * 分析传入的code，返回对应的 parent 和 skuId 组成的数组
 *
 * @param {String} type SKU的类型，目前支持的有 B（客户定制型）和 I（内部定义型）
 * @param {String} code SKU的数字部分，不包含类型符号
 * @returns {Array} [skuId, parent]
 */
function genSkuFamily(type, code) {
    code = String(code).toUpperCase();

    if( code.length == 6 ) return [code + '01', code];
    if( code.length == 8 ) return [code, code.slice(0, 6)];

    // switch(type) {
    // 	case "B":
    // 		code = code.toUpperCase().replace(type, "");
    // 		// [chid, sku]，使用数组，方便调用者同时赋值多个变量
    // 		// @TODO: 待升级，子类保持与内部定义型一直，靠 isInheritable 属性来区分继承类型
    // 		if (code.length == 8) return [type + code, type + code.slice(0, 4)];
    // 		break;
    // 	default:
    // 		if( code.length == 6 ) return [code + '01', code];
    // 		if( code.length == 8 ) return [code, code.slice(0, 6)];
    // }
    return false;
}

function isChildCode(code) {
    return code.length === 8;
}

function isSkuInherited(skuItem) {
    return skuItem.isInheritable && !skuItem._id.endsWith("01");
}

async function syncSkuList(startTime = null, limit = 50, page = 1) {
    const storage = window.storage;
    const storageKey = 'composition_sku_update_time';

    if (startTime == null) {
        const lastUpdateTime = storage.getItem(storageKey);
        // 请求的校验时间增加5分钟的重叠，避免出现边缘问题，注意这里计时使用的是毫秒
        startTime = lastUpdateTime ? parseInt(lastUpdateTime) - 1800000 : 0;
    }

    const config = {
        params: {startTime: startTime, page: page, limit: limit}
    };
    const response = await axios.get('/api/composition/skus', config);
    if ( response.status != 200 ) return false;

    let data = response.data;
    if (data.length <= 0) {
        storage.setItem(storageKey, Date.now());
        return true;
    }

    let db = window.database.get();
    // 返回lastKey，参考：https://dexie.org/docs/Table/Table.bulkPut()
    try {
        let result = await db.table(window.database.COMP_SKU_COLLECTION_NAME).bulkPut(data);
        // 如果最后一次读取的列表小于请求的数量，则认为已经不存在额外的数据需要同步了
        // 这个判断可以减少一次服务请求
        if (data.length < limit) return true;

        return await syncSkuList(startTime, limit, page + 1);
    } catch (error) {
        console.log("sku列表批量写入错误:", error);
        return error;
    }
}

/**
 * 根据给定的模版生成新的图片路径
 *
 * @param {string} tpl 路径模版，例：/12/1201/120126/01-a.png
 * @param {string} subCode 子sku的后2位数字，例：02
 * @return {string} 新的路径，例：/12/1201/120126/02-a.png
 */
function renderShapeImagePath(tpl, subCode) {
    // (.*)：贪婪模式，一直寻找直到最后
    // \d{2}：2个数字组成的组合
    return tpl.replace(/(.*)\d{2}/, '$1' + subCode);
}

/**
 * 获取sku对应生产图片的path
 * @param {string} skuId 要操作的sku
 * @param {number|string} index 图片在当前sku下所有图片中的编号，从0开始计数
 * @param {boolean} isMulti 当前sku是否包含多张图片
 */
function getSourceImagePath(skuId, index = 1, isMulti = false ) {
    const flags = {0:'-a', 1:'-b', 2:'-c', 3:'-d', 4:'-e', 5:'-f', 6:'-g', 7:'-h'};
    skuId = String(skuId).toUpperCase(); // sku可能为Number，这里做一个类型转化

    let base = String(skuId).startsWith('B')
                ? '/buyer/' + skuId.slice(1, 3) + '/' + skuId.slice(3, 5) + '/' + skuId.slice(5, 7) + '/' + skuId.slice(7)
                : '/images/' + skuId.slice(0, 2) + '/' + skuId.slice(0, 4) + '/' + skuId.slice(0, 6) + '/' + skuId.slice(6, 8);
    let flag = isMulti ? flags[index] : '';

    return base + flag + '.png';
}

/**
 * 更新浏览器地址栏限时的 URL，确保刷新页面后能保持当前编辑的 skuId 信息
 *
 * @param String skuId
 */
function updateBrowserAddressbar(skuId) {
    var href = window.location.href;
    var flag = '/detail';
    var index = href.lastIndexOf(flag);

    // 没有检索到插入标志，为避免影响客户操作，直接取消更新地址栏
    if (-1 === index) return false;

    // skuId 没有固定的规则，正则表达式无用武之地
    var end = index + flag.length + 1;

    var url = href.slice(0, end);
    url += url.endsWith('/') ? skuId :  '/' + skuId;


    window.history.replaceState(null, null, url);
}


window.albumImageSelectedListener = async function (images) {
    vm.handleImageSelect(images[0]);
    document.getElementById('album-image-frame').contentWindow.unselectAll();
}
})(window);