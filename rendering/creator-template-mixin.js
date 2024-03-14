var templateMixin = {
    data: {
        tplCategoryName: '',
        tplSuits: [], // 模版数据组合，页面渲染后会被附加两个字段:backgroundDom(背景dom)和watermarkDom(水印dom)
    },
    watch: {
        tplCategoryName: async function(categoryName) {
            if (categoryName in this.categories) {
                this.tplSuits = this.suits = this.categories[categoryName];
            } else {
                const response = await axios.get(`/api/composition/templates?category=${categoryName}&include_images=true`);
                this.tplSuits = this.suits = response.data;
            }

            // 强刷，以避免检测不到数组更新
            this.$forceUpdate();
        },
    },
    methods: {
        handleBackgroundImageLoad: function(event, tpl) {
            tpl['imageDom'] = event.target;
            tpl['backgroundDom'] = event.target;
            return true;
        },
        handleForegroundImageLoad: function(event, tpl) {
            tpl['foregroundDom'] = event.target;
            return true;
        },
        handleTplMarkLoad: function(event, tpl) {
            tpl['markDom'] = event.target;
            tpl['watermarkDom'] = event.target;
            return true;
        },
        isRowSelectable: function(row, index) {
            // 目前存在部分数据不完整的情况，这类模板选择后也无法生成正确的产品图
            return row.images.length > 0;
        },
        handleSelectionChange: function(selection) {
            this.selectedTplSuits = selection;
            this.tplCount = this.tpls.length;
            return this.updatePreviewImages();
        },
        handleTemplateCategoryCommand: function (command) {
            this.tplCategoryName = command;
        },
        handleTemplateSelectAll: function () {
            this.tplSuits.forEach(row => {
                if (row.images.length <= 0) return true;
                this.$refs.tplSuitsTable.toggleRowSelection(row, true);
            });
        },
        handleTemplateClearAll: function () {
            this.$refs.tplSuitsTable.clearSelection();
        }
    }
}