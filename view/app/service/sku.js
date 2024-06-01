class SkuService {
    db;

    constructor() {
        this.dbName = 'skus';
        this.db = new PouchDB(this.dbName);
    }

    async find(options = {}) {
        options.limit = 1;
        const result = await this.findAll(options);
        
        return result.length == 1 ? result[0] : null;
    }

    async findById(id) {
        return await this.db.get(id);
    }

    async findAll(options) {
        const _this = this;

        // 如果没有检索条件，则获取所有数据
        const selector = options.selector || { _id: {$exists: true} };

        // 默认使用 _id 进行排序，pouchdb的语法要求排序的字段必须包含在selector中
        if( !selector._id ) selector._id = {$exists: true};

        // 缺省限制每次最多获取100条数据。
        // 如果前端使用瀑布流/无限加载的方式来展现数据，limit需要大于一屏的数量
        const limit = options.limit || 100000;
        // 注意：sort中的字段必须在selector中包含
        const sort = limit > 1 ? options.sort || [{_id: 'asc'}] : null;
        
        // 用于分页
        const skip = options.skip || 0;

        const index = { fields: ['_id'] };
        const result = await this.db.createIndex({ index: index }).then(async function () {
            return _this.db.find({
                selector: selector,
                sort: sort,
                limit: limit,
                skip: skip
            });
        });

        return result.docs;
    }

    async create(doc, options = {}) {
        // 执行create动作时，对象中不能包含_rev属性
        doc._rev = undefined;

        return await this.db.post(doc, options);
    }

    async bulkCreate(docs, options = {}) {

    }

    async update(doc, options = {}) {
        return await this.db.put(doc, options);
    }

    async bulkUpdate(docs, options = {}) {

    }

    
    async upsert(doc, options = {}) {
        // @TODO: 客户端必须提供一个接收相册id、相册本地目录对照关系的接口
        // 客户端不存储对照关系，就无法处理storage信息

        if (doc._id) return this.update(doc, options);

        return this.create(doc, options);
    }

    /**
     * 旧版SKU，例如：12012603，不支持自动解析
     */
    static get SKU_TYPE_OLD() {
        return 0;
    }

    /**
     * 8位纯数字型 SKU，例如：20300601
     */
    static get SKU_TYPE_NUMBER() {
        return 1;
    }

    /**
     * 扩展型SKU，例如：200-S1-1
     */
    static get SKU_TYPE_EXTEND() {
        return 2;
    }

    /**
     * 返回从skuCode中解析出的信息相册、模板和图片代码等信息
     * 
     * @description 类似于path.parse 或者 php中pathinfo
     * @param {String} skuCode 
     * @returns {Object}
     */
    static parse(skuCode) {
        // skuCode 不区分大小写
        skuCode = skuCode.toUpperCase();

        let type = this.typeof(skuCode);
        let info = {type: type, albumcode: '', tplcode: '', imagecode: ''};

        switch(type) {
            case this.SKU_TYPE_NUMBER:
                info['albumcode'] = skuCode.slice(0, 3);
                info['tplcode'] = skuCode.slice(3, 6);
                info['imagecode'] = skuCode.slice(6, 8);
                break;
            case this.SKU_TYPE_EXTEND:
                [ info['albumcode'], info['tplcode'], info['imagecode'] ] = skuCode.split('-');
                break;
        }

        return info;
    }

    /**
     * 函数返回一个字符串，表示skuCode的类型
     * 
     * @param {String} skuCode sku_code || sku_id
     * @returns {number}
     */
    static typeof(skuCode) {
        // 混合型 SKU，例：200-S1-1
        if ( /(\w)+-(\w)+-(\w)+/.test(skuCode) ) return this.SKU_TYPE_EXTEND;
        // 8位纯数字型 SKU，例：20300601
        if ( /[2345789]{1}[\d]{7}/.test(skuCode) ) return this.SKU_TYPE_NUMBER;
        // 旧版 SKU，例：12012603
        if ( /[16]{1}[\d]{7}/.test(skuCode) ) return this.SKU_TYPE_OLD;

        // 不符合规范的 skuCode
        return -1;
    }
}

if(!!module) module.exports = SkuService;