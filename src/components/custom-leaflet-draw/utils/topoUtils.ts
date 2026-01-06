import { featureCollection, flattenEach, union, polygon } from "@turf/turf";
import splitPolygon from "../topo/turf-polygon-split";
import type { ReshapeOptions, TopoClipResult, TopoReshapeFeatureResult } from "../types";
import { reshapeLineByLine, reshapeMultiPolygonByLine, reshapePolygonByLine } from "../topo/turf-reshape-feature";

/** 保存裁剪后的图层
 *
 * @param {Feature<any>} lineFeature 绘制的线Feature
 * @param {L.GeoJSON[]} selLayers 用户选择的图层数组
 * @return {Object} 返回对象{clipsPolygons, waitingDelLayer}
 */
export function clipSelectedLayersByLine(
    lineFeature: GeoJSON.Feature<any>,
    selLayers: L.GeoJSON[]
): TopoClipResult {

    const waitingDelLayer: L.Layer[] = [];
    const clipsPolygons: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[] = [];

    selLayers.forEach((layer: L.GeoJSON) => {
        const geoData = layer.toGeoJSON();
        let layerHasResult = false;

        // 使用Turf的遍历方法来处理所有几何体
        flattenEach(geoData, (currentFeature: any) => {
            try {
                // 只处理多边形
                if (currentFeature.geometry.type !== 'Polygon' &&
                    currentFeature.geometry.type !== 'MultiPolygon') {
                    return;
                }

                const feature = currentFeature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;

                // 执行分割
                const result = splitPolygon(feature, lineFeature);

                if (result && result.length > 0) {
                    clipsPolygons.push(...result);
                    layerHasResult = true;
                }
            } catch (error) {
                console.warn('裁剪失败:', error);
                // 出错时保留原特征
                clipsPolygons.push(currentFeature);
                layerHasResult = true;
            }
        });

        // 如果该图层有被成功处理的部分，标记为待删除
        if (layerHasResult && !waitingDelLayer.includes(layer)) {
            waitingDelLayer.push(layer);
        }
    });

    return { clipedGeoms: clipsPolygons, doClipLayers: waitingDelLayer };
}

/** 合并多边形
 * 
 * @param selLayers 
 */
export function mergePolygon(selLayers: any): GeoJSON.Feature | null {
    let unionGeom: GeoJSON.Feature | null = null; // 合并后的新的图层信息也传入了
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
    // console.log('unionGeom', unionGeom);
    return unionGeom;
}

/** 返回整形要素工具处理后的结果和参与裁剪的要素数组
 * 
 *
 * @export
 * @param {GeoJSON.Feature<any>} lineFeature
 * @param {L.GeoJSON[]} selLayers
 * @return {*}  {TopoReshapeFeatureResult}
 */
export function reshapeSelectedLayersByLine(
    sketchLine: GeoJSON.Feature<any>,
    selLayers: L.GeoJSON[],
    map: L.Map,
    options: ReshapeOptions = { chooseStrategy: 'auto', AllowReshapingWithoutSelection: false }
): TopoReshapeFeatureResult {
    const waitingDelLayer: L.Layer[] = [];
    const results: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon | GeoJSON.LineString>[] = [];
    selLayers.forEach((layer: L.GeoJSON) => {

        const geojsonFeatureCollection = layer.toGeoJSON() as GeoJSON.FeatureCollection<any>;
        const geojson = geojsonFeatureCollection.features[0];
        const type = geojson.geometry.type;
        switch (type) {
            case 'LineString':
                const lineResult = reshapeLineByLine(geojson as GeoJSON.Feature<GeoJSON.LineString>, sketchLine, map, options);
                console.log('lineResult', lineResult);

                if (lineResult)
                    results.push(...lineResult);
                break;
            case 'Polygon':
                const polyResult = reshapePolygonByLine(geojson as GeoJSON.Feature<GeoJSON.Polygon>, sketchLine, map, options);
                console.log('polyResult', polyResult);

                if (polyResult)
                    results.push(...polyResult);
                break;
            case 'MultiPolygon':
                const MultiPolyResult = reshapeMultiPolygonByLine(geojson as GeoJSON.Feature<GeoJSON.MultiPolygon>, sketchLine, map, options);
                if (MultiPolyResult)
                    results.push(...MultiPolyResult);
                break;
            default:
                console.warn(`不支持的图层类型: ${type}`);
                break;
        }

    });
    console.log('results', results);

    return { doReshapeLayers: waitingDelLayer, reshapedGeoms: results };
}

/** （topo行为合并时，将距离过近，但不挨着的点视为误差，直接认定为同一个点）归一化 GeoJSON 数据中的所有坐标，保留指定小数位
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
