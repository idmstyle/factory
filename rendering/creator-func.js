function batchCreate(tpls, srcs, options) {
    if( typeof tpls === 'string') return [];

    tpls = JSON.parse(JSON.stringify(tpls));
    srcs = JSON.parse(JSON.stringify(srcs));
    options = JSON.parse(JSON.stringify(options));

    if (tpls.length === 0 || srcs.length === 0) return [];

    let images = [];
    for(let tpl of tpls) {
        for(let tplImage of tpl.images) {
            let sources = getSources(srcs, options.create_model, tplImage.role, tplImage.map_areas.length, tpl.is_mixed);
            let newImages = createImages_H(tpl.code, tplImage, sources, tpl.is_mixed);
            images = images.concat(newImages);
        }
    }

    return images;
}

function createImages_H(tplCode, originalTplImage, originalSources, isMixed = false) {
    // 为避免污染外部数据，函数内部仅使用副本进行操作
    let tplImage = JSON.parse(JSON.stringify(originalTplImage));
    let sources = JSON.parse(JSON.stringify(originalSources));

    let images = [];
    if (tplImage.role == 'OTHER') {
        let source = {width: 1000, height: 1000, left:0, top: 0, rotate: 0, id: `background-${tplCode}-${tplImage.name}`};
        let image = {title: createImageTitle(tplCode, tplImage.name, 1), sources: [source]};
        images.push(image);
        return images;
    }

    let sourceCount = sources.length;
    for(let index = 0; index < sources.length; ) {
        let image = {title: '', 'sources': []};
        if (tplImage.hasOwnProperty('watermark') && tplImage.watermark) {
            // let watermark = area;
            image.sources.push({
                width: 1000,
                height: 1000,
                left: 0, 
                top: 0,
                rotate: 0,
                id: `background-${tplCode}-${tplImage.name}`
            });
        }

        let sourceCode = '';
        for(let map_area of tplImage.map_areas) {
            // 避免直接对 tplImage.map_areas 进行修改
            let area = JSON.parse(JSON.stringify(map_area));

            sourceCode = sources[index]['code'];
            area['id'] = 'source-' + sourceCode;
            image.sources.push(area);

            if (tplImage.hasOwnProperty('watermark') && tplImage.watermark) {
                let watermark = JSON.parse(JSON.stringify(area));
                watermark.id = `watermark-${tplCode}-${tplImage.name}`;
                image.sources.push(watermark);
            }

            if (isMixed === true || isMixed == 'true' || isMixed == '1') {
                index++;
            }
        }

        if (isMixed !== true && isMixed != 'true' && isMixed != '1') index++;

        if (tplImage.hasOwnProperty('foreground') && tplImage.foreground) {
            image.sources.push({
                width: 1000,
                height: 1000,
                left: 0,
                top: 0,
                rotate: 0,
                id: `foreground-${tplCode}-${tplImage.name}`
            });
        }

        let subfix = isMixed === '0' || isMixed === 0 || !isMixed ? sourceCode.slice(0, 2) : parseInt(index / tplImage.map_areas.length);
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

function getSources(sources, createModel, role, mapAreaCount = 1, isMixed = false) {
    if (role == 'OTHER') return [];

    if (isMixed) {
        let count = sources.length % mapAreaCount;
        if (count) {
            // sources = sources.concat(sources, )
            sources = sources.fill(sources[-1], sources.length, mapAreaCount - count);
        }
    } else {
        for(let source of sources) {
            sources = sources.fill(source, sources.length, mapAreaCount)
        }
    }

    if (createModel == 0 && role != 'SKU') sources = sources.slice(0, mapAreaCount);

    return sources;
}

function getTemplates(input = null) {
    return input;
}