import { lineString, bbox, getCoords, polygon, transformTranslate, booleanValid, kinks, distance, point, bearing } from "@turf/turf";
import { message } from "antd";
import * as L from 'leaflet';
import type { MarkerOptions } from "leaflet";

/** geojson 转leaflet的bounds */
function geojson2LeafletBounds(geom: string | undefined) {
    if (!geom) {
        return null;
    }
    try {
        let feature = L.geoJson(JSON.parse(geom));
        if (feature) {
            return feature.getBounds();
        }
        return null;
    } catch (error: any) {
        throw new Error(error);
    }
}
function addLeafletGeoJsonLayer(map: L.Map, geometry: GeoJSON.GeoJsonObject | GeoJSON.GeoJsonObject[] | null, paneName: string, paneAddIndex: number = 2, options?: L.GeoJSONOptions<any, GeoJSON.Geometry> | null | undefined): L.GeoJSON {
    const OVERLAY_PANE_INDEX = 400;
    const existPane = map.getPane(paneName);
    if (!existPane) {
        const pane = map.createPane(paneName);
        pane.style.zIndex = (OVERLAY_PANE_INDEX + Math.min(paneAddIndex, 100)) + ''; // 要大于overlayPane的层级
    }
    options = { ...options, pane: paneName };
    const geoJsonLayer = L.geoJson(geometry, options);
    return geoJsonLayer;
}
function addLeafletGMarkLayer(map: L.Map, lng: number, lat: number, paneName: string, paneAddIndex: number = 2, options?: MarkerOptions | undefined): L.Marker<any> {
    const MARKER_PANE_INDEX = 600;
    const existPane = map.getPane(paneName);
    if (!existPane) {
        const pane = map.createPane(paneName);
        pane.style.zIndex = (MARKER_PANE_INDEX + Math.min(paneAddIndex, 50)) + ''; // 要大于overlayPane的层级
    }
    options = { ...options, pane: paneName };
    const markerLayer = L.marker([lng, lat], options).addTo(map);
    return markerLayer;
}
function fitBoundsbyMultiGeojsonPoint(mapView: L.Map, data: any[]) {
    const coords: any = [];
    if (data.length) {
        for (const item of data) {
            if (!!Number(item.lat) && !!Number(item.lon)) {
                coords.push([item.lat, item.lon]);
            }
        }
    }
    try {
        if (coords && coords.length > 1) {
            const line = lineString(coords);
            const bboxData = bbox(line);
            const boundsData: any = [
                [bboxData[0], bboxData[1]],
                [bboxData[2], bboxData[3]]
            ];
            mapView && mapView.fitBounds(boundsData, { padding: [20, 20] });
        } else {
            mapView && mapView.flyTo(coords[0], 13, {
                duration: 1, // 动画持续时间（秒）
                easeLinearity: 0.5, // 缓动函数的线性参数
            });
        }
    } catch (error) {
        message.error('存在异常经纬度信息，无法计算地图范围。' + error);
    }
}
/** 绑定编辑事件 https://copilot.microsoft.com/shares/xC26zKbUDXmJFnxJ6mLoQ
 * 1：顶点可以拖动：L.marker({ draggable: true })
 * 2：实时更新面：turf.polygon() + layer.setLatLngs()
 * 3: 校验几何合法性：turf.booleanValid() 或 turf.kinks()
 * 4：支持撤销：记录 coords 快照
 * 5：支持吸附：turf.nearestPoint() 实现对齐
 * 延伸功能：
 * 1：添加“添加点”功能：点击边中点插入新顶点
 * 2：添加“删除点”功能：右键某点删除
 * 3：添加“拖动整个面”功能：用 turf.transformTranslate() 实现整体偏移
 */

function bingGeojsonLayerEditEvent(layer: L.GeoJSON, map: L.Map) {
    //  双击展示点位
    const featuresCollection: any = layer.toGeoJSON();
    console.log('featuresCollection', featuresCollection);
    featuresCollection.features.forEach((feature, featureIndex) => {
        if (feature.geometry.type === 'Polygon') {
            const coords = feature.geometry.coordinates[0]; // 外环
            console.log('layer', layer);

            const leafletLayer = layer.getLayers()[featureIndex] as L.Polygon;
            bindPolygonEditEvents(leafletLayer, coords, map);
        }
    });
}

