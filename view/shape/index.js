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
            const response = await core.axios.get('api/shapes');
            vm.shapes = response.data;
        });
    },
    methods: {
        handleNewItem: function () {
            // let doc = {
            //     "_id": "10001",
            //     "width": 153,
            //     "height": 153,
            //     "row_span": 30,
            //     "col_span": 30,
            //     "max_rows": 18,
            //     "max_cols": 13,
            //     "shape": "CIRCLE",
            //     "shape_text": "13*13圆tt",
            //     "sort": 2,
            //     "subpath": null,
            //     "created_at": "2022-10-26 02:53:49",
            //     "updated_at": "2022-10-26 02:53:49"
            //   };
            // ShapeService.create(doc);
            // this.$message({message: '功能开发中', type: 'info'});
            // return ;
            this.current = {id: null, shape: '', shape_text: ''};
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
            const isNew = !current.hasOwnProperty('id') || !current.id;

            const response = isNew
                ? await core.axios.post('api/shapes', current)
                : await core.axios.put(`api/shapes/${current.id}`, current);

            if (response.status < 200 || response.status >= 300) {
                vm.$message.error('操作失败，请稍后重试');
                return ;
            }

            let data = response.data;
            current.updatedAt = data.updatedAt;
            current.createdAt = data.createdAt;
            current.id = data.id;

            // 更新显示的主题列表
            if (isNew) {
                vm.shapes.unshift(data);
            } else {
                vm.shapes.splice(this.currentIndex, 1, current);
            }

            vm.$message({type: 'success', message: '操作成功'});
            vm.editFormVisible = false;
        }
    }
});
})(window);