var sourceMixin = {
    data: {
        srcTheme: null,
        srcThemes: [],        
        albumQueryLoading: false,
        albums: [],
        album: {},
        albumImageTag: '圆形',
        sources: [],
        // 当前选中的相册图片
        // 由于模板包含的图片使用了变量名image，所以这里使用的名字为source
        selectedSources: [],
    },
    watch: {
        album: function (album) {
            if (!album) return ;

            this.options.themeCode = album.code;
            this.options.albumCode = album.code;
            this.albumId = album.id;
            this.loadAlbumImages();
        },
        albumImageTag: function (tag) {
            this.loadAlbumImages();
        }
    },
    methods: {
        loadAlbumImages: async function () {
            const params = {
                albumId: this.album.id,
                tag: this.albumImageTag
            };
            const response = await core.axios.get('api/album_images', {params: params});
            this.album.images = response.data;
        },
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
            this.selectedSources = [];
        },
        albumQuery: async function (query) {
            if (query == '') {
                this.albums = [];
                return ;
            }

            this.albumQueryLoading = true;
            const params = {
                code: query
            }
            const response = await core.axios.get('api/albums', {params: params});
            const albums = response.data.data;
            for(let album of albums) {
                album.images = [];
            }
            this.albums = albums;
            this.albumQueryLoading = false;
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
        handleAlbumImageSelected: function (index, image) {
            image.isActive = !image.isActive;
            this.$set(this.album.images, index, image);
            this.updateSources();
        },
        updateSources: function () {
            let files = [];
            this.album.images.forEach(image => image.isActive && files.push(image));
            this.sourceCount = files.length;
            
            this.clearSources();
            for(const file of files) {
                this.sourceImages.push(file);
                this.sources.push(file);
                this.selectedSources.push(file);
                this.sourceImageUrls.push(file.url);
            }
            files = undefined;
            this.updatePreviewImages();
            return true;
        },
        handleSourceClearAll: function() {
            this.album.images.forEach(image => image.isActive = false);
            this.updateSources();
            this.$forceUpdate();
        },
        handleSourceSelectAll: function () {
            this.album.images.forEach(image => image.isActive = true);
            this.updateSources();
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
        handleResourceLoad: function(event, resource){
            resource['targetId'] = event.target.id;
        },
        handleSourceCategoryCommand: function (command) {
            this.diaSourceCategory = command;
        }
    }
}