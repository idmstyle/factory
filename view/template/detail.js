(async(window) => {

/**
 * 从 URL 的查询字符串中获取相册 id
 * 
 * @returns string
 */
function getTemplateIdFromSearchParams() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || '';
}

const vm = new Vue({
	el: '#app',
    delimiters: ['<{', '}>'],
	data: {
        tpl: {name: '演示信息，无需编辑', image_url: '演示信息，无需编辑'},
		tplId: '',
		shapes: [],
	},
	mounted: async function () {
		const tplId = this.tplId = getTemplateIdFromSearchParams();

		const shapeService = new ShapeService();
		const shapes = await shapeService.findAll({});
		const preshapes = {};
		for(let shape of shapes) preshapes[shape._id] = shape;
		this.preshapes = preshapes;

		const templateService = new TemplateService();
		const tpl = await templateService.findById(tplId);
		this.tpl = tpl;

		const tplShapeService = new TemplateShapeService();
		const selector = {sku_tpl_id: tplId};
		const tplShapes = await tplShapeService.findAll({selector: selector});
		tplShapes.push(this.getEmptyShape());
		this.shapes = tplShapes;
	},
	methods: {
		getEmptyShape: function () {
			const vm = this;
			return {_id: null, sku_tpl_id: vm.tpl._id, tpl_id: vm.tpl._id, sku_tpl_code: vm.tpl._id, shape_tpl_id: null, width: 0, height: 0}
		},
		// 修改了shape属性
		handleShapeChange: async function(index, shape) {
			const isNew = !!shape._id ? false : true;

			const selected = JSON.parse(JSON.stringify(this.preshapes[shape.shape_tpl_id]));
			selected.shape_tpl_id = selected._id;
			delete selected._id;
			delete selected._rev;
			
			shape = Object.assign({}, shape, selected, {sku_tpl_id: this.tplId});

			const tplShapeService = new TemplateShapeService();
			const result = isNew
				? await tplShapeService.create(shape)
				: await tplShapeService.update(shape);
			if (!result.ok) {
				this.$message.error('保存失败，请刷新页面后重试');
				return ;	
			}

			shape._id = result.id;
			shape._rev = result.rev;
			this.shapes.splice(index, 1, shape);

			// 如果是列表最后一项空白项，则需要补充一个新的空白项
			if (index === this.shapes.length - 1) this.shapes.push(this.getEmptyShape());
			this.$message({message: '更新成功', type: 'success'});
		},

		// 重置某一个shape项，相当于删除功能
		handleRemoveShape: async function(index, shape) {
			// 空白项，无需执行任何动作
			if (shape.width == 0 || shape.height == 0) return ;
			// 可能由于程序出现错误而未成功保存的项目，可以直接移除
			if (!shape._id) return this.shapes.splice(index, 1, this.getEmptyShape());

			const tplShapeService = new TemplateShapeService();
			const result = await tplShapeService.destory(shape);

			if (!result.ok) {
				this.$message.error('保存出错，请刷新页面后重试');
				return ;
			}
			
			if (index < this.shapes.length - 1) {
				// 重置的不是列表中最后一项，直接删除就行了
				this.shapes.splice(index, 1);
			} else {
				// 重置的是列表中最后一项，可以使用一个新的空白shape替换
				this.shapes.splice(index, 1, this.getEmptyShape());
			}
			
			this.$message({message:'删除成功', type: 'success'});
		}
	}
});

})(window);