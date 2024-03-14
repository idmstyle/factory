(async (window) => {
const shapeService = new ShapeService();
const vm = new Vue({
    el: '#app',
    delimiters: ['<{', '}>'],
    data: {
        shapes: [],
        isUnderDownloading: false,
        editFormVisible: false,
        current: {code: '', path: ''},
        keyword: '',
    },
    mounted: async function() {
        const vm = this;
        
        const shapes = await shapeService.findAll({});
        console.log('shapes:', shapes);
        this.shapes = shapes;
    },
    methods: {
        handleNewItem: function () {
            this.$message({message: '功能开发中', type: 'info'});
            return ;
            this.current = {id: '', shape: '', shape_text: ''};
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