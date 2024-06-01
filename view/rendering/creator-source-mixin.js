var sourceMixin = {
    data: {
        srcTheme: null,
        srcThemes: [],        
        srcThemeQueryLoading: false,
    },
    watch: {
        srcTheme: function (theme) {
            if (theme) {
                this.options.themeCode = theme.code;
                // this.diaGetThemeImages();
                // this.albumImageURL = `view/album-image/index.html?album-id=${theme._id}`;
                this.albumId = theme._id;
            }
        }
    },
    methods: {
        handleSourceClear: function() {
            this.clearSources();
            this.selectorImages = [];
            this.selectorThemeCode = '';
        },
        handleShowImageSelector: function () {
            if (!this.srcTheme) return this.$message.error('请先选择主题');
            this.selectorDialogVisible = true;
        },
        clearSources: function () {
            this.sourceImages = [];
            this.sources = [];
            this.previews = [];
            this.sourceImageUrls = [];
        },
        srcThemeQuery: async function (query) {
            if (query == '') {
                this.srcThemes = [];
                return ;
            }

            this.srcThemeQueryLoading = true;
            // const response = await axios.get(`/api/composition/albums?code=${query}`);
            const selector = {};
            if ( isNaN(query) ) {
                selector['name'] = {'$regex': '.*' + query + '.*'};
            } else {
                selector['_id'] = {'$regex': '.*' + query + '.*'};
            }
			
            const options = {
                selector: selector
            };
            const response = await axios.post('dms://localhost/album/get', options);
            this.srcThemes = response.data;
            this.srcThemeQueryLoading = false;
        },
        srcImageSelect: function (index, image) {
            image.isActive = !image.isActive;
            this.$set(this.selectorImages, index, image);
            this.srcUpdateSourceImages();
        },
        srcUpdateSourceImages: function () {
            let files = [];
            this.selectorImages.forEach(image => image.isActive && files.push(image));
            this.sourceCount = files.length;
            
            this.clearSources();
            for(const file of files) {
                file.code = file.basename;
                this.sourceImages.push(file);
                this.sources.push(file);
                this.sourceImageUrls.push(file.url);
            }
            files = undefined;
            this.updatePreviewImages();
            // this.selectorDialogVisible = false;
            return true;
        },
        srcSourceClearAll: function() {
            this.selectorImages.forEach(image => image.isActive = false);
            this.srcUpdateSourceImages();
            this.$forceUpdate();
        },
        srcSourceSelectAll: function () {
            this.selectorImages.forEach(image => image.isActive = true);
            this.srcUpdateSourceImages();
            this.$forceUpdate();
        },
        handleSourceLoad: function(event, source, index){
            const now = new Date();
            source['imageDom'] = event.target;
            this.$forceUpdate(); // 修改数组内部元素的属性，需要强制刷新一次
            
            if (--this.sourceCount <= 0) {
                this.sourceLoading = false;
                this.updatePreviewImages();
            }
        },
        handleSourceCategoryCommand: function (command) {
            this.diaSourceCategory = command;
        }
    }
}