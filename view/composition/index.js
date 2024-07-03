(async (window) => {

const CANVAS_RATIO = 1.0;
const CANVAS_WIDTH = 2480 * CANVAS_RATIO;
const CANVAS_HEIGHT = 3508 * CANVAS_RATIO;
const CANVAS = new OffscreenCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);

const worker = new Worker('index-worker.js');
const API_HOST = '';
worker.addEventListener('message', function (event){
	const data = event.data;
	if ( !data.success ) {
		console.error('Error Message:', data.error);
		return false;
	}
	
	vm.newpages = event.data.pages;
});

function startCompose(batchId, images) {
	let message = {batchId: batchId, images: images};
	worker.postMessage(message);
}

const CompositionBatch = {
	storageKey: 'composition-batches',
	get: function () {
		// 为避免多个页面同时操作batches造成重复，这里不在内存中存放batches数据
		var str = window.localStorage.getItem(this.storageKey);
		var batches = str ? JSON.parse(str) : [];

		// 为兼容旧的列表，这里增加一个合并操作，一定时间后删除
		// for(var batch of window.batches) {
		// 	var index = batches.findIndex(element => element.id == batch.id);
		// 	if (index == -1) batches.push(batch);
		// }

		return batches;
	},
	save: function (batches) {
		return window.localStorage.setItem(this.storageKey, JSON.stringify(batches));
	},
	create: function (isCurrent = true) {
		var id = this.createId();
		var batch = {id: id, isCurrent: isCurrent};
		var batches = this.get();
		batches.unshift(batch);
		this.save(batches);
		return batch;
	},
	createId: function () {
		var date = new Date();
		var year = date.getFullYear();
		var arr = [date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
		arr = arr.map(item => String(item).padStart(2, '0'));
		// 格式:年月日时分秒，20230203081025
		return year + arr.join('');
	},
	delete: function (id) {
		var batches = this.get();
		var index = batches.findIndex(batch => batch.id == id);

		// 要删除的批次不存在，什么都不需要做
		if (index == -1) return true;

		batches.splice(index, 1);
		this.save(batches);
		return batches;
	},
	getCurrent: function (batches = null) {
		if (batches == null) batches = this.get();
		var current = batches.find(element => element.isCurrent == true);
		if (current !== undefined) return current;
		return batches[0] ? batches[0] : undefined;
	},
	getCurrentId: function (batches = null) {
		var current = this.getCurrent(batches);
		return current ? current.id : undefined;
	},
	setCurrent: function (id) {
		var batches = this.get();
		for( var batch of batches) {
			batch.isCurrent = batch.id == id;
		}
		this.save(batches);
		return batches;
	}
};


// 为避免出现同时插入同一sku的多张图片导致的message提示过多问题，
// 每次事件触发时，都要检测一下（hasOwnProperty(skuId)）是否已经有message被打开了
const imageLoadErrorMessages = {};

async function updateCompositionImageCache(batchId, images) {
	return new Promise((resolve, reject) => {
		window.localStorage.setItem('composition-images-cache-' + batchId, JSON.stringify(vm.images));
		resolve('success');
	});
}

function getCompositionImageCache(batchId) {
	let cache = window.localStorage.getItem('composition-images-cache-' + batchId);
	return cache ? JSON.parse(cache) : [];
}

function clearCompositionImageCache(batchId) {
	return window.localStorage.removeItem('composition-images-cache-' + batchId);
}

// 图片数据库
let imageStore;

const vm = new Vue({
	el: '#app',
	delimiters: ['<{', '}>'],
	data: {
		pages:[],
		batchList:[],
		curBatchId:'',
		insertItem: {'sku':'12023801', 'quantity':1},
		orderDetail:{},
		productItems:[],
		orderId:'', // 643500672448589639
		helperDrawerVisible: false,
		imageBasePath: "",
		isUnderGenerating: false,
		contextMenuImage: null,
		imageContextMenu: null,
		skuType: 'I',
		isBuyerSku: false,
		currentProductItem : null,
		currentProductItemIndex: null,


		batchId: '20220202002', // 替代 curBatchId
		skuId: '',              // 代替 insertItem.skuCode，示例：20000101
		quantity: 1,            // 代替 insertItem.quantity
		shapes: [],
		isAutoCreateVisible: false,
		previewRatio: 0.12,
		isFastInsertDisabled: true,
		newpages: [[]],
		images: [],
		preshapes: {},
		skuCode: '',
	},
	watch: {
		skuCode: function(skuCode) {
			this.handleShapesSearch();
		},
		skuId: function(newSkuId) {
			this.skuCode = newSkuId;
			// this.handleShapesSearch();
		},
		quantity: function(newNumber) {
			this.insertItem.quantity = newNumber;
		},
		// batchId: async function (newBatchId) {
		// 	this.curBatchId = newBatchId;
		// 	var images = getCompositionImageCache(newBatchId);
		// 	this.images = images;
		// },
		batchId: async function (newId) {
			let vm = this;

			// 必须有正确的batchId才能执行后续的操作
			if (typeof newId !==  'string' || newId.length === 0) return ;

			imageStore = new localforage.createInstance({
				name: 'composition-image-' + newId
			});

			let images = [];
			imageStore.iterate(function(value, key, iterationNumber) {
				images.push(value);
			}).then(function () {
				vm.images = images;
				startCompose(newId, vm.images);
			}).catch(function (error) {
				vm.images = [];
			});

			let batches;
			try {
				batches = JSON.parse(window.localStorage.getItem('composition-batches'));
				for(let batch of batches) batch.isCurrent = batch.id == newId;
				window.localStorage.setItem('composition-batches', JSON.stringify(batches));
			} catch (error) {
				batches = [];
			}
		}
	},
	mounted: function() {
		let vm = this;
		return new Promise(async(resolve, reject) => {
			// this.batchList = CompositionBatch.get();
			// this.batchId = CompositionBatch.getCurrentId(this.batchList);

			try {
				vm.batchList = JSON.parse(window.localStorage.getItem('composition-batches'));
				for(let batch of vm.batchList) if (batch.isCurrent) vm.batchId = batch.id;
			} catch (error) {
				if ( !Array.isArray(vm.batchList) ) vm.handleCreateBatch();
			}

			if ( vm.batchId ) {

			}

			// this.images = getCompositionImageCache(this.batchId);

			// axios.get('/api/composition/shapes').then(function(response) {
			//     const shapes = response.data;
			// 	const preshapes = {};
			// 	for(let shape of shapes) preshapes[shape.id] = shape;
			// 	vm.preshapes = preshapes;
			// });
			// const shapeService = new ShapeService();
			// const shapes = await shapeService.findAll({});
			const response = await core.axios.get('api/shapes');
			const shapes = response.data;
			const preshapes = {};
			for(let shape of shapes) {
				preshapes[shape.id] = shape;
			}
			vm.preshapes = preshapes;

		});
	},
	
	methods: {
		// handleNewBatch: async function() {
		// 	const vm = this;
		// 	const date = getFullDate();
		// 	const batchTable = db.table(window.database.COMP_BATCH_TABLE_NAME);
		// 	const count = await batchTable.where('date').equals(date).count();
		// 	const batchId = date + (count + 1 + '').padStart(3, 0);
		// 	const doc = {id: batchId, date: date, insertTime: Date.now()};

		// 	batchTable.add(doc).then(result => {
		// 		// 成功时，result返回的时新插入的主键，也就是doc.id
		// 		vm.batchList.unshift(doc);
		// 		vm.handleBatchIdChange(batchId);
		// 	}).catch(error => {
		// 		console.assert(error, '[Batch Doc Add Error]', error);
		// 	});
		// },

		handleGetOrderDetail: async function () {
			const response = await axios.get(API_HOST + '/api/trade/order/detail?id=' + this.orderId);
			this.productItems = response.data.product_items;
		},

		handleGetOrderProductItems: async function () {
			const vm = this;
			const response = await axios.get(API_HOST + '/api/trade/order/product-item/with-composition-shapes?order_id=' + this.orderId);
			const items = response.data;
			vm.isFastInsertDisabled = false;
			items.forEach(item => {
				if (!item.shapes || item.shapes.length<=0) vm.isFastInsertDisabled = true;
			});
			this.productItems = items;
		},

		handleBatchIdChange: async function(batchId) {
			for(let batch of this.batchList) batch.isCurrent = batch.id != batchId ? false : true;
			window.localStorage.setItem('current-batch-id', batchId);
			imageStore = new localforage.createInstance({
				name: "composition-image-" + batchId
			});
		},

		getSkuShapesOld: async function (child) {
			if ( child.length != 8 ) return false;
			const skuTable = db.table(window.database.COMP_SKU_COLLECTION_NAME);
			
			let skuItem = await skuTable.get({"_id": child});
			if (skuItem == undefined) {
				let sku = child.slice(0, 6);
				skuItem = await skuTable.get({"parent": sku});
				// 继承来的属性，需要做一些处理
				if (undefined !== skuItem) {
					const subCode = child.slice(-2);
					for (let shape of skuItem.shapes) {
						shape.image = renderShapeImagePath(shape.image, subCode);
						// 后期可以删除的代码
						if (!shape.image.startsWith("/images")) shape.image = '/images' + shape.image;
					}
				}
			}

			// table.get返回undefined或者doc
			return undefined !== skuItem ? skuItem.shapes : undefined;
		},
		
		/**
		 * 查询当前 skuId 包含的 shapes
		 * 
		 * @returns Array
		 */
		handleShapesSearch: async function () {
			if (!this.skuCode || this.skuCode.length !== 8) {
				if (this.shapes.length > 0) this.shapes = [];
				this.isAutoCreateVisible = false;
				return false;
			}

			// const response = await axios.get(API_HOST + '/api/composition/sku_shapes?sku_id=' + this.skuId + '&autoCreate=true'); // 
			// const shapes = response.status === 200 ? response.data : [];
            // const skuShapeService = new SkuShapeService();
            // const selector = {
            //     'sku_id': this.skuId
            // };
            // const shapes = await skuShapeService.findAll({selector: selector});
			const params = {
                'code': this.skuCode
            };
			const response = await core.axios.get('api/skus', {params: params});
			if (response.data.length <= 0) {
				return 'Not Found'
			}

			const sku = response.data[0];
			const shapes = sku.shapes;

			// console.log(this.shapes);
			for(var i = 0, len = shapes.length; i < len; i++) {
				let shape = shapes[i];
				// shape.image_url = shape.image_url.replace('/assets/images/', 'dms://storage/');
				// console.log(shape);
			}

			this.shapes = shapes;
			this.isAutoCreateVisible = true;
			return this.shapes;
		},
		shapesAutoCreateHandle: async function () {
			const response = await axios.get(API_HOST + '/api/sku_shapes/new?sku_id=' + this.skuId);

			if (response.status !== 200) return this.$message.error('操作失败：' + response.data);
			this.shapes = response.data;
		},

		getImages: function (skuCode, shapes, quantity, batchId) {
			let images = [];
			quantity = parseInt(quantity);

			shapes.forEach( (shape, index) => {
				if (shape.shapeText.length <= 0) return true; // 预留坑位，无需处理
				
				for(let count = quantity; count > 0; count--) {
					// let image = Object.assign({sku: skuCode, batchId: batchId, modifyTime: now}, shape);
					let image = Object.assign({batch_id: batchId}, shape);
					// delete image.id; // 这个id为sku记录id，后面插入到images库时，会造成冲突
					// image.id = uuidv4();
					image.id = 'id-' + nanoid();
					image.sku_code = skuCode;
					delete image.shapeText;
					images.push(image);
				}
			});

			return images;
		},

		handleSubmit: async function () {
			const vm = this;
			const skuCode = String(vm.skuCode).toUpperCase();
			if (!vm.shapes || vm.shapes.length === 0) return false;

			let newImages = vm.getImages(skuCode, vm.shapes, vm.quantity, vm.batchId);
			
			

			let cacheImages = [].concat(clone(vm.images), newImages);

			if (cacheImages.length > 0) {
				cacheImages.sort(function(a, b) {
					if (a.sku_code > b.sku_code) return 1;
					if (a.sku_code < b.sku_code) return -1;
					if (a.sku_code == b.sku_code) return 0;
				});
	
				cacheImages.sort(function(a, b) {
					return b.sort - a.sort;
				});
			}

			// cacheImages.forEach((image, index) => image.id = index);


			vm.images = cacheImages;

			for(let image of newImages) imageStore.setItem(image.id, image).then(function () {
				startCompose(vm.batchId, vm.images);
			});

			return true;
			/*
			const vm = this;
			const skuId = String(vm.skuId).toUpperCase();
			if (!vm.shapes || vm.shapes.length === 0) return false;

			let images = vm.getImages(skuId, vm.shapes, vm.quantity, vm.batchId);

			const response = await axios.post('/api/production/composition/images', images);
			this.pages = response.data.data;
			*/
		},
		handleOrderQuery: async function(){
			// 测试订单号：2054543582358557846
			const vm = this;
			vm.orderId = String(vm.orderId).trim();
			const db = WaitSellerSend.instance();
			const [error, order] = await db.get(vm.orderId);
			// console.log('order: ', order);
			if (error) return vm.$message.error('没有找到该订单');
			vm.productItems = order.localInfo.productItems;

			// const response = await axios.get('/api/trade/orders/' + vm.orderId);
			// if (response.status != 200) return vm.$message.error('订单不存在');
			// try {
			// 	const doc = await window.dbOrders.get(vm.orderId);
			// 	const productItems = doc.wsProductItems;
			// 	vm.productItems = Array.isArray(productItems) ? productItems : Object.values(productItems);
			// } catch (error) {
			// 	// 没有查询到订单
			// 	console.log('get order error:', error);
			// 	vm.$message.error('没有找到该订单');
			// }

			// const productItems = response.data.wsProductItems;
			// vm.productItems = Array.isArray(productItems) ? productItems : Object.values(productItems);
		},
		// handleFastInsert: function(row, index){
		// 	this.currentProductItem = row;
		// 	this.currentProductItemIndex = index;
		// 	this.skuCode = row.cargoNumber;
		// 	this.insertItem.quantity = row.quantity;
		// 	this.handleSubmit();
		// },
		handleExport: function (command) {
			switch(command) {
				case 'png':
					exportToPng(this.batchId, 0, this.newpages.length - 1);
					break;
				case 'tiff':
					exportToTiff(this.batchId, 0, this.newpages.length - 1);
					break;
				case 'pdf':
					this.$message({type:'warning', message: '开发中'});
					break;
			}
		},
		handleDownload: function() {
			console.log('start download...', Date.now());
			exportToPng(this.batchId, 0, this.newpages.length - 1);
			// htmlToImage.toPng(document.getElementById('page-item-wrapper-0'))
			// .then(function (dataUrl) {
			// 	/* do something */
			// 	console.log('before saveAs ...', Date.now());
			// 	saveAs(dataUrl, 'preview.png');
			// });

			// download(document.getElementById('svg-img').outerHTML, 'testdownload.svg', 'png/svg');

			return true;

			// 历史方案：@load="handleImageLoad(pageIndex, $event)"绘制canvas，会出现重叠
			const vm = this;
			const batchId = this.curBatchId;
			const length = this.pages.length;
			if ( length <= 0 ) return this.$message.error("没有图片需要处理");
			const loading = this.$loading({ lock: true, target: '#page-container', text: '图片下载中，请稍等...'});
			// 由于异步并行处理速度较快，当文件较多时，会导致浏览器写入磁盘失败，
			// 这里故意写成自身回调的方式以降低磁盘写入请求的速度。
			downloadCanvas(batchId, 0, length-1, function(){ loading.close(); });
		},
		handleImageLoadError: function(image) {
			const skuId = image.sku;
			// message已经被其他触发打开了
			if (imageLoadErrorMessages.hasOwnProperty(skuId)) return true;
			
			const message = `你可以尝试以下解决方案：<br/>
			1、检查微云同步助手是否开启<br/>
			2、点<a href="/composition/sku/code/:${skuId}" target="_blank"> 这里 </a>检查对应的尺寸信息是否正确<br/>
			3、检查是否正确设置了“多图”属性
			4、通知设计师上传图片，编号：${skuId}`;
			const options = {dangerouslyUseHTMLString: true, confirmButtonText: '我知道了'};
			imageLoadErrorMessages[skuId] = vm.$alert(message,  `图片加载失败`, options).then(function(){
				delete imageLoadErrorMessages[skuId];
			});
		},
		showBatchClearDialog: function() {
			window.open('batch.list.html');
		},

		handleDeleteItem: function() {
			// this.doContextMenuDelete({'id': this.contextMenuImage.id});
			let images = this.images;
			for(let index = 0, length = images.length; index < length; index++) {
				if (images[index].id == this.contextMenuImage.id) {
					imageStore.removeItem(images[index].id).then(function () {
						startCompose(vm.batchId, vm.images);
					});
					images.splice(index, 1);

					break;
				}
			}
		},
		handleDeleteImage: function() {
			let images = this.images;
			let deleteCount = 0;
			let toDelete = [];
			// images 长度会在循环中发生变化，每次循环要重新获取length
			for(let index = 0; index < images.length; index++) {
				if (images[index].sku_code == this.contextMenuImage.sku_code){
					toDelete.push(images[index].id);
					deleteCount++;
					images.splice(index, 1);
					--index;
				}
			}

			for(let _id of toDelete) {
				imageStore.removeItem(_id).then(function () {
					if(--deleteCount === 0) startCompose(vm.batchId, vm.images);
				});
			}
		},
		handleDeleteRow: async function() {
			let images = this.images;
			for(let index = 0; index < images.length; index++) {
				if (images[index].sku_id == this.contextMenuImage.sku_id){
					images.splice(index, 1);
					--index;
				}
			}

			// this.doContextMenuDelete({
			// 	row_id: this.contextMenuImage.row_id,
			// 	page_id: this.contextMenuImage.page_id
			// });
		},
		handleDeletePage: function() {
			this.doContextMenuDelete({'page_id': this.contextMenuImage.page_id});
		},

		// ----------------------------------------------------------------------------
		// 根据查询条件处理右键菜单删除动作
		// ----------------------------------------------------------------------------
		doContextMenuDelete: async function (filter, callback = null) {
			filter['batch_id'] = this.contextMenuImage.batch_id;
			const response = await axios.post(API_HOST + '/api/production/composition/images/delete', filter);
			if (response.status !== 200 || response.data.success != 'true') return this.$message.error(response.data.message);

			this.pages = response.data.data.pages;
			this.$message({type: 'success', message: '操作成功'});
		},
		// --------------------------------------------------------------------------------
		// 图片上双击快速删除当前图片
		// --------------------------------------------------------------------------------
		handleImageDoubleClick: function (image, pageIndex, imageIndex) {
			this.contextMenuImage = image;
			this.handleDeleteItem();
			// var index = this.images.findIndex(element => element._id == _id);
			// // id不存在时，index=-1，直接传递给splice会导致删除错误的图片
			// if (index == -1) return true;

			// this.images.splice(index, 1);


			return ;

			const images = this.images;
			const length = images.length;
			for( let index = 0; index < length; index++) {
				if (images[index].id == id) {

					// 这里一定要从pages中删除掉这个项目，如果pages中总的图片数量超过images中的图片数量，
					// 会出现一些未妥善处理的bug
					if ( index == length -1 ) {
						this.newpages[this.newpages.length - 1].splice(-1);
					}

					images.splice(index, 1);
					break;
				}
			}
		},
		// --------------------------------------------------------------------------------
		// 图片上右键打开操作菜单
		// --------------------------------------------------------------------------------
		handleRightClick: function (image, event) {
			event.preventDefault();
			// 右键菜单暂时不可用
			// return false;
			const vm = this;
			this.contextMenuImage = image;
			const contextMenuStyle = this.$refs.contextMenu.style;
			// 菜单坐标设置5px的位移，避免弹出时直接选中第一个菜单想
			contextMenuStyle.top = event.y + 5 + 'px';
			contextMenuStyle.left = event.x + 5 + 'px';
			contextMenuStyle.display = "block";
			function hideContextMenu(){
				contextMenuStyle.display = 'none';
				document.removeEventListener('click', hideContextMenu);
			};
			document.addEventListener('click', hideContextMenu);
		},
		/**
		 * 当输入焦点处于 quantity input 时，按下 tab 键，自动使 skuId input 获取焦点
		 * 
		 * @param {Object} event 
		 */
		handleQuantityInputTab: function (event) {
			event.preventDefault();
			this.$refs.skuIdInput.focus();
		},
		handleBatchInsert: function () {
			this.$message('功能开发中');
		},
		handleFastInsert: function (row) {
			this.shapes = row.shapes;
			this.quantity = row.quantity;
			this.handleSubmit();
		},

		handleCreateBatch: async function () {
			let batchId = (function () {
				var date = new Date();
				var year = date.getFullYear();
				var arr = [date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
				arr = arr.map(item => String(item).padStart(2, '0'));
				// 格式:年月日时分秒，20230203081025
				return year + arr.join('');
			})();

			let batch = {id: batchId, isCurrent: true};

			let batches;
			try {
				// 如果该键名不存在，则返回 null
				let json = window.localStorage.getItem('composition-batches')
				// JSON.parse(null) === null
				batches = JSON.parse(json) || [];

			} catch (error) {
				batches = [];
			}
			for(let batch of batches) batch.isCurrent = false;
			batches.unshift(batch);
			window.localStorage.setItem('composition-batches', JSON.stringify(batches));

			this.batchList = batches;
			this.batchId = batch.id;
		},
		handleDeleteBatch: async function (batch, index) {
			const vm = this;
			let batchToDel = batch;

			// 至少要保留一个批次用于制版
			if ( this.batchList.length <= 1) {
				vm.$message({type: 'error', message: '至少要保留一个批次'});
				return false;
			}

			let imageStore = localforage.createInstance({
				name: 'composition-image-' + batch.id
			});
			imageStore.length().then(function (length) {
				if (length > 0) {
					vm.$message({type: 'error', message: '当前批次下存在未删除图片，请先清空图片后再操作删除批次'});
					return ;
				}

				imageStore.dropInstance().then(function () {
					try {
						vm.batchList = JSON.parse(window.localStorage.getItem('composition-batches'));
						for(let index = 0; index < vm.batchList.length; index++) {
							if (vm.batchList[index]._id == batchToDel._id) vm.batchList.splice(index, 1);
						}

						// 如果删除的是当前的批次，需要切换到其他批次
						if (batchToDel.isCurrent) {
							vm.batchList[0].isCurrent = true;
							vm.batchId = vm.batchList[0].id;
						}

						window.localStorage.setItem('composition-batches', JSON.stringify(vm.batchList));
					} catch (error) {
						
					}
				});
			});

		},
		handleClearAllImages: async function () {
			const batchId = this.batchId;
			this.$confirm('此操作将永久删除该批次下的所有图片, 是否继续?', '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning'
			}).then(async () => {
				// const response = await axios.post('/api/production/composition/images/delete', {batch_id: batchId});
				// this.pages = [[{pos_x: 0, pos_y: 0, height: 0, images: []}]];
				// clearCompositionImageCache(batchId);
				this.images = [];
				imageStore.clear();
				this.newpages = [{}];
				this.$message({type: 'success', message: '删除成功!'});
			}).catch(() => {});
		},
		handleShapeChange:async function (index, shape) {
			const selected = JSON.parse( JSON.stringify( this.preshapes[shape.shape_id] ) );
			shape = Object.assign({}, shape, selected, {shape_id: selected.id, id: shape.id});
			delete shape.id;
			this.shapes.splice(index, 1, shape);
		},
		handleGoToSkuDetail: async function (skuCode) {
			const url = '/factory/index.html?_path_=view/sku/detail.html?code=' + skuCode;
			window.open(url, '_blank');
		},
    }
});

async function downloadCanvas(batchId, index, max, callback) {
	const ctx = CANVAS.getContext('2d');
	ctx.fillStyle = '#FFFFFF';
	ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
	
	const imageDomArray = document.querySelectorAll('.image-' + index);
	for(const imageDom of imageDomArray) {
		const imageData = JSON.parse(imageDom.getAttribute("data-json"));
		ctx.drawImage(imageDom, (imageData.pos_x + 40) * CANVAS_RATIO, (imageData.pos_y + 40) * CANVAS_RATIO, imageData.width * CANVAS_RATIO, imageData.height * CANVAS_RATIO);
	}

	const title = '排版-' + batchId + '-' + (index + 1);
	CANVAS.convertToBlob({type:'image/png', quality: 1}).then(function(blob) {
		saveAs(blob, title + ".png");
		if (index >= max) return callback && callback();
		
		downloadCanvas(batchId, index+1, max, callback);
	});
}

async function exportToImage(batchId, pageIndex, max, type='image/png', callback = null) {
	const index = pageIndex;
	const ctx = CANVAS.getContext('2d');
	ctx.fillStyle = '#FFFFFF';
	ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
	
	const imageDomArray = document.querySelectorAll('.image-item[data-page-index="' + pageIndex + '"');
	// 空白页面不需要下载
	if(imageDomArray.length == 0) return true;
	
	for(const imageDom of imageDomArray) {
		// const imageData = JSON.parse(imageDom.getAttribute("data-json"));
		ctx.drawImage(imageDom, (imageDom.offsetLeft + 30) * CANVAS_RATIO, (imageDom.offsetTop + 30) * CANVAS_RATIO, imageDom.offsetWidth * CANVAS_RATIO, imageDom.offsetHeight * CANVAS_RATIO);
	}

	var title = '排版-' + batchId + '-' + (index + 1);
	title += {'image/png': '.png', 'image/tiff': '.tiff'}[type];
	CANVAS.convertToBlob({type:type, quality: 1}).then(function(blob) {
		saveAs(blob, title);
		if (index >= max) return callback && callback();
		
		// 短时间启动多个下载任务可能导致下载失败，这里增加一个时间间隔
		setTimeout(() => {
			exportToImage(batchId, index+1, max, callback);
		}, 1000);
	});
}

async function exportToPng(batchId, pageIndex, max, callback = null) {
	exportToImage(batchId, pageIndex, max, 'image/png', callback);
}

async function exportToTiff(batchId, pageIndex, max, callback = null) {
	exportToImage(batchId, pageIndex, max, 'image/tiff', callback);
}

async function clearExpiredImages() {
	const expiredIn = 7*24*3600*1000;
	const endTime = Date.now() - expiredIn;
	db.transaction('rw', imageTable, () => {
		imageTable.where('modifyTime').belowOrEqual(endTime).delete().then(function(){}).catch(error => {
			console.log('error: ', error);
		});
	});
	
	db.transaction('rw', batchTable, () => {
		batchTable.where('insertTime').belowOrEqual(endTime).delete().then(function(){}).catch(error => {
			console.log('error: ', error);
		});
	});
}

function refreshBatchPages(vm) {
	new PageRefresher(vm, vm.curBatchId).run();
}

// --------------------------------------------------------------------------------
// 图片排列布局
// --------------------------------------------------------------------------------
function PageRefresher(vm, batchId) {
	this.batchId = batchId;
	this.db = db;
	this.imagesDB = imageTable;
	this.pages = new Array();
	this.rows = new Array();
	this.marginTop = 40;
	this.marginLeft = 40;
	this.pageWidth = 2480 - this.marginLeft * 2;
	this.pageHeight = 3507 - this.marginTop * 2;
	this.curPage = [];
	this.curRow = {};
	
	if (typeof PageRefresher._initialized == "undefined") {
		PageRefresher.prototype.run = function() {
			let _this = this;
			_this.imagesDB.where('batchId').equals(_this.batchId).toArray(docs => {
        		if (docs === undefined) return true;
        		docs.sort(function (a, b) {
					// 相同sku的图片排在一起
					return parseInt(a.sku) - parseInt(b.sku);
        		}).sort(function (a, b) {
					// 相同形状的图片排在一起，一定要在前面的排序结束之后执行
					return parseInt(b.height) - parseInt(a.height);
				});

				_this.images = docs;
				_this.refresh();

			}).catch(function (event) {
				// 如果数据为空，event包含以下字段：
				// inner: null
				// message: "Tableimages not part of transaction"
				// name: "NotFoundError"
			});
		};

		PageRefresher.prototype.refresh = function(){
			let _this = this;
			if ( _this.pages.length <= 0 ) {
				_this.pages.push(_this.createNewPage());
			}

			_this.curPage = _this.pages[_this.pages.length-1];
			_this.curRow = _this.curPage[_this.curPage.length-1];

			for( var index in _this.images ) {
				let image = _this.images[index];

				// 注意行高变动
				if ( 0 == _this.curRow.height || parseInt(image.height) + parseInt(image.row_span) > _this.curRow.height) {
					// 行高包含当前行所占行间距
					_this.curRow.height = parseInt(image.height) + parseInt(image.row_span);
					_this.isOutPage();
				}
				
				// 如果超出一行，则新建行
				if ( parseInt(image.width) + _this.curRow.inX > _this.pageWidth ) {
					_this.curRow = _this.createNewRow(_this.curRow.posY + _this.curRow.height, image);
					_this.curPage.push(_this.curRow);
					_this.isOutPage();
				}

				// 计算坐标
				image.posX = _this.curRow.inX;
				image.posY = _this.curRow.posY;
				image.pageId = _this.pages.length
				image.rowId = _this.curPage.length;

				// 逐个产品更新
				// _this.imagesDB.update({id: image.id}, image, {}, function(err){});
				_this.imagesDB.where('id').equals(image.id).modify(image).catch(event => {})

				_this.curRow.images.push(image);

				// 移动指针到下一个插入点
				_this.curRow.inX += parseInt(image.width) + parseInt(image.col_span);
			}

			// 这里可以使用.reverse()倒序排列做个倒序排列，让不满一张的页面
			vm.pages = _this.pages;
		}

		PageRefresher.prototype.createNewPage = function(row = null) {
			let _this = this;
			row = row == null ?  _this.createNewRow(): row;
			return new Array(row);
		}

		PageRefresher.prototype.createNewRow = function(posY = 0, image = null) {
			let height = 0;
			let images = new Array();
			if ( null != image ) {
				// 行高 = 图片高度 + 行间距
				height = parseInt(image.height) + parseInt(image.row_span);
				images.push(image);
			}
			
			return {inX: 0, posY: posY, height:height, images:images};
		}

		PageRefresher.prototype.isOutPage = function() {
			let _this = this;
			// 因为最后一行的行间距和页保留边距可以重叠，所以此处不需要讲行间距计入
			if ( _this.curRow.height + _this.curRow.posY > _this.pageHeight ) {
				// 超出一页，把当前行移动到下一页
				_this.curPage = _this.createNewPage(_this.curPage.pop());
				_this.pages.push(_this.curPage);
				_this.curRow = _this.curPage[_this.curPage.length - 1];
				_this.curRow.posY = 0;
			}
		}

		/**
		 * 将所有图片按照不同形状分组
		 */
		PageRefresher.prototype.splitByShape = function(images) {
			let shapes = {};
			for( index in images ) {
				let image = images[index];
				if ( 'undefined' == typeof(shapes[image.shape_tpl_id]) ) shapes[image.shape_tpl_id] = new Array();
				shapes[image.shape_tpl_id].push(image);
			}
			return shapes;
		};

		PageRefresher.prototype.splitToRows = function(imagesByShape) {
			let rows = [];

			for( shapeIndex in imagesByShape ) {
				if ( imagesByShape[shapeIndex].length <= 0 ) {
					continue;
				}

				let images = imagesByShape[shapeIndex];
				let maxCols = images[0]['shape']['maxCols'];
				for( var i = 0; i < images.length; i += maxCols ) {
					rows.push(images.slice(i, i + maxCols));
				}
			}

			return rows;
		}

		PageRefresher.prototype.combineToPages = function(rows) {
			let pageWidth = 2480, pageHeight = 3507, pageMarginTop = 45, pageMarginBottom = 45, pageMarginLeft = 49;
			let posY = pageMarginTop;
			let pages = new Array();

			for( var index in rows ) {
				// 超出一页
				if ( (posY + rows[index][0]['shape']['height']) > pageHeight - pageMarginBottom ) {
					posY = pageMarginTop;
					pages.push(new Array());
				}
				let lastPage = pages[pages.length - 1];
				lastPage.push(rows[index]);

				posY += rows[index][0].shape.height + rows[index][0].shape.rowSpan;
			}

			return pages;
		}

		PageRefresher._initialized = true;
	}
}

const Page = {
	rows: [],
	from: function (rows) {

	}
};

function splitToRows(images, params = null) {
	const options = Object.assign({
		pageWith: 2480,
		pageLeftMargin: 30,
		pageRightMargin: 30
	}, params);

	// 避免污染外部数据
	// const images = structuredClone(origin);

	const rows = [];
	let row = appendNewRow(rows, {x: options.pageLeftMargin});
	
	for(const image of images) {
		// 检测是否即将发生溢出
		if ( (row.x + image.row_span + image.width) > options.pageWith - options.pageRightMargin ) {
			row = appendNewRow(rows, { x: options.pageLeftMargin });
		}

		image.x = row.x + image.col_span;
		row.images.push(image);

		// 更新行的插入点坐标
		row.x = image.x + image.width;
		if (row.height < image.height + image.row_span) row.height = image.height + image.row_span;
	}

	return rows;
}



const Row = {
	height: 0,
	images: [],
	from: function(images) {
		for( let index in images ) {
			let image = _this.images[index];

			// 注意行高变动
			if ( 0 == _this.curRow.height || parseInt(image.height) + parseInt(image.row_span) > _this.curRow.height) {
				// 行高包含当前行所占行间距
				_this.curRow.height = parseInt(image.height) + parseInt(image.row_span);
				_this.isOutPage();
			}
			
			// 如果超出一行，则新建行
			if ( parseInt(image.width) + _this.curRow.inX > _this.pageWidth ) {
				_this.curRow = _this.createNewRow(_this.curRow.posY + _this.curRow.height, image);
				_this.curPage.push(_this.curRow);
				_this.isOutPage();
			}

			// 计算坐标
			image.posX = _this.curRow.inX;
			image.posY = _this.curRow.posY;
			image.pageId = _this.pages.length
			image.rowId = _this.curPage.length;

			// 逐个产品更新
			// _this.imagesDB.update({id: image.id}, image, {}, function(err){});
			_this.imagesDB.where('id').equals(image.id).modify(image).catch(event => {})

			_this.curRow.images.push(image);

			// 移动指针到下一个插入点
			_this.curRow.inX += parseInt(image.width) + parseInt(image.col_span);
		}
	}
};

/**
 * 获取当前完整日期字符串
 * 
 * @returns 返回示例："20190725"
 */
function getFullDate () {
	const today = new Date();
	return today.getFullYear() + (today.getMonth() + 1 + '').padStart(2, 0) + (today.getDate() + '').padStart(2, 0);
}

/**
 * 根据给定的模版生成新的图片路径
 * 
 * @param {string} tpl 路径模版，例：/12/1201/120126/01-a.png
 * @param {string} subCode 子sku的后2位数字，例：02
 * @return {string} 新的路径，例：/12/1201/120126/02-a.png
 */
function renderShapeImagePath(tpl, subCode) {
	// (.*)：贪婪模式，一直寻找直到最后
	// \d{2}：2个数字组成的组合
	return tpl.replace(/(.*)\d{2}/, '$1' + subCode);
}



function getTestData(count) {
	const testitem = {
		"id": 47194,
		"batch_id": "202303061629",
		"sku_id": "41400101",
		"shape_tpl_id": 3,
		"sort": 5,
		"image_url": "/assets/images/4/1/4/01.png",
		"shape_type": "CIRCLE",
		"width": 212,
		"height": 212,
		"row_span": 30,
		"col_span": 30,
		"max_rows": 14,
		"max_cols": 10,
		"created_at": "2023-03-09T06:24:18.000000Z",
		"updated_at": "2023-03-11T08:56:48.000000Z",
		"deleted_at": null,
		"row_id": 0,
		"page_id": 1,
		"pos_x": 0,
		"pos_y": 0
	};
	
	const testdata = [];
	for(let index = 0; index < count; index++) {
		testdata.push(JSON.parse(JSON.stringify(testitem)));
	}
	return testdata;
}



function compose(pageIndex = 0, options) {
	const defaultOptions = {
		parentNodeIdPrefix: 'page-item-wrapper-',
		childNodeClass: 'image-item',
		margin: 30,
		minCountOfPage: 0
	};
	options = Object.assign({}, defaultOptions, options);

	let parent = document.getElementById(options.parentNodeIdPrefix + pageIndex);
	let children = parent.querySelectorAll('.' + options.childNodeClass);
	let length = children.length;

	// 目前一页至少要有30个以上的图案才会出现溢出，所以这里直接跳过了前面30个，减少计算量
	for(let index = options.minCountOfPage; index < length; index++) {
		let child = children[index];

		if (!isChildOverflow(parent, child, options.margin)) continue;

		let domIndex = parseInt(child.dataset.index);

		vm.newpages[pageIndex + 1] = vm.newpages[pageIndex].splice(domIndex);
		vm.$forceUpdate();

		// 监测到对应的 parent 节点才认为是页面完成了渲染
		// 使用 interval 代替 vm.$nextTick，因为页面会出现多次渲染， nextTick会多次调用。
		let interval = setInterval(() => {
			if ( document.getElementById(options.parentNodeIdPrefix + (pageIndex+1)) ) {
				clearInterval(interval);
				compose(pageIndex+1);
			}
		}, 1);

		break;
	}
}

/**
 * 检查子节点是否溢出
 * 
 * @param HTMLElement parent 父元素
 * @param HTMLElement child 子元素
 * @param Number margin 页边距
 * @returns 
 */
function isChildOverflow (parent, child, margin = 30) {
	return child.offsetTop + child.offsetHeight > parent.offsetHeight - margin;
}

function clone(origin) {
	return JSON.parse(JSON.stringify(origin));
}

})(window);