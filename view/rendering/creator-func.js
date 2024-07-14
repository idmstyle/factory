function batchCreate(tpls, srcs, options) {

    if( typeof tpls === 'string') return [];

    tpls = clone(tpls);
    srcs = clone(srcs);
    options = clone(options);

    console.log('srcs:', srcs);

    if (tpls.length === 0 || srcs.length === 0) return [];

    let images = [];
    for(let tpl of tpls) {
        for(let tplImage of tpl.images) {
            let sources = getSources(srcs, options.create_model, tplImage.tag, tplImage.prints.length, tpl.isMixed);
            console.log('sources:', sources);
            let newImages = createImages_H(tpl.code, tplImage, sources, tpl.isMixed);
            images = images.concat(newImages);
        }
    }

    return images;
}

function clone(origin) {
    return JSON.parse(JSON.stringify(origin));
}

/**
 * 根据 source 和 image.prints 来生成用于合成的图片列表
 * 
 * @param {*} tplCode 
 * @param {*} originalTplImage 
 * @param {*} originalSources 
 * @param {*} isMixed 
 * @returns 
 */
function createImages_H(tplCode, originalTplImage, originalSources, isMixed = false) {
    // 为避免污染外部数据，函数内部仅使用副本进行操作
    let tplImage = clone(originalTplImage);
    let sources = clone(originalSources);

    let images = [];
    // OTHER 类型的图片无需合成，直接用于下载即可
    if (tplImage.role == 'OTHER') {
        let source = {width: 1000, height: 1000, left:0, top: 0, rotate: 0, id: `background-${tplCode}-${tplImage.name}`};
        let image = {title: createImageTitle(tplCode, tplImage.name, 1), sources: [source]};
        images.push(image);
        return images;
    }

    for(let index = 0; index < sources.length; ) {
        // sources 中保存的是用于合成产品图所使用的图片列表
        let image = {title: '', 'sources': [], 'resources': []};
        // if (tplImage.hasOwnProperty('watermark') && tplImage.watermark) {
        //     // let watermark = area;
        //     image.sources.push({
        //         width: 1000,
        //         height: 1000,
        //         left: 0, 
        //         top: 0,
        //         rotate: 0,
        //         id: `background-${tplCode}-${tplImage.name}`
        //     });
        // }

        let sourceCode = '';
        let prints = typeof tplImage.prints == 'string' ? JSON.parse(tplImage.prints) : tplImage.prints;
        for(let print of prints) {
            // 由于 sources 会被多次使用，这里需要创建一个副本
            let source = Object.assign(clone(sources[index]), print);

            sourceCode = sources[index]['code'];
            image.sources.push(source);

            // if (tplImage.hasOwnProperty('watermark') && tplImage.watermark) {
            //     let watermark = JSON.parse(JSON.stringify(area));
            //     watermark.id = `watermark-${tplCode}-${tplImage.name}`;
            //     image.sources.push(watermark);
            // }

            if (isMixed === true || isMixed == 'true' || isMixed == '1') {
                index++;
            }
        }

        if (isMixed !== true && isMixed != 'true' && isMixed != '1') index++;

        image.sources.push({
            width: 1000,
            height: 1000,
            left: 0,
            top: 0,
            rotate: 0,
            targetId: tplImage.targetId,
        });
        
        // 为 print 添加对应的水印
        for(let print of prints) {
            let watermark = vm.watermarks.find(watermark => watermark.id == print.watermark_id);
            let source = Object.assign(clone(watermark), print);
            image.sources.push(source);
        }

        let subfix = isMixed === '0' || isMixed === 0 || !isMixed ? sourceCode.slice(0, 2) : parseInt(index / tplImage.prints.length);
        image.title = createImageTitle(tplCode, tplImage.name, subfix);
        images.push(image);
    }

    return images;
}

function createImageTitle(tplCode, imageName, index = 0) {
    index = String(index).padStart(2, '0');
    let title = tplCode + index;
    if (imageName.length > 0) title += "-" + imageName;
    return title;
}

function getOptions(input = null) {
    options = {theme_code: '200', create_model: 0, image_size: '8x'};

    if (input !== null) options = Object.assign({}, options, input); 

    return options;
}

function getSources(sources, createModel, tag, printCount = 1, isMixed = false) {
    if (tag == 'OTHER') return [];

    if (isMixed) {
        let count = sources.length % printCount;
        if (count) {
            // sources = sources.concat(sources, )
            sources = sources.fill(sources[-1], sources.length, printCount - count);
        }
    } else {
        for(let source of sources) {
            sources = sources.fill(source, sources.length, printCount)
        }
    }

    if (createModel == 0 && tag != 'SKU') sources = sources.slice(0, printCount);

    console.log('sources:', sources);
    return sources;
}

function getTemplates(input = null) {
    return input;
}