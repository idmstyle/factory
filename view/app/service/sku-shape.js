const SkuShapeService = (() => {
// 使用函数包裹的方法可以避免全局变量冲突
const url = require('url');
const path = require('path');

return class {
    db;

    constructor() {
        this.dbName = '_dmstyle_factory_sku_shapes';
        this.db = new PouchDB(this.dbName, {revs_limit: 10});
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
        const res = await this.db.allDocs({include_docs: true});
        const docs = [];
        for(let row of res.rows) docs.push(row.doc);
        return docs;


        // 如果没有检索条件，则获取所有数据
        const selector = options.selector || { sku_id: {$exists: true} };

        // 默认使用 sku_id 进行排序，pouchdb的语法要求排序的字段必须包含在selector中
        if( !selector.sku_id ) selector.sku_id = {$exists: true};

        // 缺省限制每次最多获取100条数据。
        // 如果前端使用瀑布流/无限加载的方式来展现数据，limit需要大于一屏的数量
        const limit = options.limit || 100000;
        // 注意：sort中的字段必须在selector中包含
        const sort = limit > 1 ? options.sort || [{sku_id: 'desc'}] : null;
        
        // 用于分页
        const skip = options.skip || 0;

        const fields = Object.keys(selector);
        const index = {fields: fields};
        const result = await this.db.createIndex({ index: index }).then(async function () {
            return _this.db.find({
                selector: selector,
                sort: sort,
                limit: limit,
                skip: skip
            });
        });

        // return result.docs;
        return await this.clean(result.docs);
    }

    async clean(docs) {
        const clean = [];

        for(let doc of docs) {
            if (doc.shape_tpl_id == null) continue;
            
            doc = this.convertNumberField(doc);

            const skuId = doc.sku_id;
            const parsed = SkuService.parse(skuId);

            if(parsed.type == SkuService.SKU_TYPE_OLD) {

            } else {
                const album = await AlbumService.findById(parsed.albumcode);
                if (doc.image_url.startsWith('/assets/images')) {
                    doc.image_url = url.pathToFileURL(path.resolve(album.path, parsed.imagecode + '.png')).href;
                }
            }

            clean.push(doc);
        }

        return clean;
    }

    async create(doc, options = {}) {
        // 执行create动作时，对象中不能包含_rev属性
        doc._rev = undefined;

        doc = this.convertNumberField(doc);

        return await this.db.post(doc, options);
    }

    convertNumberField(doc) {
        for(let field of ['width', 'height', 'col_span', 'row_span', 'max_cols', 'max_rows']) {
            if (field in doc) doc[field] = Number(doc[field]);
        }

        return doc;
    }

    async bulkCreate(docs, options = {}) {

    }

    async update(doc, options = {}) {
        doc = this.convertNumberField(doc);
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

    async autoCreate(skuId) {
        const skuCode = skuId;

        let info = SkuService.parse(skuCode);
        
        // 无法识别解析的sku_id
        if ( info.type === -1 ) throw new Error(`不支持的sku_id：${skuCode}`);

        // 对于旧版货号，可以生成一个图片地址
        if ( info.type === SkuService.SKU_TYPE_OLD) {
            // "/assets/oldimages/12/1201/120126/01.png"
            let imageURL = skuCode.slice(0, 2) + '/' + skuCode.slice(0, 4) + '/' + skuCode.slice(0, 6) + '/' + skuCode.slice(-2) + '.png';
            return [{
                "id": "",
                "sku_id": skuCode,
                "index": "0",
                "shape_tpl_id": 0,
                "width": 0,
                "height": 0,
                "shape_type": "CIRCLE",
                "shape_text": "",
                "sort": 0,
                "row_span": 30,
                "col_span": 30,
                "max_rows": 14,
                "max_cols": 10,
                "image_url": '/assets/oldimages/' + imageURL
            }];
        }

        info.id = skuCode;
        info.code = skuCode;
        
        let shapes = await this._createfrom(info);

        // 不保存自动创建的 shape 信息，避免产生过多的脏数据
        // 启用扩展型货号之后，货号长度不是固定的，在自动查询时，会出现用户仅输入一部分货号，
        // 就自动尝试获取货号信息了。这时候产生的数据是无效的脏数据，没有必要存储。
        // let response = await this.insert(shapes);
        // for(let i = 0; i < shapes.length; i++) {
        //     let shape = shapes[i];
        //     shape._id = response[i].id;
        //     shape._rev = response[i].rev;
        // }

        return shapes;
    }

    /**
     * 根据 skuObject 创建 shapes 数据
     * 
     * @param {Object} skuObject 
     * @returns {Array}
     */
    async _createfrom(skuObject) {
        // 查询模板对应的 shapes 信息
        const shapes = await this.getTemplateShapes(skuObject.tplcode);

        // 查询相册对应的图片路径信息
        let albumService = new AlbumService();
        let album = await albumService.find({code: skuObject.albumcode});

        // 创建 shapes
        for(let shape of shapes) {
            shape.sku_tpl_id = parseInt(shape.sku_tpl_id);
            shape.shape_tpl_id = parseInt(shape.shape_tpl_id);
            shape.sku_id = skuObject.id;
            shape.sku_code = skuObject.code;
            let dir = shape.subpath ? album.path + '/' + shape.subpath : album.path;
            // shape.image_url = dir + '/' + skuObject.albumcode.split('').join('/') + '.png';
            shape.image_url = dir + '/' + skuObject.imagecode + '.png';

            // 删除多余的属性
            for(let key of ['_id', '_rev', 'id', 'subpath', 'created_at', 'updated_at', 'deleted_at']) delete shape[key];
        }

        return shapes;
    }

    static async getTemplateShapes(tplCode) {
        const tplService = new TemplateService();
        const tpl = await tplService.findByCode(tplCode);

        let tplShapeService = new TemplateShape();
        const options = {
            selector: {tpl_id: tpl._id}
        };

        return await tplShapeService.findAll(options);
    }
}
})();

if (!!module) module.exports = SkuShapeService;