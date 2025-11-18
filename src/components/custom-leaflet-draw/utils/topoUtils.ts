import splitPolygon from "../topo/turf-polygon-split";

/** 保存裁剪后的图层
 *
 *
 * @param {*} lineFeature 绘制的线Feature
 * @param {*} selLayers  用户选择的图层
 */
function saveClipSelectedLayers(lineFeature: any, selLayers: any) {
    // 第一步： 格式化线图层的数据结构，主要是坐标点的结构
    const lineCoords = lineFeature.geometry.coordinates;
    const formatLineCoords: number[][] = [];
    lineCoords.forEach((coord: L.LatLng, idx: number) => {
        const tempCoordArr = [coord.lng, coord.lat];
        // 拒绝重复坐标点
        if (idx === 0 || (formatLineCoords[idx - 1] && formatLineCoords[idx - 1].toString() !== tempCoordArr.toString())) {
            formatLineCoords.push([coord.lng, coord.lat]);
        }
    });
    const newLineFeature: any = {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: formatLineCoords
        }
    }

    // 第二步：遍历选择的图层，将每个面都和线做切割，获取全部裁剪后的面
    const waitingDelFeatures: any[] = [];
    const clipsPolygons: any[] = [];
    selLayers.forEach((layer: any) => {
        const geoData = layer.toGeoJSON();
        geoData.features.forEach((feature: any) => {
            feature.geometry.type = 'Polygon';
            feature.geometry.coordinates = [feature.geometry.coordinates];
            const result = splitPolygon(feature, newLineFeature);
            if (result) {
                clipsPolygons.push(...result);
                waitingDelFeatures.push(layer.options.origin);
            }
        });
    });
    // tip: 三和四有隐患，比如：新的添加失败，旧的删除成功，或者新的添加成功，旧的删除失败，这块可以优化下
    // 第三步： 添加新的图层上图，存储
    // console.log('clipsPolygons', clipsPolygons);
    clipsPolygons.forEach((polyFeature: any) => {
        if (polyFeature.geometry.type === 'MultiPolygon') {
            const splitPolygons = splitPolygonFromMultiPolygon(polyFeature.geometry)
            splitPolygons.forEach((polygonFeature: any) => {
                // saveSampleDataToProject(polygonFeature)
            });
        } else {
            // saveSampleDataToProject(polyFeature)
        }
    });
    // 第三步： 删除之前的要素
    // console.log('waitingDelFeatureIDs', waitingDelFeatures);
    waitingDelFeatures.forEach((polyFeature: any) => {
        delSampleDataFromProject(polyFeature)
    });
}
const splitPolygonFromMultiPolygon = (MultiPolygonGeometry: any) => {

    const allPolgons: any[] = [];
    const coordinatesArr = MultiPolygonGeometry.coordinates;
    coordinatesArr.forEach((coord: any) => {
        const polygonFeature = {
            type: 'Feature',    // 
            geometry: {
                type: 'Polygon',  // 像这些字符串，一定注意大小写问题。其他地方没做防御措施的话，会出错： 比如： if(geometry.type === 'polygon'){}
                coordinates: [coord]
            }
        }
        allPolgons.push(polygonFeature)
    });
    return allPolgons;
}
const delSampleDataFromProject = (feature: any) => {
    // sampleCollectionServices.deleteFeature(feature).then((res) => {
    //     if (res.status === 200) {
    //         // message.success("删除成功");
    //         // 删除成功后，重新查询样本详情
    //         // （2） 发消息，重新查询内容并上图
    //         const msgTalkService = AnnotationTalkService.getInstance();
    //         msgTalkService.sendrefreshListMessage(true);
    //     }
    // });
}