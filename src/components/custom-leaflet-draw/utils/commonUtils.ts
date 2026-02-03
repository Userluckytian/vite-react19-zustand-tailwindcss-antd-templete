/* 存放工具函数
* 函数: 
* 1. 用户传入地图对象
*/

import * as L from 'leaflet';
import { feature as turfFeature, booleanIntersects } from '@turf/turf';

/** 查询点击位置处的图层
 * 优点：不依赖外部库，纯 Leaflet 实现（优化版本，见queryLayersIntersectingGeometry，可读性强，但依赖@turf/turf库）
 *
 * @export
 * @param {L.Map} map 地图实例
 * @param {L.LeafletMouseEvent} e 点击事件回调参数e
 * @return {*} 
 */
export function queryLayerOnClick(map: L.Map, e: L.LeafletMouseEvent) {
    let selectSize = L.point([4, 4]);
    const centerPoint = map.project(e.latlng);
    let selectBounds = L.latLngBounds(
        map.unproject([
            centerPoint.x + selectSize.x / 2,
            centerPoint.y - selectSize.y / 2,
        ]),
        map.unproject([
            centerPoint.x - selectSize.x / 2,
            centerPoint.y + selectSize.y / 2,
        ])
    );
    let selectBoundsCoords: any =
        L.rectangle(selectBounds).toGeoJSON().geometry.coordinates[0];
    let selectList: any[] = [];
    map.eachLayer((layer: any) => {
        if (!layer.toGeoJSON) {
            return;
        }
        let feature = layer.toGeoJSON();
        if (feature.type === "FeatureCollection") {
            return;
        }
        let coords = feature.geometry.coordinates;
        let i = 0;
        let intersects = false;
        switch (feature.geometry.type) {
            case "Point":
                coords = [coords];
                if (layer._mRadius) {
                    let cpt = L.latLng([coords[0][1], coords[0][0]]);
                    let mcpt = map.project(cpt);
                    //圆
                    let circlerect = L.latLngBounds(
                        map.unproject([
                            mcpt.x + layer._mRadius / 2,
                            mcpt.y - layer._mRadius / 2,
                        ]),
                        map.unproject([
                            mcpt.x - layer._mRadius / 2,
                            mcpt.y + layer._mRadius / 2,
                        ])
                    );
                    if (selectBounds.intersects(circlerect)) {
                        intersects = true;
                    }
                    break;
                }
            // fall through
            case "MultiPoint":
                for (i = 0; i < coords.length; i++) {
                    if (selectBounds.contains(L.latLng([coords[i][1], coords[i][0]]))) {
                        intersects = true;
                    }
                }
                break;
            case "LineString":
                coords = [coords];
            // fall through
            case "MultiLineString":
                for (i = 0; i < coords.length; i++) {
                    if (
                        selectBounds.intersects(layer.getBounds()) &&
                        lineStringsIntersect(selectBoundsCoords, coords[i])
                    ) {
                        intersects = true;
                    }
                }
                break;
            case "Polygon":
                coords = [coords];
            // fall through
            case "MultiPolygon":
                for (i = 0; i < coords.length; i++) {
                    if (
                        selectBounds.intersects(layer.getBounds()) &&
                        pointInPolygon(e.latlng.lng, e.latlng.lat, coords[i][0])
                    ) {
                        intersects = true;
                    }
                }
                break;
            default:
                break;
        }
        if (intersects) {
            selectList.push(layer);
            //this._handleIntersection(layer);
        }
    });
    return selectList
}

/**
 * 查询与给定几何（线或面）相交的图层
 * @param map 地图实例
 * @param geometry 用户绘制的线或面（GeoJSON Feature 或 Leaflet 图层）
 * @returns 与之相交的图层数组
 */
export function queryLayersIntersectingGeometry(
    map: L.Map,
    geometry: GeoJSON.Feature | L.Polyline | L.Polygon
): any[] {
    const selectList: any[] = [];

    // 转换为标准 GeoJSON Feature
    const inputFeature: GeoJSON.Feature =
        geometry instanceof L.Polyline || geometry instanceof L.Polygon
            ? geometry.toGeoJSON() as any
            : geometry;

    map.eachLayer((layer: any) => {
        if (!layer.toGeoJSON) return;

        const feature = layer.toGeoJSON();
        if (feature.type === 'FeatureCollection') return;

        const layerFeature = turfFeature(feature.geometry);

        // 判断是否相交
        if (booleanIntersects(inputFeature, layerFeature)) {
            selectList.push(layer);
        }
    });

    return selectList;
}


/** 动态生成marker图标(天地图应该是构建的点图层+marker图层两个)
 *
 *
 * @private
 * @param {string} [iconStyle="border-radius: 50%;background: #ffffff;border: solid 3px red;"]
 * @param {L.PointExpression} [iconSize=[20, 20]]
 * @param {L.DivIconOptions} [options]
 * @return {*}  {L.DivIcon}
 * @memberof LeafletEditPolygon
 */
export function buildMarkerIcon(iconStyle = "border-radius: 50%;background: #ffffff;border: solid 3px red;", iconSize: number[] = [20, 20], options?: L.DivIconOptions): L.DivIcon {
    let defaultIconStyle = `width:${iconSize[0]}px; height: ${iconSize[1]}px;`
    return L.divIcon({
        className: 'edit-polygon-marker',
        html: `<div style="${iconStyle + defaultIconStyle}"></div>`,
        iconSize: iconSize as L.PointExpression,
        ...options
    });
}


// #region 不需要暴露出去的函数集合

function lineStringsIntersect(c1: number[][], c2: number[][]) {
    for (let i = 0; i <= c1.length - 2; ++i) {
        for (let j = 0; j <= c2.length - 2; ++j) {
            let a1 = {
                x: c1[i][1],
                y: c1[i][0],
            };
            let a2 = {
                x: c1[i + 1][1],
                y: c1[i + 1][0],
            };
            let b1 = {
                x: c2[j][1],
                y: c2[j][0],
            };
            let b2 = {
                x: c2[j + 1][1],
                y: c2[j + 1][0],
            };
            let ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
            let ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
            let u_b = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);
            if (u_b !== 0) {
                let ua = ua_t / u_b;
                let ub = ub_t / u_b;
                if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
                    return true;
                }
            }
        }
    }
    return false;
}
// Adapted from http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html#Listing the Vertices
function pointInPolygon(x: number, y: number, polyCoords: number[][]) {
    let inside = false;
    let intersects = false;
    let i = 0;
    let j = 0;
    for (i = 0, j = polyCoords.length - 1; i < polyCoords.length; j = i++) {
        var xi = polyCoords[i][0],
            yi = polyCoords[i][1];
        var xj = polyCoords[j][0],
            yj = polyCoords[j][1];
        intersects =
            yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersects) {
            inside = !inside;
        }
    }
    return inside;
}
// #endregion
