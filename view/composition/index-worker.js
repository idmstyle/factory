const window = self;
self.addEventListener('message', function(event){
    const data = event.data;
	const origin = data.images;
	const options = data.options;

	if (!Array.isArray(origin)) return self.postMessage({success: false, error: 'Wrong Message'});

	const pages = self.Composer(origin);
	self.postMessage({success: true, pages: pages});
});

(function (window) {
	var rows = [], pages = [];
	var config = {
		ratio: 1.0,          // 绘制图像的分辨率
		canvasWidth: 2480,
		canvasHeight: 3507,
	};

	function sort(images) {
		sortyByIndex(images);
		sortBySkuId(images);
		sortBySort(images);
		return images;
	}

	function sortyByIndex(images) {
		images.sort(function(a, b) {
			return b.index - a.index;
		});
		return images;
	}

	function sortBySkuId(images) {
		images.sort(function(a, b) {
			if (a.sku_code == b.sku_code) return 0;
			return a.sku_code > b.sku_code ? 1 : -1;
		});
		return images;
	}

	function sortBySort(images) {
		images.sort(function(a, b) {
			return b.sort - a.sort;
		});
		return images;
	}

	function setRatio(ratio) {
		this.ratio = ratio;
		this.canvasWidth = this.canvasWidth * this.ratio;
		this.canvasHeight = this.canvasHeight * this.ratio;
	}

	function clear() {
		this.rows = [];
		this.pages = [];
	}

	function splitToRows(images, params = null) {
		const options = Object.assign({
			pageWith: 2480,
			pageLeftMargin: 30,
			pageRightMargin: 30
		}, params);
	
		// 避免污染外部数据
		// const images = structuredClone(origin);
	
		const rows = [];
		var rowIndex = 0;
		let row = appendNewRow(rows, {x: options.pageLeftMargin});
		
		for(const image of images) {
			// 检测是否即将发生溢出
			if ( (row.x + image.rowSpan + image.width) > options.pageWith - options.pageRightMargin ) {
				row = appendNewRow(rows, { x: options.pageLeftMargin });
			}
	
			image.x = row.x + image.colSpan;
			image.rowIndex = rowIndex;
			row.images.push(image);
	
			// 更新行的插入点坐标
			row.x = image.x + image.width;
			if (row.height < image.height + image.rowSpan) row.height = image.height + image.rowSpan;
		}
	
		return rows;
	}

	function appendNewRow(rows, params = null) {
		const blank = {
			height: 0,   // 行高
			images: [],  // 行包含的图片数组
			x: 0,        // 行当前插入点的x坐标
			y: 0,
			leftMargin: 30,
			rightMargin: 30
		};
		blank.x = blank.leftMargin;
	
		rows.push( Object.assign({}, blank, params) );
		return rows.at(-1);
	}
	
	function splitToPages(rows, params = null) {
		const options = Object.assign({
			pageHeight: 3508,
			pageTopMargin: 30,
			pageBottomMargin: 30
		}, params);
	
		const pages = [];
		let page = appendNewPage(pages);
		for(const row of rows) {
			if ( page.y + row.height > options.pageHeight - options.pageBottomMargin) {
				page = appendNewPage(pages);
			}
			page.rows.push(row);
			row.y = page.y;
			
			page.y += row.height;
		}
	
		return pages;
	}
	
	function appendNewPage(pages, params = null) {
		const blank = {height: 3508, y: 0, topMargin: 30, bottomMargin: 30, rows: []};
		blank.y = blank.topMargin;
		pages.push( Object.assign({}, blank, params) );
		return pages.at(-1);
	}

	window.Composer = function (images, options = null) {
		images = sort(images);
		rows = splitToRows(images);
		pages = splitToPages(rows);
		return pages;
	};
})(window || self);

const OldComposer = {
	rows:[],
	pages: [],
	ratio: 1.0,          // 绘制图像的分辨率
	canvasWidth: 2480,
	canvasHeight: 3507,
	setRatio: function (ratio) {
		this.ratio = ratio;
		this.canvasWidth = this.canvasWidth * this.ratio;
		this.canvasHeight = this.canvasHeight * this.ratio;
	},
	do: function(images) {
		this.rows = this.splitToRows(images);
		this.pages = this.splitToPages(this.rows);
		return this.pages;
	},
	clear: function () {
		this.rows = [];
		this.pages = [];
	},

	splitToRows: function (images, params = null) {
		const options = Object.assign({
			pageWith: 2480,
			pageLeftMargin: 30,
			pageRightMargin: 30
		}, params);
	
		// 避免污染外部数据
		// const images = structuredClone(origin);
	
		const rows = [];
		let row = this.appendNewRow(rows, {x: options.pageLeftMargin});
		
		for(const image of images) {
			// 检测是否即将发生溢出
			if ( (row.x + image.row_span + image.width) > options.pageWith - options.pageRightMargin ) {
				row = this.appendNewRow(rows, { x: options.pageLeftMargin });
			}
	
			image.x = row.x + image.col_span;
			row.images.push(image);
	
			// 更新行的插入点坐标
			row.x = image.x + image.width;
			if (row.height < image.height + image.row_span) row.height = image.height + image.row_span;
		}
	
		return rows;
	},

	appendNewRow: function(rows, params = null) {
		const blank = {
			height: 0,   // 行高
			images: [],  // 行包含的图片数组
			x: 0,        // 行当前插入点的x坐标
			leftMargin: 30,
			rightMargin: 30
		};
		blank.x = blank.leftMargin;
	
		rows.push( Object.assign({}, blank, params) );
		return rows.at(-1);
	},
	
	splitToPages: function (rows, params = null) {
		const options = Object.assign({
			pageHeight: 3507,
			pageTopMargin: 30,
			pageBottomMargin: 30
		}, params);
	
		const pages = [];
		let page = this.appendNewPage(pages);
		for(const row of rows) {
			if ( page.y + row.height > options.pageHeight - options.pageBottomMargin) {
				page = this.appendNewPage(pages);
			}
			page.rows.push(row);
			page.y += row.height;
		}
	
		return pages;
	},
	
	appendNewPage: function(pages, params = null) {
		const blank = {height: 3507, y: 0, topMargin: 30, bottomMargin: 30, rows: []};
		blank.y = blank.topMargin;
		pages.push( Object.assign({}, blank, params) );
		return pages.at(-1);
	}
	
}