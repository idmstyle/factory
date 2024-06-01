const AlbumImageService = ((window) => {
    const fs = require('fs');
    const path = require('path');
    const url = require('url');
    
    return class {
        constructor() {
            return this.constructor;
        }
    
        static get defaultCategoryType () {
            return '圆形';
        };
    
        static get albumBaseURL() {
            return 'dms://localhost/storage/album';
        }
    
        static async findAll(options) {
            const selector = options.selector;
            const albumPath = selector.albumPath;
            const albumId = selector.albumId;
            const category = selector.category || '';
    
            return this.scandir(albumPath, albumId, category);
        }
    
        static scandir(dir, albumId, category = '') {
            let images = [];
            if (category && category != this.defaultCategoryType) dir = path.join(dir, category);
            
            // 使用 fs.statSync 检查不存在的目录时，会抛出异常，需要补货异常并返回空数组
            if ( !fs.existsSync(dir) ) return [];
    
            const files = fs.readdirSync(dir);
            
            for (let file of files) {
                const filepath = `${dir}/${file}`;
                const stat = fs.statSync(filepath);
    
                // 文件夹，尝试扫描文件夹中的文件
                if ( stat.isDirectory() ) {
                    const subfiles = this.scandir(dir, albumId, file);
                    images = images.concat(subfiles);
                    continue;
                }
    
                const parsed = path.parse(file);
    
                // 只读取兼容的图片文件
                if ( !this.isImage(parsed.ext) ) continue;
    
                parsed.size = stat.size;
                parsed.category = category || this.defaultCategoryType;
                parsed.album_id = albumId;
                parsed.uri = this.createImageURI(file, albumId, parsed.category);
                parsed.url = this.createImageURL(dir, file);
    
                // delete 的效率要远小于赋值undefined
                parsed.root = undefined;
                parsed.dir = undefined;
    
                images.push(parsed);
            }
    
            return images;
        }
    
        /**
         * 创建图片的链接
         * 
         * @param {string} basename 文件名，比如：01.png
         * @param {string} albumId 相册编号，比如：200
         * @param {string} category 图片类别，比如：20x20心
         * @returns {string} 例：storage/album/564/20x20心/01.png
         */
        static createImageURI(basename, albumId, category) {
            const uri = category == this.defaultCategoryType
                ? `${albumId}/${basename}`
                : `${albumId}/${category}/${basename}`;
            
            return uri;
        }

        /**
         * 创建图片的链接
         * 
         * @param {string} basename 文件名，比如：01.png
         * @param {string} albumId 相册编号，比如：200
         * @param {string} category 图片类别，比如：20x20心
         * @returns {string} 例：storage/album/564/20x20心/01.png
         */
        static createImageURL(dir, basename) {
            return url.pathToFileURL(path.resolve(dir, basename)).href;
        }
    
        /**
         * 通过文件扩展名来简单判断当前文件是否是兼容的图片格式
         * 
         * 当前兼容的图片格式：.png, .jpg, .jpeg, .svg, .gif
         * 
         * @param {string} ext 
         * @returns 
         */
        static isImage(ext) {
            return ['.png', '.jpg', '.jpeg', '.svg', '.gif'].indexOf(ext) !== -1;
        }
    }
})(window);

if (!!module && !!module.exports) module.exports = AlbumImageService;