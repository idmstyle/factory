(async (window) => {
const DB_TYPES = [
    { name: '本地相册', service: new AlbumService() },
    { name: '印花模板', service: new ShapeService() },
    { name: '效果图模板', service: new TemplateService() },
    { name: '效果图模板图片', service: new TemplateImageService() },
    { name: '效果图模板对应印花', service: new TemplateShapeService() },
    { name: '货号对应印花', service: new SkuService() },
];

async function importDocs(service, docs) {
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

async function importDocsOld(service, url) {
    const data = await fetch(url).then(response => response.json() );
    const docs = [];
    for(let item of data) {
        docs.push(item.doc);
    }

    importDocs(service, docs);
}
// importDocsOld(new TemplateService(), 'settings/demo.json')

const vm = new Vue({
    el: '#app',
    delimiters: ['<{', '}>'],
    data: {
        dbs: DB_TYPES,
        isUnderDownloading: false,
        editFormVisible: false,
        current: {code: '', path: ''},
        keyword: '',
    },
    mounted: async function() {},
    methods: {
        handleImportItem: async function (item) {
            const selector = document.getElementById('file-selector');

            async function fileSelectorChange(event) {
                const files = selector.files;
                if (files.length == 0) return ;

                const file = files[0];
                const docs = await fetch(URL.createObjectURL(file)).then( function (response) {
                    return response.json();
                });
                
                await importDocs(item.service, docs);
                vm.$message({message: '数据导入成功', type: 'success'});

            }
            selector.addEventListener('change', fileSelectorChange, { once: true });

            selector.click();
        },
        handleExportItem: async function (item) {
            const service = item.service;
            const all = await service.findAll({});
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

})(window);