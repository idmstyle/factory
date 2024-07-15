var templateMixin = {
    data: {
        tplCategoryName: '',
        tplSuits: [], // 模版数据组合，页面渲染后会被附加两个字段:backgroundDom(背景dom)和watermarkDom(水印dom)

        tplTag: '',
        tpls: [],
        selectedTpls: []
    },
    watch: {
        tplCategoryName: async function(categoryName) {
            if (categoryName in this.categories) {
                this.tpls = this.tplSuits = this.suits = this.categories[categoryName];
            } else {
                const params = {tag: categoryName}
                const response = await core.axios.get('api/rendering_tpls', {params: params});
                let tpls = response.data.data;

                for(let tpl of tpls) {
                    tpl.images = [];
                }

                this.tpls = tpls;

                for(let tpl of tpls) {
                    let params = {tplId: tpl.id};
                    core.axios.get('api/rendering_tpl_images', {params: params}).then(function (response) {
                        tpl.images = response.data;
                    })
                }
                // const response = await axios.get('/110b8d87-81bb-4cea-af17-966837178a1c/' + categoryName + '/index.json');
                // let data = response.data;
                // for(let item of data) {
                //     let response = await axios.get('/110b8d87-81bb-4cea-af17-966837178a1c/' + categoryName + '/' + item.path + '/index.json');
                //     let images = response.data;
                //     for(let image of images) {
                //         if (image.background.length>0) {
                //             image.background = '/110b8d87-81bb-4cea-af17-966837178a1c/' + categoryName + '/' + item.path + '/' + image.background;
                //         }

                //         if (image.foreground.length>0) {
                //             image.foreground = '/110b8d87-81bb-4cea-af17-966837178a1c/' + categoryName + '/' + item.path + '/' + image.foreground;
                //         }
                        
                //         if (image.watermark.length>0) {
                //             image.watermark = '/110b8d87-81bb-4cea-af17-966837178a1c/' + categoryName + '/' + item.path + '/' + image.watermark;
                //         }
                        
                //     }
                //     item.images = images;
                // }
                
                // this.tplSuits = this.suits = data;
            }

            // 强刷，以避免检测不到数组更新
            this.$forceUpdate();
        },
    },
    methods: {
        handleTplImageLoad: function(event, image) {
            image['dom'] = event.target;
            return true;
        },
        handleForegroundImageLoad: function(event, tpl) {
            tpl['foregroundDom'] = event.target;
            return true;
        },
        handleWaterMarkLoad: function(event, watermark) {
            watermark['dom'] = event.target;
            return true;
        },
        isRowSelectable: function(row, index) {
            // 目前存在部分数据不完整的情况，这类模板选择后也无法生成正确的产品图
            return row.images.length > 0;
        },
        handleTplSelectionChange: function(selection) {
            this.selectedTpls = selection;
            this.selectedTplSuits = selection;
            this.tplCount = selection.length;
            this.updatePreviewImages();
        },
        handleTplListSelectAll: function () {
            this.tpls.forEach(row => {
                if (row.images.length <= 0) return true;
                this.$refs.tplListTable.toggleRowSelection(row, true);
            });
        },
        handleTplListClearAll: function () {
            this.$refs.tplListTable.clearSelection();
        }
    }
}