function bindPolygonEditEvents(layer: L.Polygon, coords: GeoJSON.Position[], map: L.Map) {
    // 拖动点、更新面、校验、撤销、吸附、添加/删除点、整体拖动等逻辑
    const markers: L.Marker[] = [];
    const midMarkers: L.CircleMarker[] = [];
    const historyStack: GeoJSON.Position[][] = [[...coords]];
    // 定义圆形marker图标
    const circleIcon = L.divIcon({
        className: 'custom-circle-icon',
        html: '<div style="width:12px;height:12px;border-radius:50%;background:#3388ff;"></div>',
        iconSize: [12, 12]
    });
    // 渲染顶点为可拖动 marker
    coords.forEach((coord, index) => {

        const marker = L.marker([coord[1], coord[0]], { icon: circleIcon, draggable: true }).addTo(map);
        markers.push(marker);

        marker.on('drag', (e: any) => {
            coords[index] = [e.latlng.lng, e.latlng.lat];

            // 吸附逻辑（可选）
            const snapTarget = getSnapTarget([e.latlng.lng, e.latlng.lat], coords, index);
            if (snapTarget) coords[index] = snapTarget;

            updatePolygon(layer, coords);
        });

        marker.on('dragend', () => {
            historyStack.push([...coords]);
            validatePolygon(coords);
        });

        marker.on('contextmenu', () => {
            if (coords.length > 4) {
                coords.splice(index, 1);
                map.removeLayer(marker);
                updatePolygon(layer, coords);
                historyStack.push([...coords]);
            }
        });
    });

    // 添加点：点击边中点插入新顶点
    coords.forEach((coord, i) => {
        const next = coords[(i + 1) % coords.length];
        const mid = [(coord[0] + next[0]) / 2, (coord[1] + next[1]) / 2];
        const midMarker = L.circleMarker([mid[1], mid[0]], {
            radius: 5,
            color: 'green'
        }).addTo(map);
        midMarkers.push(midMarker);

        midMarker.on('click', () => {
            coords.splice(i + 1, 0, mid);
            updatePolygon(layer, coords);
            historyStack.push([...coords]);
        });
    });

    // 拖动整个面
    // layer.on('mousedown', (e: L.LeafletMouseEvent) => {
    //     map.dragging.disable();
    //     const start: any = e.latlng;

    //     function onMouseMove(ev: L.LeafletMouseEvent) {
    //         const dx = ev.latlng.lng - start.lng;
    //         const dy = ev.latlng.lat - start.lat;
    //         const moved = transformTranslate(polygon([coords]), Math.sqrt(dx * dx + dy * dy), bearing(start, (ev as any).latlng));
    //         const newCoords = moved.geometry.coordinates[0];
    //         updatePolygon(layer, newCoords);
    //     }

    //     function onMouseUp() {
    //         map.dragging.enable();
    //         map.off('mousemove', onMouseMove);
    //         map.off('mouseup', onMouseUp);
    //         historyStack.push([...coords]);
    //     }

    //     map.on('mousemove', onMouseMove);
    //     map.on('mouseup', onMouseUp);
    // });

    // 撤销功能（可暴露给外部按钮）
    function undo() {
        if (historyStack.length > 1) {
            historyStack.pop();
            const prev = historyStack[historyStack.length - 1];
            updatePolygon(layer, prev);
        }
    }

    // 更新图形
    function updatePolygon(layer: L.Polygon, newCoords: GeoJSON.Position[]) {
        const newPoly = polygon([newCoords]);
        layer.setLatLngs(getCoords(newPoly)[0]);
    }

    // 校验合法性
    function validatePolygon(coords: GeoJSON.Position[]) {
        const poly = polygon([coords]);
        const valid = booleanValid(poly);
        const hasKinks = kinks(poly).features.length > 0;
        if (!valid || hasKinks) {
            alert('图形不合法：存在交叉或顶点错误');
        }
    }

    // 吸附逻辑（可自定义）
    function getSnapTarget(coord: GeoJSON.Position, all: GeoJSON.Position[], excludeIndex: number): GeoJSON.Position | null {
        const threshold = 0.0001;
        for (let i = 0; i < all.length; i++) {
            if (i === excludeIndex) continue;
            const dist = distance(point(coord), point(all[i]));
            if (dist < threshold) return all[i];
        }
        return null;
    }

    // 暴露撤销方法
    (layer as any).undoEdit = undo;
}



export {
    geojson2LeafletBounds,
    addLeafletGeoJsonLayer,
    addLeafletGMarkLayer,
    fitBoundsbyMultiGeojsonPoint,
    bingGeojsonLayerEditEvent,
}