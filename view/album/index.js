(async function (window) {
'use strict';

const vm = new Vue({
	el: '#app',
	delimiters: ['<{', '}>'],
	data: {
        albums: [],
		current: {},
		editFormVisible: false,
		isNew: false,
        params: {
            code: "",
            name: "",
            tag: "",
            desc: "",
			page: 1,
			perpage: 50
        },
		isAlbumLoading: true,
		albumImportResult: [],
		isLoading: false,
		isInfiniteScrollDisabled: false,
		currentPage: 1,
		pageCount: 1,
		isPaginationDisabled: false,
		defaultCover: '/factory/static/img/default-album-cover.svg'
	},
	mounted: function() {
		const vm = this;
		return new Promise(async function (resolve, reject) {
			vm.handleLoadAlbums(1);
		});
	},
	methods: {
		handleShowNewAlbumDialog: function () {
			this.current = {id: null, code: '', desc: ''};

			this.isNew = true;
			this.editFormVisible = true;
		},
		hanleSaveNewAlbum: async function () {
			const response = await core.axios.post('api/albums', this.current);
			
			if (response.status == 200) {
				const album = response.data;
				this.current = Object.assign({}, this.current, album);
				this.albums.unshift(this.current);
			} else {
				this.$message({type: 'error', message: '出错啦'});
			}
			this.$message({type: 'success', message: '操作成功'});
			this.editFormVisible = false;
		},
		handleLoadAlbums: async function(page = null) {
			this.isAlbumLoading = true;
			this.isPaginationDisabled = false;
			
			const params = this.params;

			const options = {
				params: params
			}

			const response = await core.axios.get('api/albums', options);

			const result = response.data;
			// 数据到最后一页了
			if (result.meta.lastPage <= result.meta.currentPage) {
				this.isInfiniteScrollDisabled = true;
				
				this.pageCount = Math.ceil(result.meta.total / result.meta.perPage);

				// 实际测试中发现，只把 pageCount 设置为1，并不会禁用下一页的按钮
				// 当只有一页时，可以直接禁用翻页功能
				if (this.pageCount == 1) this.isPaginationDisabled = true;
			}
			
			let albums = result.data;
			for(let album of albums) {
				if (album.cover && (-1 == album.cover.indexOf('_160x160') && (-1 == album.cover.indexOf('.svg')))) {
					album.cover = album.cover + '_160x160.png';
				}
			}

			this.albums = albums;
			this.isAlbumLoading = false;
		},
		handleSearch: async function () {
			this.params.page = 1;
			this.isInfiniteScrollDisabled = false;
			this.handleLoadAlbums();
		},
		handleCurrentPageChange: async function (current) {
			this.handleLoadAlbums(current);
		},
		createAlbumDetailLink: function (album) {
			let href;
			if (window != window.parent) {
				let url = new URL(window.parent.location.href);
				url.searchParams.set('_path_', 'view/album/detail.html?id=' + album.id);
				href = url.toString()
			} else {
				href = 'detail.html?id=' + album.id;
			}
			return href;
		},
		handleSelectDirectory: async function () {
			const response = await axios.get('/dialog/selectDirectory');
			this.current.path = response.data;
		},
		handleResetSearchParams: async function () {
			this.params = Object.assign(this.params, { code: "", name: "", tag: "", desc: "", page: 1});
			this.handleLoadAlbums();
		}
	}
});

})(window);