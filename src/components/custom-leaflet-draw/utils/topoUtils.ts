import { featureCollection, union } from "@turf/turf";
import splitPolygon from "../topo/turf-polygon-split";

/** 保存裁剪后的图层
 *
 *
 * @param {*} lineFeature 绘制的线Feature 格式：{type: "Feature", properties: {…}, geometry: { coordinates: [ [111, 80], [120, 80], [120, 90], [111, 90] ], type: "LineString" }}
 * @param {*} selLayers  用户选择的图层
 * @return {*} 返回对象{clipsPolygons,  waitingDelLayer}，其中clipsPolygons为裁剪后的多边形，waitingDelLayer为需要删除的旧图层
 */
export function clipSelectedLayersByLine(lineFeature: any, selLayers: any) {
    // 遍历选择的图层，将每个面都和线做切割，获取全部裁剪后的面
    const waitingDelLayer: any[] = [];
    const clipsPolygons: any[] = [];
    selLayers.forEach((layer: any) => {
        const geoData = layer.toGeoJSON();
        geoData.features.forEach((feature: any) => {
            // TODO: 多面的逻辑（这里可能需要调整，也需要处理内环面）, 现在的逻辑，强制改为单个面，取外环面
            if (feature.geometry.type === 'MultiPolygon') {
                feature.geometry.coordinates = [feature.geometry.coordinates[0]]; // 只取外环面
            }
            feature.geometry.type = 'Polygon';
            const result = splitPolygon(feature, lineFeature);
            if (result) {
                clipsPolygons.push(...result);
                waitingDelLayer.push(layer);
            }
        });
    });
    return { clipsPolygons, waitingDelLayer }
    // // tip: 三和四有隐患，比如：新的添加失败，旧的删除成功，或者新的添加成功，旧的删除失败，这块可以优化下
    // // 第三步： 添加新的图层上图，存储
    // // console.log('clipsPolygons', clipsPolygons);
    // clipsPolygons.forEach((polyFeature: any) => {
    //     if (polyFeature.geometry.type === 'MultiPolygon') {
    //         const splitPolygons = splitPolygonFromMultiPolygon(polyFeature.geometry)
    //         splitPolygons.forEach((polygonFeature: any) => {
    //             // saveSampleDataToProject(polygonFeature)
    //         });
    //     } else {
    //         // saveSampleDataToProject(polyFeature)
    //     }
    // });
    // // 第三步： 删除之前的要素
    // // console.log('waitingDelFeatureIDs', waitingDelFeatures);
    // waitingDelFeatures.forEach((polyFeature: any) => {
    //     delSampleDataFromProject(polyFeature)
    // });
}

/** 合并多边形
 * 
 * @param selLayers 
 */
export function mergePolygon(selLayers: any) {
    let unionGeom: any = null; // 合并后的新的图层信息也传入了
    selLayers.forEach((layer: any, idx: number) => {
        // 这块的逻辑就是：遍历到第一个面时，由于只有一个面，所以没法做合并操作，必须是遍历到第二个面才开始操作。
        if (idx === 1) {
            const polygon1 = selLayers[0]?.toGeoJSON();
            const polygon2 = selLayers[1]?.toGeoJSON();
            const p1Normalized = normalizeGeoJSONCoordinates(polygon1.features[0]);
            const p2Normalized = normalizeGeoJSONCoordinates(polygon2.features[0]);
            unionGeom = union(featureCollection([p1Normalized, p2Normalized]));
        }
        if (idx > 1) {
            const polygon = layer?.toGeoJSON();
            const befNormalized = normalizeGeoJSONCoordinates(unionGeom);
            const pNormalized = normalizeGeoJSONCoordinates(polygon.features[0]);
            unionGeom = union(featureCollection([befNormalized, pNormalized]));
        }
    });
    console.log('unionGeom', unionGeom);
    return unionGeom;
}

/**
 * 归一化 GeoJSON 数据中的所有坐标，保留指定小数位
 * 支持 FeatureCollection、Feature、Geometry 对象
 */
function normalizeGeoJSONCoordinates(geojson: any, precision = 6): any {
    const round = (num: number) => parseFloat(num.toFixed(precision));

    const normalizeRing = (ring: number[][]) =>
        ring.map(([lng, lat]) => [round(lng), round(lat)]);

    const normalizePolygon = (polygon: number[][][]) =>
        polygon.map(normalizeRing);

    const normalizeGeometry = (geometry: any) => {
        if (!geometry || !geometry.type) return geometry;

        switch (geometry.type) {
            case 'Polygon':
                return {
                    ...geometry,
                    coordinates: normalizePolygon(geometry.coordinates),
                };
            case 'MultiPolygon':
                return {
                    ...geometry,
                    coordinates: geometry.coordinates.map(normalizePolygon),
                };
            default:
                return geometry; // 其他类型暂不处理
        }
    };

    const normalizeFeature = (feature: any) => ({
        ...feature,
        geometry: normalizeGeometry(feature.geometry),
    });

    if (geojson.type === 'FeatureCollection') {
        return {
            ...geojson,
            features: geojson.features.map(normalizeFeature),
        };
    } else if (geojson.type === 'Feature') {
        return normalizeFeature(geojson);
    } else if (geojson.type === 'Polygon' || geojson.type === 'MultiPolygon') {
        return normalizeGeometry(geojson);
    } else {
        return geojson; // 其他类型暂不处理
    }
}
