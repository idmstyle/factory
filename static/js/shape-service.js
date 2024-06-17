'use strict'

const database = new PouchDB('dmstyle_ningxiang_shapes');

const ShapeService = {};

ShapeService.startSync = async function() {
    let remote = localStorage.getItem('couchdb');
    if (remote == null) {
        fetch('http://localhost:7015/api/setting?key=couchdb&section=')
        .then((response) => response.json())
        .then(function (response) {
            let remote = response.data;
            sync(remote);
            localStorage.setItem('couchdb', remote);
        });
    } else {
        sync(remote);
    }

    function sync (remote) {
        const options = { live: true, retry: true };
        database.sync(`${remote}/dmstyle_ningxiang_shapes`, options);
    }
}

ShapeService.find = async function (options = {}) {
    options.limit = 1;
    const result = await ShapeService.findAll(options);
    
    return result.length == 1 ? result[0] : null;
}

ShapeService.findById = async function(id) {
    try {
        return await database.get(id);
    } catch (error) {
        return null;
    }
}

ShapeService.findAll = async function(options = {}) {
    // 如果没有检索条件，则获取所有数据
    const selector = options.selector || { _id: {$exists: true} };

    // 默认使用code进行排序，pouchdb的语法要求排序的字段必须包含在selector中
    if( !selector._id ) selector._id = {$exists: true};

    // 缺省限制每次最多获取100条数据。
    // 如果前端使用瀑布流/无限加载的方式来展现数据，limit需要大于一屏的数量
    const limit = options.limit || 100000;
    // 注意：sort中的字段必须在selector中包含
    const sort = limit > 1 ? options.sort || [{_id: 'desc'}] : null;
    
    // 用于分页
    const skip = options.skip || 0;

    const index = { fields: ['_id'] };
    const result = await database.createIndex({ index: index }).then(async function () {
        return database.find({
            selector: selector,
            sort: sort,
            limit: limit,
            skip: skip
        });
    });

    const docs = result.docs;

    for(let doc of docs) convertNumberFields(doc);

    return docs;
}

ShapeService.create = async function(doc, options = {}) {
    // 执行create动作时，对象中不能包含_rev属性
    doc._rev = undefined;

    convertNumberFields(doc);

    return await database.post(doc, options);
}

ShapeService.bulkCreate = async function(docs, options = {}) {
    return database.bulkDocs(docs, options);
}

ShapeService.update = async function(doc, options = {}) {
    convertNumberFields(doc);
    return database.put(doc, options);
}

ShapeService.bulkUpdate = async function(docs, options = {}) {

}

ShapeService.upsert = async function(doc, options = {}) {
    // @TODO: 客户端必须提供一个接收相册id、相册本地目录对照关系的接口
    // 客户端不存储对照关系，就无法处理storage信息

    if (doc._id) return ShapeService.update(doc, options);

    return ShapeService.create(doc, options);
}

ShapeService.import = async function (docs, options = {}) {
    const results = [];
    for(let doc of docs) {
        delete doc._rev;
        const exists = await ShapeService.findById(doc._id);
        
        if (exists !== null) doc = Object.assign({}, exists, doc);

        try {
            const result = await ShapeService.update(doc, options);
            results.push(result);
        } catch (error) {
            console.log('update error:', error);
        }

    }
    return results;
}

function getDatabaseFilePath () {
    return path.join(getUserDataPath(), 'database', getDatabaseName());
}

function getDatabaseName() {
    return 'dmstyle_factory_shapes.db';
}

function convertNumberFields(doc) {
    for(let name of getNumberFieldNames()) doc[name] = Number(doc[name]);
    return doc;
}

function getNumberFieldNames() {
    return ['width', 'height', 'row_span', 'col_span', 'max_rows', 'max_cols', 'sort'];
}

if (typeof module != 'undefined') module.exports = ShapeService;