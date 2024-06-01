class ShapeService {
    db;

    constructor() {
        this.dbName = 'dmstyle_factory_shapes';
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
}