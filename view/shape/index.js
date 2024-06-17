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
    },
    mounted: async function() {
        const vm = this;
        return new Promise(async function (resolve, reject) {
            // const response = await axios.get('/shape/get');
            // vm.shapes = response.data;
            await ShapeService.startSync();
            const shapes = await ShapeService.findAll();
            vm.shapes = shapes;
        });
    },
    methods: {
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