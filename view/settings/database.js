(async (window) => {

const { ipcRenderer } = require('electron/renderer');

const DB_TYPES = [
    { name: '我的相册', service: AlbumService, api: '/album/import' },
    { name: '印花模板', service: new ShapeService(), api: '/shape/import' },
    { name: '效果图模板', service: new TemplateService(), api: '/template/import' },
    { name: '效果图模板图片', service: new TemplateImageService(), api: '/template-image/import' },
    { name: '效果图模板对应印花', service: new TemplateShapeService(), api: '/template-shape/import'},
    { name: '货号对应印花', service: new SkuShapeService(),  api: '/sku-shape/import' },
];

async function importDocsOld(service, docs) {
    for(let doc of docs) {
        // 导入数据时，包含_rev会导致Pouchdb判定版本冲突
        delete doc._rev;

        try {
            // 存在旧的数据，直接覆盖
            let exists = await service.findById(doc._id);
            exists = Object.assign({}, exists, doc);
            try {
                await service.update(exists);
                console.log('doc update success:', doc);
            } catch (error) {
                console.log('doc update failed:', error);
            }
        } catch (error) {
            // 不存在对应的数据，pouchdb.get会抛出异常
            try {
                await service.create(doc);
                console.log('doc create success:', doc);
            } catch (error) {
                console.log('doc create failed::', error);
            }
        }
    }

    return true;
}

async function importDocs(service, docs) {
    for(let doc of docs) {
        try {
            // 存在旧的数据，直接覆盖
            let exists = await service.findById(doc._id);
            exists = Object.assign({}, exists, doc);
            try {
                await service.update(exists);
                console.log('doc update success:', doc);
            } catch (error) {
                console.log('doc update failed:', error);
            }
        } catch (error) {
            // 不存在对应的数据，pouchdb.get会抛出异常
            try {
                await service.create(doc);
                console.log('doc create success:', doc);
            } catch (error) {
                console.log('doc create failed::', error);
            }
        }
    }

    return true;
}

async function importData(api, docs, options = {}) {
    // const response = await ipcRenderer.invoke(api, docs);
    const data = {docs: docs, options: options};
    const response = await axios.post(api, data);
    console.log('response:', response);
    return true;

    // for(let doc of docs) {
    //     try {
    //         // 存在旧的数据，直接覆盖
    //         let exists = await service.findById(doc._id);
    //         exists = Object.assign({}, exists, doc);
    //         try {
    //             await service.update(exists);
    //             console.log('doc update success:', doc);
    //         } catch (error) {
    //             console.log('doc update failed:', error);
    //         }
    //     } catch (error) {
    //         // 不存在对应的数据，pouchdb.get会抛出异常
    //         try {
    //             await service.create(doc);
    //             console.log('doc create success:', doc);
    //         } catch (error) {
    //             console.log('doc create failed::', error);
    //         }
    //     }
    // }

    // return true;
}

const vm = new Vue({
    el: '#app',
    delimiters: ['<{', '}>'],
    data: {
        dbs: DB_TYPES,
        isUnderDownloading: false,
        editFormVisible: false,
        current: {code: '', path: ''},
        keyword: '',
        currentDataType: ''
    },
    mounted: async function() {},
    methods: {
        handleImportItem: async function (item) {
            this.currentDataType = item;
            const selector = document.getElementById('file-selector');

            // async function fileSelectorChange(event) {
            //     const files = selector.files;
            //     if (files.length == 0) return ;

            //     const file = files[0];
            //     const docs = await fetch(URL.createObjectURL(file)).then( function (response) {
            //         return response.json();
            //     });

            //     // for(let doc of docs) delete doc._rev;
                
            //     const message = {
            //         docs: docs,
            //         options: {
            //             // new_edits: false
            //         }
            //     };
            //     await importData(item.api, message);
            //     vm.$message({message: '数据导入成功', type: 'success'});
            //     selector.removeEventListener('change', fileSelectorChange);

            // }
            // selector.addEventListener('change', fileSelectorChange);

            selector.click();
        },
        handleExportItem: async function (item) {
            const service = item.service;
            const all = await service.findAll({});
            console.log('all:', all);
            const filename = item.name + '.json';
            const data = JSON.stringify(all).trim("'");
            const file = new File([data], filename, {type: "application/json"});
            saveAs(file);
        },
        handleSync: async function () {
            if (this.shapes.length != 0) return ;

            const response = await axios.get('shapes.json');
            const list = response.data;
            const shapes = [];
            

            for(let item of list) {
                const response = await axios.post('/api/shapes', item.doc);
                console.log('ressponse:', response);
                shapes.push(item.doc);
            }

            this.shapes = shapes;
        },
        handleEditItem: function (item) {
            this.current = JSON.parse(JSON.stringify(item));
            this.editFormVisible = true;
        },
        handleUpdateItem: async function() {
            const vm = this;
            const current = this.current;
            const isNew = !current.hasOwnProperty('_id') || !current._id;

            const response = isNew
                ? await axios.post('/api/shapes', current)
                : await axios.put(`/api/shapes/${current._id}`, current, {responseType: 'json'});

            if (response.status < 200 || response.status >= 300) {
                vm.$message.error('更新出错，请稍后重试');
                return ;
            }

            // 更新显示的主题列表
            if (isNew) {
                vm.shapes.unshift(response.data);
            } else {
                for(let i=0, length = vm.shapes.length; i < length; i++) {
                    if (vm.shapes[i]._id == vm.current._id) {
                        vm.shapes.splice(i, 1, response.data);
                    }
                }
            }

            vm.$message({type: 'success', message: '更新成功'});
            vm.editFormVisible = false;
        },
        handleSearch: async function() {
            const params = {keyword: this.keyword};
            console.log(params);
            const config = { params: params };
            const response = await axios.post("/admin/product/theme/list", config, {responseType: 'json'});
            this.themes = response.data;
        }
    }
});

const selector = document.getElementById('file-selector');

async function fileSelectorChange(event) {
    const files = selector.files;
    if (files.length == 0) return ;

    const file = files[0];
    const docs = await fetch(URL.createObjectURL(file)).then( function (response) {
        return response.json();
    });
    
    await importData(vm.currentDataType.api, docs);
    vm.$message({message: '数据导入成功', type: 'success'});

    // 如果用户第二次选择相同的文件进行导入，不会触发change事件，所以这里要在处理完成后清空文件列表
    selector.value = '';
}

selector.addEventListener('change', fileSelectorChange);

})(window);