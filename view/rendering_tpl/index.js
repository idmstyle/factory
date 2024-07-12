(async function (window) {
'use strict';

const vm = new Vue({
	el: '#app',
	delimiters: ['<{', '}>'],
	data: {
        albums: [],
		items: [],
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
	},
	mounted: function() {
		this.handleLoadItems();
	},
	methods: {
		handleShowNewItemDialog: function () {
			this.current = {id: null, code: '', desc: ''};

			this.isNew = true;
			this.editFormVisible = true;
		},
		hanleSaveNewItem: async function () {
			const response = await core.axios.post('api/rendering_tpls', this.current);
			
			if (response.status == 200) {
				const item = response.data;
				this.current = Object.assign({}, this.current, item);
				this.items.unshift(this.current);
			} else {
				this.$message({type: 'error', message: '出错啦'});
			}
			this.$message({type: 'success', message: '操作成功'});
			this.editFormVisible = false;
		},
		handleLoadItems: async function(page = null) {
			this.isAlbumLoading = true;
			this.isPaginationDisabled = false;
			
			const params = this.params;

			const options = {
				params: params
			}

			const response = await core.axios.get('api/rendering_tpls', options);

			const result = response.data;
			// 数据到最后一页了
			if (result.meta.lastPage <= result.meta.currentPage) {
				this.isInfiniteScrollDisabled = true;
				
				this.pageCount = Math.ceil(result.meta.total / result.meta.perPage);

				// 实际测试中发现，只把 pageCount 设置为1，并不会禁用下一页的按钮
				// 当只有一页时，可以直接禁用翻页功能
				if (this.pageCount == 1) this.isPaginationDisabled = true;
			}
			
			this.items = result.data;
			this.isAlbumLoading = false;
		},
		handleSearch: async function () {
			this.params.page = 1;
			this.isInfiniteScrollDisabled = false;
			this.handleLoadItems();
		},
		handleCurrentPageChange: async function (current) {
			this.handleLoadItems(current);
		},
		handleShowDetail: function(item) {
			let href;
			if (window != window.parent) {
				let url = new URL(window.parent.location.href);
				url.searchParams.set('_path_', 'view/rendering_tpl/detail.html?id=' + item.id);
				href = url.toString()
			} else {
				href = 'detail.html?id=' + item.id;
			}
			window.open(href, '_blank');
		},
		detailLink: function (id) {
			let href;
			if (window != window.parent) {
				let url = new URL(window.parent.location.href);
				url.searchParams.set('_path_', 'view/rendering_tpl/detail.html?id=' + id);
				href = url.toString()
			} else {
				href = 'detail.html?id=' + id;
			}

			return href;
		},
		handleResetSearchParams: async function () {
			this.params = Object.assign(this.params, { code: "", name: "", tag: "", desc: "", page: 1});
			this.handleLoadItems();
		}
	}
});

})(window);