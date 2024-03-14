(async function(window) {
'use strict';
const shapeService = new ShapeService();
const skuShapeService = new SkuShapeService();
const skuService = new SkuService();
// const shapes = await skuShapeService.findAll({});
// const skus = new Map();
// for(let shape of shapes) {
//     let sku = skus.get(shape.sku_id);
//     if(sku == undefined) {
//         shape.index = 0;
//         sku = {
//             _id: shape.sku_id,
//             shapes: [shape]
//         };
//     } else {
//         shape.index = sku.shapes.length;
//         sku.shapes.push(shape);
//     }

//     skus.set(sku._id, sku);
// }
// for(const [key, sku] of skus) {
//     await skuService.upsert(sku);
//     console.log('sku create:', key, ';sku_id:', sku._id);
// }

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
        sku: {name: '演示信息，无需编辑', image_url: ''},
        skuInfo: {name: '演示信息，无需编辑', image_url: ''},
        child: '12012601', // 弃用

        imageSelectorDialogVisible: false,
        shapes: [],
        theme: {code: '', images: []},
        albumCode: '',
        albumImages: [],

        // 当前操作的 shape 行，在操作选择图片时要用到
        curShape: {},
        curShapeIndex: null,
        // 删除按钮的Popover弹出框
        deletePopoverVisible: {},
    },
    watch: {
        inputCode: async function (keyword) {
            let family = genSkuFamily(this.inputType, keyword);
            if (!family) return false;
            [this.sku, this.parent] = family;
            this.handleSearch();
        },
        skuId: function (skuId) {
            this.theme.code = skuId.slice(0, 3);
            this.albumCode = skuId.slice(0, 3);
        }
    },
    mounted: async function () {
        const vm = this;

        const params = new URLSearchParams(window.location.search);
        vm.skuCode = vm.skuId = vm.id = params.get('id') || '';
        console.log(this.skuCode.length);

        const shapes = await shapeService.findAll({});
        const preshapes = {};
        for(let shape of shapes) preshapes[shape.id] = shape;
        this.preshapes = preshapes;

        if (window.skuCode.length > 0) {
            // axios.get(`/api/skus/${window.skuId}?include_shapes=true`).then(function (response) {
            //     vm.skuInfo = response.data;
            //     vm.shapes = vm.skuInfo.shapes;
            //     if (!Array.isArray(vm.shapes)) vm.shapes = [];
            //     vm.shapes.push(vm.getEmptyShape());
            // });
        }
    },
    methods: {
        getEmptyShape: function () {
            const vm = this;
            return {id: null, sku_id: vm.skuId, shape_tpl_id: null, width: 0, height: 0, image_url: '', removable: false}
        },
        handleSearch: async function() {
            const vm = this;

            // 更新浏览器地址栏
            let href = window.location.href;
            let index = href.indexOf('code');
            if (index === -1) {
                href = href + (href.endsWith('/') ? 'code/' : '/code/') + this.skuId;
            } else {
                href = href.slice(0, index + "code".length) + '/' + this.skuId;
            }
            window.history.replaceState(null, null, href);

            // include_shapes=true 告知服务端返回对应的shapes数据
            // let response = await axios.get(`/api/skus/${vm.skuId}?include_shapes=true`);
            // this.skuInfo = response.data;

            // if (this.skuInfo.type === -1) {
            //     this.$message({type:'error', message: '不支持的sku_id，请检查您的输入'});
            //     this.shapes = [];
            //     return ;
            // }

            // const selector = {sku_id: this.skuCode};
            // const shapes = await skuShapeService.findAll({selector: selector});
            const sku = await skuService.findById(this.skuId);

            // this.shapes = this.skuInfo.shapes;
            this.shapes = sku.shapes;
            this.shapes.push(this.getEmptyShape());
        },

        // 修改了shape属性
        handleShapeChange: async function(index, shape) {
            console.log(this.preshapes);
            const selected = JSON.parse( JSON.stringify( this.preshapes[shape.shape_tpl_id] ) );
            
            // 这两个字段必须删除
            delete selected._id;
            delete selected._rev;

            shape = Object.assign({}, shape, selected, {shape_tpl_id: selected.id, id: shape.id});

            this.shapes.splice(index, 1, shape);
            this.$emit('shapeUpdateEvent', index, shape);

            // 如果操作的是列表中最后一项，需要创建一个新的空白模板
            if (index === this.shapes.length - 1) this.$emit('createEmptyShapeEvent');
        },

        handleShowImageSelector: async function (index, row) {
            const vm = this;
            vm.imageSelectorDialogVisible = true;
            vm.curShapeIndex = index;
            vm.curShape = row;
        },

        handleSaveSkuInfo: async function() {
            this.$message('功能开发中');
            // const data = {id: this.skuId, name: this.skuInfo.name, image_url: this.skuInfo.image_url};
            // const response = await axios.post('/api/product/sku/store', data);
            // if (response.status >= 200 && response.status < 300) this.$message({type: 'success', message: '操作成功'});
        },
        updateSkuItems: async function (item = null) {
            const vm = this;

            // for(let skuItem of vm.skuItems) {
            // 	const item = skuItem.valueOf();

            // 	try {
            // 		const result = await window.dbCompositionSkus.put(item);
            // 		// CouchDB 有版本的概念，更新之后一定要获取新的版本号，否则后续修改的还是前面一个版本
            // 		if (result.ok) skuItem.__rev = result.rev;
            // 	} catch (err) {
            // 		console.log(err);
            // 	}
            // }

            // vm.$message({message: '已更新',	'type': 'success', 'duration': 800});
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
            
            if (!shape._id || shape._id === null) return this.shapes.splice(index, 1, this.getEmptyShape());

            const response = await axios.delete(`/api/composition/sku_shapes/${shape._id}`);
            if (response.status !== 200) return this.$message.error('重置出错，请稍后重试');

            // 从列表中删除
            this.shapes.splice(index, 1);

            // 重置的是列表中最后一项，需要创建一个新的空白shape
            if (index === this.shapes.length - 1) this.$emit('createEmptyShapeEvent');
        },
        showDeletePopover: function (index) {
            this.deletePopoverVisible[index] = false;
        },
        hideDeletePopover: function (index) {
            this.deletePopoverVisible[index] = false;
        },
        handleSearchOld: async function () {
            let vm = this, child = vm.child;
            let skuItem = await skuTable.get({"_id": child});
            if (skuItem == undefined) {
                let sku = child.slice(0, 6);
                skuItem = await skuTable.get({"parent": sku});
                // 继承来的属性，需要做一些处理
                if (undefined !== skuItem) {
                    const subCode = child.slice(-2);
                    for (let shape of skuItem.shapes) {
                        shape.image = renderShapeImagePath(shape.image, subCode);
                        // 后期可以删除的代码
                        if (!shape.image.startsWith("/images")) shape.image = '/images' + shape.image;
                    }
                }
            }

            // 不存在的item，直接新建一个
            if (!skuItem) skuItem = {_id: vm.child, parent: vm.sku, isMulti: 0, shapes: [], isInheritable: 1}

            if ( !skuItem.hasOwnProperty('isInheritable') ) skuItem.isInheritable = 1;
            // 额外多显示一个shape，编辑后作为新的保存，如果不编辑（shapeId==null），则在item保存时删除
            skuItem['shapes'].push({shapeId: null, index: skuItem.shapes.length, width:0, height:0});

            vm.skuItem = skuItem;
        },
        handleIsMulti: async function(item) {
            const vm = this;

            // 继承来的属性不可修改
            if ( item.isInherited ) return false;

            // 如是新建的item，并且没有设置 shapes 属性，则无需把 isMulti 状态的变更写入数据库
            if ( item.shapes.length <= 1 ) return true;

            const items = item.isChild || !item.isInheritable ? [item] : vm.skuItems;
            for(const skuItem of items) skuItem.isMulti = item.isMulti;

            vm.updateSkuItems();
        },

        updateSkuItem: async function(skuItem) {
            const vm = this;
            const tmpSku = JSON.parse(JSON.stringify(skuItem));
            tmpSku.modifyTime = Date.now();
            tmpSku.shapes = tmpSku.shapes.filter( shape => shape !== null && shape.shapeId !== null );

            for (let index=0, length=tmpSku.shapes.length; index < length; index++ ){
                let shape = tmpSku.shapes[index];
                delete shape.id;
                delete shape._id;
                shape.index = index;
                shape.image = getSourceImagePath(tmpSku._id, shape.index, tmpSku.isMulti == 1);
            }

            try {
                // 操作成功时，返回的是被更新的记录的主键，对于当前表，返回的是_id
                const result = await skuTable.put(tmpSku);

                axios.put('/api/composition/skus/' + tmpSku._id, tmpSku).then(response => {
                    if ( response.status != 200) console.error('远程同步出错:', response);
                }).catch(error => {
                    console.error('远程同步出错:', error);
                });

                tmpSku.shapes.push({shapeId: null, index: skuItem.shapes.length, width:0, height:0});

                return [null, tmpSku];
            } catch (error) {
                console.log('error: ', error);
                return [error, null];
            }

        },
        /**
         * 复制shape
         *
         * @param {Number} index
         * @param {Object} row
         */
        handleShapeClone: function (index, row) {
            let shape = JSON.parse(JSON.stringify(row));

            // 如果被clone的shape是通过规则计算出来的，数据库中并没有存储，
            // 克隆后，新的shape会存储到数据库中，下次查询时，因为已经查询到一条记录，
            // 就不会再自动生成，这时候相当于漏掉了一条记录，所以这里要多做一个保存的动作
            if ( !shape.hasOwnProperty('_id') ) {
                this.$emit('shapeUpdateEvent', index, shape);
            }

            delete shape._id;
            delete shape._rev;
            this.shapes.splice(index + 1, 0, shape);
            this.$emit('shapeUpdateEvent', index+1, shape);
        },
        /**
         * 图片选择窗口打开事件
         */
        handleSelectorDialogOpened: function() {
            // 只有在图片列表为空时，才自动拉取图片列表
            if ( !this.theme.images || this.theme.images.length === 0 ) this.handleThemeSearch();
        },
        /**
         * 获取主题相关数据
         *
         * @returns
         */
        handleThemeSearch: async function () {
            // if (!this.theme.code || this.theme.code.length === 0) return false;

            const response = await axios.get(`/api/composition/album_images?albumCode=${this.skuInfo.albumcode}`);
            this.theme.images = response.data;
            this.albumImages = response.data;
        },
        /**
         * 选择图片
         *
         * @params {Number} index
         * @params {Object} image
         * @returns
         */
        handleImageSelect: function (index, image) {
            this.curShape.image_url = this.addTimestampToUrl(image.url);
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

    const response = isNew
        ? await axios.post('/api/composition/sku_shapes', shape)
        : await axios.put(`/api/composition/sku_shapes/${shape._id}`, shape);

    if (response.status !== 200 && response.status !== 201) return this.$message.error(response.data);

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
    const last = this.shapes.at(-1);

    // 列表中最后一项是空白模板，就不用创建新的了
    if (last.shape_tpl_id === null) return false;

    // this.shapes.push(this.getEmptyShape());
    const shape = {id: null, sku_id: this.skuId, shape_tpl_id: null, width: 0, height: 0, image_url: ''};
    this.shapes.push(shape);
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

})(window);