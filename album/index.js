(async function (window) {
'use strict';

axios.defaults.baseURL = 'http://localhost:7001';

const albumService = new AlbumService();

// 相册导入功能使用的文件选择器ID
const ALBUM_IMPORTER_FILE_SELECTOR_ID = 'albumImporterFileSelector';

/**
 * 检测是否是空对象
 * 
 * null、undefined或者{}都会被认为是空对象
 * 
 * @param {object} object 
 * @returns boolean
 */
function isObjectEmpty(object) {
	return object == null || typeof object == 'undefined' || JSON.stringify(object) == "{}";
}

async function findAlbums(selector) {
	// const params = isObjectEmpty(selector) ? null : { params: selector};
	// return await axios.get('/api/albums', params);
	const docs = await albumService.findAll({selector: selector});
	return docs;
}

async function createAlbum(album) {
	return axios.post('/api/albums', album);
}

async function updateAlbum(album) {
	return axios.put(`/api/albums/${album._id}`, album);
}

async function importAlbums() {
	const input = document.getElementById(ALBUM_IMPORTER_FILE_SELECTOR_ID);
	if (input.files.length == 0) return ;

	vm.isLoading = true;
	vm.$forceUpdate();

	const file = input.files[0];
	const url = URL.createObjectURL(file);
	const albums = await fetch(url).then(response => response.json());

	axios.all(albums.map((album) => createAlbum(album))).then(
		(data) => console.log(data)
	).catch(error => console.log(error)).finally(async () => {
		vm.isLoading = false;
		const response = await findAlbums();
		const albums = response.data;
		if (Array.isArray(albums)) vm.albums = albums;
	});
}


const vm = new Vue({
	el: '#app',
	delimiters: ['<{', '}>'],
	data: {
		themes: [],
        albums: [],
		current: {},
		isUnderDownloading: false,
		editFormVisible: false,
		curTheme: {code: '', path: ''},
		keyword: '',
		isNew: false,
        params: {
            code: "",
            name: "",
            owner: "",
            description: "",
        },
		isAlbumLoading: true,
		albumImportResult: [],
		isLoading: false,
	},
	mounted: async function() {
		const vm = this;

		const albums = await albumService.findAll({});
		this.albums = albums;

		// const doc = {"id":"0084ee59237098ae2a5ac4c5cd0006f2","key":"0084ee59237098ae2a5ac4c5cd0006f2","value":{"rev":"1-95a3282a044081da46686ea1bc38a0d5"},"doc":{"_id":"0084ee59237098ae2a5ac4c5cd0006f2","_rev":"1-95a3282a044081da46686ea1bc38a0d5","created_at":"2023-06-19 08:51:53","updated_at":"2023-06-19 08:51:53","deleted_at":null,"code":"559","path":"/assets/images/5/5/9","name":"定制-lichunling79"}};
		// const result = await albumService.create(doc.doc);
		// console.log('result:', result);

		try {
			const response = await findAlbums();
			const albums = response.data;
			if (Array.isArray(albums)) vm.albums = albums;
		} catch (error) {}

		
		// 相册列表渲染完成后，移除 loading 图标
		this.$nextTick(() => vm.isAlbumLoading = false);

		document.getElementById(ALBUM_IMPORTER_FILE_SELECTOR_ID).addEventListener('change', importAlbums);
	},
	watch: {
		'curTheme.code': function (code) {
			if(!this.isNew) return code;

			let path = '/assets/images/' + code.split('').join('/');
			this.curTheme.path = path;
			this.$forceUpdate();
		}
	},
	methods: {
		handleShowNewAlbumDialog: function () {
			this.current = this.curTheme = {code: '', path: ''};
			this.isNew = true;
			this.editFormVisible = true;
		},
		hanleSaveNewAlbum: async function () {
			const vm = this;

			const response = await createAlbum(vm.current);
			
			if (response.status != 200 || !data.ok) {
				vm.$message({type: 'error', message: '更新出错，请稍后重试'});
				return ;
			}

			const data = response.data;
			vm.current._id = data.id;
			vm.current._rev = data.rev;

			vm.albums.unshift(vm.current);
			vm.$message({type: 'success', message: '更新成功'});
			vm.editFormVisible = false;
		},
		handleEditTheme: function (theme) {
			this.isNew = false;
			this.curTheme = JSON.parse(JSON.stringify(theme));
			this.curTheme.images = this.curTheme.images && this.curTheme.images.length > 0 ? this.curTheme.images.join("\n") : '';

			this.editFormVisible = true;
		},
		handleUpdateItem: async function() {
			const vm = this;
			const isNew = vm.current._id ? false : true;

			const response = isNew
					? await axios.post('/api/albums', vm.current)
					: await axios.put(`/api/albums/${vm.current._id}`, vm.current);

			let data = response.data;
			if (response.status != 200 || !data.ok) {
				vm.$message({type: 'error', message: '更新出错，请稍后重试'});
				return ;
			}

			vm.current._id = data.id;
			vm.current._rev = data.rev;

			if (isNew) vm.albums.unshift(vm.current);
			vm.$message({type: 'success', message: '更新成功'});
			vm.editFormVisible = false;
		},
		handleSearch: async function() {
            const vm = this;
			var config = { params: vm.params };
			var response = await axios.get("/api/albums", config, {responseType: 'json'});
			this.albums = response.data;
		},
		handleExportAlbums: async function () {
			window.open('/api/albums?export=all');
		},
		handleImportAlbums: async function () {
			document.getElementById(ALBUM_IMPORTER_FILE_SELECTOR_ID).click();
		}
	}
});

})(window);