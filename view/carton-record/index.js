(async (window) => {
const vm = new Vue({
    el: '#app',
    delimiters: ['<{', '}>'],
    data: {
        shapes: [],
        isUnderDownloading: false,
        editFormVisible: false,
        current: {code: '', path: ''},
        currentIndex: null,

        records: [],
        templates: [],
        currentTemplate: {},
        categories: [],
        category: {},
    },
    mounted: async function() {
        const vm = this;
        return new Promise(async function (resolve, reject) {
            const response = await axios.get('../../data/carton-record/index.json');
            vm.templates = response.data;
            vm.currentTemplate = vm.templates[0];
        });
    },
    watch: {
        currentTemplate: async function (newTemplate, oldTemplate) {
            const response = await axios.get('../../data/carton-record/' + newTemplate.records);
            let records = response.data;
            for(let record of records) {
                record.length = Number(record.length).toFixed(2);
                record.width = Number(record.width).toFixed(2);
                record.height = Number(record.height).toFixed(2);
                record.weight = Number(record.weight).toFixed(2);
                record.average_weight = Number(record.weight * 1000 / record.quantity).toFixed(2);
            }
            this.records = response.data;
        }
    },
    methods: {
        handleTemplateChange: async function () {
            
        },
        handleCopyFormatedText: function (row) {
            let vm = this;
            let text = `数量：${row.quantity} ${row.unit}；\r\n毛重：${row.weight} KG；\r\n外箱尺寸：${row.length} * ${row.width} * ${row.height} CM；\r\n数据仅供参考，不同批次存在差异，请以实际发出数据为准。`;
            navigator.clipboard.writeText(text).then(
                function () {
                    vm.$message({type: 'success', message: '已复制'});
                },
                function () {
                    vm.$message({type: 'error', message: '复制失败，请刷新后重试'});
                },
            );
        },
        handleNewItem: function () {
            this.$message({message: '功能开发中', type: 'info'});
            return ;
            this.current = {_id: '', shape: '', shape_text: ''};
            this.editFormVisible = true;
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
        handleEditItem: function (index, item) {
            this.currentIndex = index;
            this.current = JSON.parse(JSON.stringify(item));
            this.editFormVisible = true;
        },
        handleUpdateItem: async function() {
            const vm = this;
            const current = this.current;
            const isNew = !current.hasOwnProperty('_id') || !current._id;

            const response = isNew
                ? await axios.post('/shape/create', current)
                : await axios.post('/shape/update', current);

            if (response.status < 200 || response.status >= 300) {
                vm.$message.error('更新出错，请稍后重试');
                return ;
            }

            current._id = response.data.id;
            current._rev = response.data._rev;

            // 更新显示的主题列表
            if (isNew) {
                vm.shapes.unshift(current);
            } else {
                vm.shapes.splice(this.currentIndex, 1, current);
            }

            vm.$message({type: 'success', message: '更新成功'});
            vm.editFormVisible = false;
        }
    }
});
})(window);