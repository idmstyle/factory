(async()=>{
    
const templateService = new TemplateService();

const vm = new Vue({
    el: '#app',
    delimiters: ['<{', '}>'],
    data: {
        items: [],
        isUnderDownloading: false,
        editFormVisible: false,
        current: {code: '', path: ''},
        keyword: '',
    },
    mounted: function() {
        // const docs = await templateService.findAll({});
        // this.items = docs;
        return new Promise(async (resolve, reject) => {
            const response = await axios.get('/template/get');
            vm.items = response.data;
        });
    },
    methods: {
        handleNewItem: function () {
            this.current = {id: null, code: '', category: '', is_mixed: 0, description: ''};
            this.editFormVisible = true;
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
                ? await axios.post('/api/composition/templates', current)
                : await axios.put(`/api/composition/templates/${current._id}`, current, {responseType: 'json'});

            if (response.status < 200 || response.status >= 300) {
                vm.$message.error('更新出错，请稍后重试');
                return ;
            }

            // 更新显示的主题列表
            if (isNew) {
                vm.items.unshift(response.data);
            } else {
                for(let i=0, length = vm.items.length; i < length; i++) {
                    if (vm.items[i]._id == vm.current._id) {
                        vm.items.splice(i, 1, response.data);
                    }
                }
            }

            vm.$message({type: 'success', message: '更新成功'});
            vm.editFormVisible = false;
        },
        handleSearch: async function() {
            const params = {keyword: this.keyword};
            const config = { params: params };
            const response = await axios.post("/admin/product/theme/list", config, {responseType: 'json'});
            this.themes = response.data;
        }
    }
});
    
})(window);