var dialogMixin = {
    data: {
        diaSourceCategory: '圆形', // 圆形文件使用频率最高，默认没必要加载所有的图片类型
    },
    watch: {
        diaSourceCategory: function (category) {
            this.diaGetThemeImages();
        }
    },
    methods: {
        handleThemeSearch: async function(){
            if (!this.selectorThemeCode || this.selectorThemeCode.length === 0) return false;

			const response = await axios.get('/api/theme/images?theme_code=' + this.selectorThemeCode);
			this.selectorImages = response.data;
        },
        handleImageSelect: function (index, image) {
            image.isActive = !image.isActive;
            this.$set(this.selectorImages, index, image);
        },
        handleSelectorDialogOpened: function () {
            // 只有在图片列表为空时，才自动拉取图片列表
			if ( !this.selectorImages || this.selectorImages.length === 0 ) {
                if (this.selectorThemeCode.length === 0) this.selectorThemeCode = this.options.themeCode;
                // this.handleThemeSearch();
                this.diaGetThemeImages();
            }
        },
        diaGetThemeImages: async function () {
            if (null == this.srcTheme || !this.srcTheme.code) return false;

			// const response = await axios.get('/api/theme/images?theme_code=' + this.srcTheme.code);
            // const data = {'product_theme_id': this.srcTheme.id, 'category': this.diaSourceCategory};
            const params = {albumId: this.srcTheme._id};
            const response = await axios.get('/api/composition/album_images', {params: params});
			this.diaSourceImages = this.selectorImages = response.data;
        },
        handleSelectorConfirm: function () {
            this.sourceLoading = true;
            let files = [];
            this.selectorImages.forEach(image => image.isActive && files.push(image));
            this.sourceCount = files.length;
            
            this.clearSources();
            for(const file of files) {
                file.code = file.name;
                this.sourceImages.push(file);
                this.sources.push(file);
                this.sourceImageUrls.push(file.url);
            }
            files = undefined;

            this.selectorDialogVisible = false;
            return true;
        },
        handleSelectorConfirmAll: function () {
            this.selectorImages.forEach(image => image.isActive = true);
            this.handleSelectorConfirm();
        },
        handleSelectorClearAll: function() {
            this.selectorImages.forEach(image => image.isActive = false);
            this.$forceUpdate();
        },
    }
}