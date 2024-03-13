class AlbumService {
    db;

    constructor() {
        this.dbName = 'albums';
        this.db = new PouchDB(this.dbName);
    }

    async find(options = {}) {
        options.limit = 1;
        const result = await this.findAll(options);
        
        return result.length == 1 ? result[0] : null;
    }

    async findByCode(code) {
        const selector = {code: code};
        return this.find({selector: selector});
    }

    async findAll(options) {
        const _this = this;

        // 如果没有检索条件，则获取所有数据
        const selector = options.selector || { code: {$exists: true} };

        // 默认使用code进行排序，pouchdb的语法要求排序的字段必须包含在selector中
        if( !selector.code ) selector.code = {$exists: true};

        // 缺省限制每次最多获取100条数据。
        // 如果前端使用瀑布流/无限加载的方式来展现数据，limit需要大于一屏的数量
        const limit = options.limit || 100;
        // 注意：sort中的字段必须在selector中包含
        const sort = limit > 1 ? options.sort || [{code: 'desc'}] : null;
        
        
        // 用于分页
        const skip = options.skip || 0;

        const index = { fields: ['code'] };
        const result = await this.db.createIndex({ index: index }).then(async function () {
            return _this.db.find({
                selector: selector,
                sort: sort,
                limit: limit,
                skip: skip
            });
        });

        console.log('alldocs:', this.db.allDocs());

        console.log('result:', result);

        return result.docs;
    }

    async create(doc, options = {}) {
        // 执行create动作时，对象中不能包含_rev属性
        doc._rev = undefined;

        const exists = await this.findByCode(doc.code);
        if(exists && exists._id) throw new Error('相册短代码冲突', {cause: 409});

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
        if (doc._id) return this.update(doc, options);

        return this.create(doc, options);
    }
}