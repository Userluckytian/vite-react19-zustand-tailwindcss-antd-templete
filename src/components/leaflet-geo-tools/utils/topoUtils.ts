import { flattenEach, union, featureCollection, booleanPointOnLine, lineString } from "@turf/turf";
import splitPolygon from "../topo/turf-polygon-split";
import { reshapeLineByLine, reshapePolygonByLine, reshapeMultiPolygonByLine } from "../topo/turf-reshape-feature";
import type { TopoClipResult, ReshapeOptions, TopoReshapeFeatureResult } from "../types";



/** 保存裁剪后的图层
 *
 * @param {Feature<any>} lineFeature 绘制的线Feature
 * @param {L.GeoJSON[]} selLayers 用户选择的图层数组
 * @return {Object} 返回对象{clipsPolygons, waitingDelLayer}
 */
export function clipSelectedLayersByLine(
    lineFeature: GeoJSON.Feature<any>,
    selLayers: L.GeoJSON[],
    precision?: number | false
): TopoClipResult {

    const waitingDelLayer: L.Layer[] = [];
    const clipsPolygons: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[] = [];

    selLayers.forEach((layer: L.GeoJSON) => {
        const geoData = layer.toGeoJSON(precision);
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
export function mergePolygon(selLayers: any, precision?: number | false): GeoJSON.Feature | null {
    let unionGeom: GeoJSON.Feature | null = null; // 合并后的新的图层信息也传入了
    selLayers.forEach((layer: any, idx: number) => {
        // 这块的逻辑就是：遍历到第一个面时，由于只有一个面，所以没法做合并操作，必须是遍历到第二个面才开始操作。
        if (idx === 1) {
            const polygon1 = selLayers[0]?.toGeoJSON(precision);
            const polygon2 = selLayers[1]?.toGeoJSON(precision);
            const p1Normalized = normalizeGeoJSONCoordinates(polygon1.features[0]);
            const p2Normalized = normalizeGeoJSONCoordinates(polygon2.features[0]);
            unionGeom = union(featureCollection([p1Normalized, p2Normalized]));
        }
        if (idx > 1) {
            const polygon = layer?.toGeoJSON(precision);
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
    options: ReshapeOptions = { chooseStrategy: 'auto', AllowReshapingWithoutSelection: false },
    precision?: number | false
): TopoReshapeFeatureResult {
    const waitingDelLayer: L.Layer[] = [];
    const results: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon | GeoJSON.LineString>[] = [];
    selLayers.forEach((layer: L.GeoJSON) => {

        const geojsonFeatureInfo = layer.toGeoJSON(precision) as GeoJSON.FeatureCollection<any> | GeoJSON.Feature<any>;
        /*  排查了一下：
            若是先选择再进行重塑时，选择的图层高亮黄色，其geojsonFeatureInfo.type为'FeatureCollection'
            若是无选择重塑，geojsonFeatureInfo.type为'Feature'
            另外，我每次都是处理一个面，所以FeatureCollection的Feature的数量一定是1个。
         */
        let geojson = null;
        if (geojsonFeatureInfo.type === 'FeatureCollection') {
            geojson = geojsonFeatureInfo.features[0];
        } else {
            geojson = geojsonFeatureInfo;
        }

        const type = geojson.geometry.type;
        switch (type) {
            case 'LineString':
                const lineResult = reshapeLineByLine(geojson as GeoJSON.Feature<GeoJSON.LineString>, sketchLine, options);
                // console.log('lineResult', lineResult);

                if (lineResult)
                    results.push(...lineResult);
                break;
            case 'Polygon':
                const polyResult = reshapePolygonByLine(geojson as GeoJSON.Feature<GeoJSON.Polygon>, sketchLine, options);
                // console.log('polyResult', polyResult);

                if (polyResult)
                    results.push(...polyResult);
                break;
            case 'MultiPolygon':
                const MultiPolyResult = reshapeMultiPolygonByLine(geojson as GeoJSON.Feature<GeoJSON.MultiPolygon>, sketchLine, options);
                if (MultiPolyResult)
                    results.push(...MultiPolyResult);
                break;
            default:
                console.warn(`不支持的图层类型: ${type}`);
                break;
        }

    });
    // console.log('results', results);

    return { doReshapeLayers: waitingDelLayer, reshapedGeoms: results };
}

/** （topo行为合并时，将距离过近，但不挨着的点视为误差，直接认定为同一个点）归一化 GeoJSON 数据中的所有坐标，保留指定小数位
 * 支持 FeatureCollection、Feature、Geometry 对象
 */
function normalizeGeoJSONCoordinates(geojson: any, precision = 6): any {
    // const round = (num: number) => parseFloat(num.toFixed(precision));
    const round1 = (num: number) => num;

    const normalizeRing = (ring: number[][]) =>
        ring.map(([lng, lat]) => [round1(lng), round1(lat)]);

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


/**
 * 判断点是否在线上（支持 LineString 和 MultiLineString）
 * @param pointGeoJSON 点 GeoJSON
 * @param lineGeoJSON 线 GeoJSON（LineString 或 MultiLineString）
 * @returns 是否在线上
 */
export function isPointOnLine(pointGeoJSON: any, lineGeoJSON: any): boolean {
    const geometryType = lineGeoJSON.geometry.type;
    
    if (geometryType === 'LineString') {
        const turfLine = lineString(lineGeoJSON.geometry.coordinates);
        return booleanPointOnLine(pointGeoJSON, turfLine);
    }
    
    if (geometryType === 'MultiLineString') {
        const multiLines = lineGeoJSON.geometry.coordinates;
        
        // 遍历每条线
        for (const lineCoords of multiLines) {
            const turfLine = lineString(lineCoords);
            if (booleanPointOnLine(pointGeoJSON, turfLine)) {
                return true;
            }
        }
        return false;
    }
    
    console.warn('不支持的几何类型:', geometryType);
    return false;
}



/** 点是否在圆内
 *
 *
 * @export
 * @param {L.LatLng} point
 * @param {L.Circle} layer
 * @return {*} 
 */
export function isPointClickInCircle(point: L.LatLng, layer: L.Circle) {
    const center = layer.getLatLng();
    const radius = layer.getRadius();

    // 计算两点距离（单位：米）
    const distance = center.distanceTo(point);

    return distance <= radius;
}