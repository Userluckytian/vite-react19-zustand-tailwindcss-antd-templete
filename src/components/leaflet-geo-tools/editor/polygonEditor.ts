import { EditorState, type LeafletEditorOptions, type MidpointPair } from "../types";
import * as L from "leaflet";
import { LeafletTopology } from "@/components/custom-leaflet-draw/topo/topo";
import { booleanPointInPolygon, point } from '@turf/turf';
import { BaseEditor } from "../base/BaseEditor";
import { deduplicateCoordinates, getFractionalPointOnEdge, isClickOnLayer, reverseLatLngs } from "../utils/commonUtils";
import { polygonHasSelfIntersection } from "../utils/validShapeUtils";


export class PolygonEditor extends BaseEditor<L.Polygon> {

    // #region 辅助属性
    protected isDraggingPolygon = false; // 是否是拖动多边形
    protected dragStartLatLng: L.LatLng | null = null; // 拖动多边形时，用户鼠标按下（mousedown）那一刻的坐标点，然后鼠标移动（mousemove）时，遍历全部的marker，做坐标偏移计算。
    private tempCoords: number[][] = [];  // 绘制的时候存储用户点击的坐标点
    private lastMoveCoord: number[] = []; // 存储鼠标移动的最后一个点的坐标信息
    // #endregion

    protected vertexMarkers: L.Marker[][][] = []; // 存储顶点标记的数组
    protected midpointMarkers: MidpointPair[][][] = []; // 存储【线中点、拖动线marker】两种标记的数组
    protected historyStack: number[][][][][] = []; // 历史记录，存储快照
    protected redoStack: number[][][][][] = []; // 重做记录，存储快照

    constructor(map: L.Map, options: LeafletEditorOptions = {}) {
        super(map, options);
        if (this.map) {
            // 创建时设置激活的编辑器是自身
            this.activate();
            const existGeometry = !!options?.defaultGeometry;
            // 初始化时，设置绘制状态为true(双击结束绘制时关闭绘制状态，其生命周期到头，且不再改变)，且发出状态通知
            this.updateAndNotifyStateChange(existGeometry ? EditorState.Idle : EditorState.Drawing);
            // 鼠标手势设置为十字
            this.map.getContainer().style.cursor = existGeometry ? 'grab' : 'crosshair';

            // 构建编辑器的图层内容
            this.initLayer(options?.defaultStyle, options?.defaultGeometry);
            // 绑定地图事件
            this.bindMapEvents(this.map);
        }
    }

    protected initLayer<U extends L.LayerOptions>(layerOptions: U | undefined, geometry?: GeoJSON.Geometry | L.LatLng): void {
        // 1: 提供一些默认值, 防止用户构建的图层样式异常
        const defaultLayerStyle = {
            weight: 2,
            color: '#008BFF', // 设置边线颜色
            fillColor: "#008BFF", // 设置填充颜色
            fillOpacity: 0.3, // 设置填充透明度
            fill: true, // no fill color means default fill color (gray for `dot` and `circle` markers, transparent for `plus` and `star`)
            ...layerOptions,
        };
        const allOptions = {
            pane: 'overlayPane',
            layerVisible: true, // 增加了一个自定义属性，用于用户从图层层面获取图层的显隐状态
            defaultStyle: defaultLayerStyle,
            ...defaultLayerStyle,
        }
        // 2:  提供默认空图形
        let coords: L.LatLngExpression[] | L.LatLngExpression[][] | L.LatLngExpression[][][] = [[181, 181], [181, 181], [181, 181], [181, 181]];
        if (geometry) {
            coords = reverseLatLngs(geometry as GeoJSON.Geometry);
        }
        // 3: 添加到地图
        this.layer = L.polygon(coords, allOptions);
        this.layer.addTo(this.map);
        // 4: 绑定图层自身事件
        this.bindPolygonEvent();
        // 5: 设置吸附源（排除当前图层） 
        if (this.IsEnableSnap()) {
            this.setSnapSources([this.layer]);
        }
    }

    protected bindMapEvents(map: L.Map): void {
        // 绘制、编辑用前三个
        map.on('click', this.mapClickEvent);
        map.on('dblclick', this.mapDblClickEvent);
        map.on('mousemove', this.mapMouseMoveEvent);
        // 拖动面用的这个
        map.on('mouseup', this.mapMouseUpEvent);
    }

    protected offMapEvents(map: L.Map): void {
        map.off('click', this.mapClickEvent);
        map.off('dblclick', this.mapDblClickEvent);
        map.off('mousemove', this.mapMouseMoveEvent);
        map.off('mouseup', this.mapMouseUpEvent);
    }

    protected setLayerVisibility(visible: boolean): void {
        this.layerVisble = visible;
        if (visible) {
            this.show();
        } else {
            this.hide();
        }
    }

    protected renderLayer(coords: number[][][][], valid: boolean = true): void {
        if (!this.layer) {
            throw new Error('图层不存在，无法渲染');
        }
        const latlngs = coords.map(polygon =>
            polygon.map(ring =>
                ring.map(([lat, lng]) => L.latLng(lat, lng))
            )
        );
        const layerStyle = this.getLayerStyle(valid);
        this.layer.setStyle(layerStyle);
        this.layer.setLatLngs(latlngs as any);
    }

    protected enterEditMode(): void {
        if (!this.layer) return;

        const latlngs = this.layer.getLatLngs() as L.LatLng[][][] | L.LatLng[][];
        let coords: number[][][][];

        if (Array.isArray(latlngs[0][0])) {
            // MultiPolygon
            coords = (latlngs as L.LatLng[][][]).map(polygon =>
                polygon.map(ring => ring.map(p => [p.lat, p.lng]))
            );
        } else {
            // Polygon
            coords = [
                (latlngs as L.LatLng[][]).map(ring => ring.map(p => [p.lat, p.lng]))
            ];
        }
        // 记录初始快照
        this.historyStack.push(coords);
        // 清空重做栈
        this.redoStack = [];

        // ✅ 设置吸附源（排除当前图层） 
        if (this.IsEnableSnap()) {
            this.setSnapSources([this.layer]);
        }

        // 渲染每个顶点为可拖动 marker
        this.reBuildMarker(coords)
        // 渲染边的中线点
        this.insertMidpointMarkers();
    }

    protected exitEditMode(): void {
        // 移除所有顶点 marker
        this.vertexMarkers.flat(2).forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.vertexMarkers = [];

        // 移除所有中点 marker
        this.removeAllMidPointMarkers();
    }

    /** 获取当前 marker 坐标
     *
     *
     * @protected
     * @return {*} 
     * @memberof PolygonEditor
     */
    protected getCurrentMarkerCoords(): number[][][][] {
        // 读取当前 marker 坐标，构建完整结构 [面][环][点][latlng]
        const current = this.vertexMarkers.map(polygon =>
            polygon.map(ring =>
                ring.map(marker => [marker.getLatLng().lat, marker.getLatLng().lng])
            )
        );
        return current;
    }

    /** 插入中间点坐标
     *
     *
     * @private
     * @return {*}  {void}
     * @memberof LeafletEditPolygon
     */
    protected insertMidpointMarkers(skipMarker?: L.Marker): void {
        const isEnabledMidPointsMarker = this.editOptions.dragMidMarkerOptions!.enabled;
        const isEnabledEdgeMarker = this.editOptions.dragLineMarkerOptions!.enabled;
        const disableRenderMarker = (!isEnabledMidPointsMarker && !isEnabledEdgeMarker);
        if (disableRenderMarker || this.currentState !== EditorState.Editing) return;

        // 清除旧的中点标记（若数组中存在）
        this.removeAllMidPointMarkers(skipMarker);

        this.vertexMarkers.forEach((polygon, polygonIndex) => {
            const polygonMidpoints: MidpointPair[][] = [];

            polygon.forEach((ring, ringIndex) => {
                const ringMidpoints: MidpointPair[] = [];

                for (let i = 0; i < ring.length; i++) {
                    const nextIndex = (i + 1) % ring.length;
                    const p1 = ring[i];
                    const p2 = ring[nextIndex];
                    // ✅ 跳过当前边包含 skipMarker 的情况
                    if (skipMarker && (skipMarker === p1 || skipMarker === p2 || (skipMarker as any).pairRef === p1 || (skipMarker as any).pairRef === p2)) { continue; }

                    const insertMidpoint = isEnabledMidPointsMarker ? this.createInsertMidpointMarker(p1, p2, polygonIndex, ringIndex, nextIndex, this.editOptions.dragMidMarkerOptions!.positionRatio!) : null
                    // 插入边控制点（用于拖动边） 
                    const edgeDragMarker = isEnabledEdgeMarker ? this.createEdgeDragMarker(p1, p2, polygonIndex, ringIndex, this.editOptions.dragLineMarkerOptions!.positionRatio!) : null;

                    ringMidpoints.push({ insert: insertMidpoint, edge: edgeDragMarker });
                    // 附加：互相引用 （虽然写的晚，但是一般都会在【createInsertMidpointMarker、createEdgeDragMarker】中绑定的dragstart事件之前完成）
                    if (insertMidpoint) {
                        (insertMidpoint as any).pairRef = edgeDragMarker;
                    }
                    if (edgeDragMarker) {
                        (edgeDragMarker as any).pairRef = insertMidpoint;
                    }
                }

                polygonMidpoints.push(ringMidpoints);
            });

            this.midpointMarkers.push(polygonMidpoints);
        });
    }

    /** 移除所有中点标记（若存在正在拖动的，则跳过）
     *
     *
     * @memberof BasePolygonEditor
     */
    protected removeAllMidPointMarkers(skipMarker?: L.Marker) {
        const newMidpoints: MidpointPair[] = [];

        this.midpointMarkers.flat(2).forEach(pair => {

            const keepInsert = pair.insert && pair.insert === skipMarker;
            const keepEdge = pair.edge && pair.edge === skipMarker;

            if (!keepInsert) {
                if (pair.insert && this.map.hasLayer(pair.insert)) {
                    this.map.removeLayer(pair.insert);
                }
            }

            if (!keepEdge) {
                if (pair.edge && this.map.hasLayer(pair.edge)) {
                    this.map.removeLayer(pair.edge);
                }
            }

            // 如果有任一 marker 被保留，就保留这个 pair
            if (keepInsert || keepEdge) {
                newMidpoints.push(pair);
            }
        });

        // 重新组织为二维结构（可选）
        this.midpointMarkers = newMidpoints.length > 0 ? [[[...newMidpoints]]] : [];
    }

    /** 根据坐标重建 marker 和图形 + 重新渲染图层(未使用)
     * 
     * @param latlngs 坐标数组
     */
    protected reBuildMarkerAndRender(latlngs: number[][][][]): void {
        this.renderLayer(latlngs);

        this.reBuildMarker(latlngs);

        this.updateMidpoints();

    }

    /** 根据坐标重建 marker 和图形
     * 
     * @param latlngs 坐标数组
     */
    protected reBuildMarker(coords: number[][][][]): void {
        // 清除旧的 marker
        this.vertexMarkers.flat(2).forEach(m => this.map.removeLayer(m));
        this.vertexMarkers = [];

        coords.forEach((polygon, polygonIndex) => {
            const polygonMarkers: L.Marker[][] = [];

            polygon.forEach((ring, ringIndex) => {
                const ringMarkers: L.Marker[] = [];

                ring.forEach((coord, pointIndex) => {
                    const latlng = L.latLng(coord[0], coord[1]);

                    const marker = L.marker(latlng, this.editOptions.vertexsMarkerStyle).addTo(this.map);

                    // 拖动时更新图形
                    marker.on('drag', () => {
                        // 先进行吸附处理（确定吸附点）
                        let latlng = marker.getLatLng();
                        if (this.IsEnableSnap()) {
                            const { snappedLatLng } = this.applySnapWithTarget(marker.getLatLng());
                            latlng = snappedLatLng;
                        }
                        marker.setLatLng(latlng);

                        this.renderLayerFromMarkers();
                        this.updateMidpoints();
                    });

                    // 拖动结束后记录历史
                    marker.on('dragend', () => {
                        // 1. 移除可能存在的高亮
                        this.clearSnapHighlights();
                        // 2. 更新历史记录
                        this.pushHistoryFromMarkers();
                    });

                    // 右键删除点（前提是环点数大于3）
                    marker.on('contextmenu', () => {
                        const ring = this.vertexMarkers[polygonIndex][ringIndex];
                        if (ring.length > 3) {
                            this.map.removeLayer(marker);
                            // 这里应该查找当前 marker 的索引，而不是使用捕获时的 pointIndex
                            const currentIndex = ring.findIndex(m => m === marker);
                            if (currentIndex !== -1) {
                                ring.splice(currentIndex, 1);
                                this.renderLayerFromMarkers();
                                this.pushHistoryFromMarkers();
                                this.updateMidpoints();
                            }
                        } else {
                            alert('环点数不能少于3个');
                        }
                    });

                    ringMarkers.push(marker);
                });

                polygonMarkers.push(ringMarkers);
            });

            this.vertexMarkers.push(polygonMarkers);
        });
    }


    /** 实时更新中线点的位置（传参意思：用户正在拖动的避免销毁和重新构建）
    *
    *
    * @private
    * @memberof LeafletEditPolygon
    */
    protected updateMidpoints(skipMarker?: L.Marker): void {
        const isEnabledMidPointsMarker = this.editOptions.dragMidMarkerOptions!.enabled;
        const isEnabledEdgeMarker = this.editOptions.dragLineMarkerOptions!.enabled;
        const disableRenderMarker = (!isEnabledMidPointsMarker && !isEnabledEdgeMarker);
        // 新增：检查是否启用中点功能
        if (disableRenderMarker) {
            // 如果已存在中点，需要清理
            if (this.midpointMarkers.length > 0) {
                this.removeAllMidPointMarkers();
                this.midpointMarkers = [];
            }
            return;
        }

        // 清除旧的中点
        this.removeAllMidPointMarkers(skipMarker);

        // 重新插入
        this.insertMidpointMarkers(skipMarker);
    }


    // #region 辅助函数
    /** 实例化面图层事件
     *
     *
     * @private
     * @memberof LeafletEditPolygon
     */
    private bindPolygonEvent() {

        if (this.layer) {
            this.layer.on('mousedown', (e: L.LeafletMouseEvent) => {
                // 关键：只有激活的实例才处理事件
                if (!this.isActive()) return;
                if (this.currentState === EditorState.Editing) {
                    this.isDraggingPolygon = true;
                    this.dragStartLatLng = e.latlng;
                    this.map.dragging.disable();
                }
            });
        }
    }
    /**  地图点击事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof markerPoint
     */
    private mapClickEvent = (e: L.LeafletMouseEvent) => {
        // 关键：只有激活的实例才处理事件
        if (!this.isActive()) return;
        // 绘制时的逻辑
        if (this.currentState === EditorState.Drawing) {
            let waitingAddCoord = [e.latlng.lat, e.latlng.lng];
            if (this.IsEnableSnap()) {
                const { snappedLatLng } = this.applySnapWithTarget(e.latlng);
                waitingAddCoord = [snappedLatLng.lat, snappedLatLng.lng];
            }
            const testCoords = [...this.tempCoords, waitingAddCoord, this.tempCoords[0]];
            // 实时校验并改变样式
            const isValid = this.isValidPolygon(testCoords);
            if (isValid) {
                // 通过校验，则添加点
                this.tempCoords.push(waitingAddCoord);
                // 同时记录最后一个点，用于后续撤回操作行为
                this.lastMoveCoord = waitingAddCoord;
            }
            return;
        }
    }
    /**  地图双击事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletEditPolygon
     */
    private mapDblClickEvent = (e: L.LeafletMouseEvent) => {
        // 关键：只有激活的实例才处理事件
        if (!this.canConsume(e)) return;
        if (!this.layer) throw new Error('面图层实例化失败，无法完成图层创建，请重试');
        // 情况1： 正在绘制状态时，绘制的逻辑
        if (this.currentState === EditorState.Drawing) {
            const lastCoord = [e.latlng.lat, e.latlng.lng];
            // 渲染图层, 先剔除重复坐标，双击事件实际触发了2次单机事件，所以，需要剔除重复坐标
            const ringCoords = [...this.tempCoords, lastCoord, this.tempCoords[0]];
            const finalCoords: number[][] = deduplicateCoordinates(ringCoords);
            if (this.isValidPolygon(finalCoords)) {
                this.finishedDraw(finalCoords);
            } else {
                // 校验失败，保持绘制状态
                throw new Error('绘制面无效，请继续绘制或调整');
            }
        } else {
            // 情况 2：已绘制完成后的后续双击事件的逻辑均走这个
            const clickedLatLng = e.latlng;
            const polygonGeoJSON = this.layer.toGeoJSON();
            // 判断用户是否点击到了面上，是的话，就开始编辑模式
            const turfPoint = point([clickedLatLng.lng, clickedLatLng.lat]);
            const isInside = booleanPointInPolygon(turfPoint, polygonGeoJSON);
            if (isInside && this.currentState !== EditorState.Editing) {
                this.startEdit();
            } else {
                this.commitEdit();
            }
        }
    }
    /**  地图鼠标移动事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletEditPolygon
     */
    private mapMouseMoveEvent = (e: L.LeafletMouseEvent) => {
        // 关键：只有激活的实例才处理事件
        if (!this.isActive()) return;
        // 逻辑1： 绘制时的逻辑
        if (this.currentState === EditorState.Drawing) {
            let lastMoveEndPoint = [e.latlng.lat, e.latlng.lng];
            let tempMovedCoords = this.tempCoords;
            // 
            if (this.IsEnableSnap()) {
                const { snappedLatLng } = this.applySnapWithTarget(e.latlng);
                lastMoveEndPoint = [snappedLatLng.lat, snappedLatLng.lng];
            }
            // 1：如果坐标数组中没有点，什么也不做（只提供吸附能力）。
            if (!tempMovedCoords.length) return;
            // 2：构建临时坐标点数组。
            tempMovedCoords = [...tempMovedCoords, lastMoveEndPoint];
            // 校验事件
            let layerIsValid = this.isValidPolygon([...tempMovedCoords, this.tempCoords[0]]);
            // 实时渲染, 包装成 [面][环][点] 结构
            this.renderLayer([[tempMovedCoords]], layerIsValid);
            return;
        }
        // 逻辑2：编辑状态下的逻辑（编辑状态下如果分多个逻辑，需要定义新的变量用于区分。但这些都是在编辑状态下才会执行）
        if (this.currentState === EditorState.Editing) {
            // 🎯 编辑模式下的逻辑（可扩展），例如：拖动整个面时显示辅助线、吸附提示等
            // 事件机制1：拖动机制时的事件。
            if (this.isDraggingPolygon && this.dragStartLatLng) {
                const deltaLat = e.latlng.lat - this.dragStartLatLng.lat;
                const deltaLng = e.latlng.lng - this.dragStartLatLng.lng;

                this.vertexMarkers.forEach(polygon => {
                    polygon.forEach(ring => {
                        ring.forEach(marker => {
                            const old = marker.getLatLng();
                            marker.setLatLng([old.lat + deltaLat, old.lng + deltaLng]);
                        });
                    });
                });

                const updated = this.getCurrentMarkerCoords();
                this.renderLayer(updated);
                this.updateMidpoints();

                this.dragStartLatLng = e.latlng; // 连续拖动
            }
            // 事件机制2：吸附事件

        }

    }
    /**  地图鼠标抬起事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletEditPolygon
     */
    private mapMouseUpEvent = (e: L.LeafletMouseEvent) => {
        // 关键：只有激活的实例才处理事件
        if (!this.isActive()) return;
        // 条件1: 编辑事件
        if (this.currentState === EditorState.Editing) {
            // 条件1-1： 编辑状态下： 拖动面的事件
            if (this.isDraggingPolygon) {
                this.isDraggingPolygon = false;
                this.dragStartLatLng = null;
                this.map.dragging.enable();
                const updated = this.getCurrentMarkerCoords();
                this.renderLayer(updated);
                this.historyStack.push(updated);
                this.updateMidpoints();
                return;
            }
        }
    }

    /** 校验面图层的有效性
     *
     *
     * @private
     * @param {L.LatLng[]} coords
     * @return {*}  {boolean}
     */
    private isValidPolygon(coords: number[][]): boolean {

        // 1. 检查自相交（根据配置）
        if (this.validationOptions?.allowSelfIntersect === false) {
            if (polygonHasSelfIntersection(coords)) {
                return false;
            }
        }

        // 2. 其他校验规则可以在这里添加...

        return true;

    }

    /** 双击事件是否可以继续触发
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @return {*}  {boolean}
     * @memberof PolygonEditor
     */
    private canConsume(e: L.LeafletMouseEvent): boolean {
        // 如果是绘制操作，则直接跳过判断，后面的逻辑是给编辑操作准备的
        if (this.currentState === EditorState.Drawing) return true;
        if (!this.layerVisble) return false;
        // 🔒 检查是否处于topo选择状态，如果是则不进入编辑模式
        if (LeafletTopology.isPicking(this.map)) {
            // topo正在选择图层，不处理双击编辑事件
            return false;
        }
        const clickIsSelf = isClickOnLayer(e, this.layer);
        // 已经激活的实例，确保点击在自己的图层上
        if (this.isActive()) {
            return clickIsSelf;
        } else {
            if (clickIsSelf) {
                // console.log('重新激活编辑器');
                this.activate();
                return true;
            }
        }
        return false;
    }

    /** 完成绘制（结束绘制）
     *
     *
     * @private
     * @param {number[][][][]} finalCoords
     * @memberof LeafletPolygonEditor
     */
    private finishedDraw(finalCoords: number[][]): void {
        this.renderLayer([[finalCoords]]);
        this.tempCoords = []; // 清空吧，虽然不清空也没事，毕竟后面就不使用了
        this.lastMoveCoord = []; // 清空吧，虽然不清空也没事，毕竟后面就不使用了
        this.reset();
        // 移除（吸附后）可能存在的高亮
        this.clearSnapHighlights();
        // 设置为空闲状态，并发出状态通知
        this.updateAndNotifyStateChange(EditorState.Idle);
    }

    /** 进入编辑模式
     *
     * @private
     */
    private startEdit(): void {
        if (!this.canEnterEditMode()) return;
        // 1：禁用双击地图放大功能（先考虑让用户自己去写，里面不再控制）
        // this.map.doubleClickZoom.disable();
        // 2：状态变更，并发出状态通知
        this.updateAndNotifyStateChange(EditorState.Editing);
        // 3: 设置当前激活态是本实例，因为事件监听和激活态实例是关联的，只有激活的实例才处理事件
        this.isActive()
        // 4: 进入编辑模式
        this.enterEditMode();
    }

    /** 控制图层显示
     *
     *
     * @memberof LeafletEditPolygon
     */
    private show() {
        // 使用用户默认设置的样式，而不是我自定义的！
        this.layer?.setStyle({ ...(this.layer.options as any).defaultStyle, layerVisible: true });
    }

    /** 控制图层隐藏
     *
     *
     * @memberof LeafletEditPolygon
     */
    private hide() {
        const hideStyle = {
            color: 'red',
            weight: 0,
            fill: false, // no fill color means default fill color (gray for `dot` and `circle` markers, transparent for `plus` and `star`)
            fillColor: 'red', // same color as the line
            fillOpacity: 0
        };
        this.layer?.setStyle({ ...hideStyle, layerVisible: false } as any);
        // ✅ 退出编辑状态（若存在）
        if (this.currentState === EditorState.Editing) {
            this.exitEditMode();
            this.updateAndNotifyStateChange(EditorState.Idle);
        }
    }

    /** 获取图层的样式信息
     *
     *
     * @private
     * @param {boolean} [valid=true] 获取无效的样式还是有效的样式
     * @memberof PolygonEditor
     */
    private getLayerStyle(valid: boolean = true) {
        // 1: 提供一些默认值, 防止用户构建的图层样式异常
        const defaultLayerStyle = {
            weight: 2,
            color: '#008BFF', // 设置边线颜色
            fillColor: "#008BFF", // 设置填充颜色
            fillOpacity: 0.3, // 设置填充透明度
            fill: true, // no fill color means default fill color (gray for `dot` and `circle` markers, transparent for `plus` and `star`)
            ...this.options.defaultStyle,
        };
        const allOptions = {
            pane: 'overlayPane',
            layerVisible: true, // 增加了一个自定义属性，用于用户从图层层面获取图层的显隐状态
            defaultStyle: defaultLayerStyle,
            ...defaultLayerStyle,
        }
        const errorLayerStyle = {
            weight: 2,
            color: 'red', // 设置边线颜色
            fillColor: "red", // 设置填充颜色
            fillOpacity: 0.3, // 设置填充透明度
            fill: true,
            ...this.options?.validation?.validErrorPolygonStyle
        }
        return valid ? allOptions : errorLayerStyle;
    }

    /** 创建一个中点标记
     *
     *
     * @private
     * @param {L.Marker} p1 起点 marker
     * @param {L.Marker} p2 终点 marker
     * @param {number} polygonIndex 多边形索引
     * @param {number} ringIndex 环索引
     * @param {number} insertIndex 插入点的位置
     * @param {number} positionRadio 位置比率
     * @return {*}  {L.Marker}
     * @memberof LeafletPolygonEditor
     */
    private createInsertMidpointMarker(
        p1: L.Marker,
        p2: L.Marker,
        polygonIndex: number,
        ringIndex: number,
        insertIndex: number,
        positionRadio: number
    ): L.Marker {
        const midPoint = getFractionalPointOnEdge(p1.getLatLng(), p2.getLatLng(), positionRadio);

        const marker = L.marker(midPoint, this.editOptions.dragMidMarkerOptions!.dragMarkerStyle).addTo(this.map);

        // 开始拖动时，移除线拖动的marker
        marker.on('dragstart', () => {
            const pair = (marker as any).pairRef as L.Marker;
            if (pair) {
                this.map.removeLayer(pair);
            }
        });

        // 中点被拖动时，图形同步更新
        marker.on('drag', () => {
            // 0：先进行吸附处理（确定吸附点）
            let latlng = marker.getLatLng();
            if (this.IsEnableSnap()) {
                const { snappedLatLng } = this.applySnapWithTarget(marker.getLatLng());
                latlng = snappedLatLng;
            }

            // 1. 拷贝当前顶点坐标
            const coords = this.getCurrentMarkerCoords();

            // 2. 插入中点坐标到对应位置（不修改原 marker 数组）
            const ring = coords[polygonIndex][ringIndex];
            const newRing = [...ring];
            newRing.splice(insertIndex, 0, [latlng.lat, latlng.lng]);

            // 3. 构造新的坐标结构
            const newCoords = [...coords];
            newCoords[polygonIndex] = [...coords[polygonIndex]];
            newCoords[polygonIndex][ringIndex] = newRing;

            // 4. 实时渲染
            this.renderLayer(newCoords);
        });
        // 中点拖动结束后，移除此处中点，执行添加新的顶点
        marker.on('dragend', () => {
            // 0：先进行吸附处理（只是用于确定吸附点，不再进行高亮）
            let latlng = marker.getLatLng();
            if (this.IsEnableSnap()) {
                const { snappedLatLng } = this.applySnapWithTarget(marker.getLatLng());
                latlng = snappedLatLng;
            }
            // 移除可能存在的高亮
            this.clearSnapHighlights();

            // 1. 从地图中移除中点 marker
            this.map.removeLayer(marker);

            // 2. 创建新的顶点 marker
            const newMarker = L.marker(latlng, this.editOptions.vertexsMarkerStyle).addTo(this.map);

            // 3. 插入到顶点数组
            this.vertexMarkers[polygonIndex][ringIndex].splice(insertIndex, 0, newMarker);

            // 4. 绑定事件
            newMarker.on('drag', () => {
                // 先进行吸附处理（确定吸附点）
                let latlng = newMarker.getLatLng();
                if (this.IsEnableSnap()) {
                    const { snappedLatLng } = this.applySnapWithTarget(marker.getLatLng());
                    latlng = snappedLatLng;
                }
                marker.setLatLng(latlng);

                this.renderLayerFromMarkers();
                this.updateMidpoints();
            });

            newMarker.on('dragend', () => {
                // 1. 移除可能存在的高亮
                this.clearSnapHighlights();
                // 2. 更新历史记录
                this.pushHistoryFromMarkers();
            });

            newMarker.on('contextmenu', () => {
                const currentRing = this.vertexMarkers[polygonIndex][ringIndex];
                if (currentRing.length > 3) {
                    // 关键：查找当前 marker 的实际索引
                    const currentIndex = currentRing.findIndex(m => m === newMarker);
                    if (currentIndex !== -1) {
                        this.map.removeLayer(newMarker);
                        currentRing.splice(currentIndex, 1);
                        this.renderLayerFromMarkers();
                        this.pushHistoryFromMarkers();
                        this.updateMidpoints();
                    }
                } else {
                    alert('环点数不能少于3个');
                }
            });

            // 5. 刷新图层和中点
            this.renderLayerFromMarkers();
            this.pushHistoryFromMarkers();
            this.updateMidpoints();
        });
        return marker;
    }

    /** 创建一个可拖动的边控制点，用于拖动整条边
     * 
     * @private
     * @param p1 起点 marker
     * @param p2 终点 marker
     * @param polygonIndex 多边形索引
     * @param ringIndex 环索引
     * @param {number} positionRadio 位置比率
     * @returns L.Marker
     */
    private createEdgeDragMarker(
        p1: L.Marker,
        p2: L.Marker,
        polygonIndex: number,
        ringIndex: number,
        positionRadio: number
    ): L.Marker {
        const midDragPoint = getFractionalPointOnEdge(p1.getLatLng(), p2.getLatLng(), positionRadio);
        const marker = L.marker(midDragPoint, this.editOptions.dragLineMarkerOptions!.dragMarkerStyle).addTo(this.map);
        let lastLatLng: L.LatLng | null = null;

        marker.on('dragstart', () => {
            lastLatLng = marker.getLatLng();

            // 移除配对中点
            const pair = (marker as any).pairRef as L.Marker;
            if (pair && this.map.hasLayer(pair)) {
                this.map.removeLayer(pair);
            }
        });

        marker.on('drag', () => {
            if (!lastLatLng) return;

            const { snappedLatLng: current } = this.applySnapWithTarget(marker.getLatLng());
            const deltaLat = current.lat - lastLatLng.lat;
            const deltaLng = current.lng - lastLatLng.lng;

            const latlng1 = p1.getLatLng();
            const latlng2 = p2.getLatLng();

            p1.setLatLng([latlng1.lat + deltaLat, latlng1.lng + deltaLng]);
            p2.setLatLng([latlng2.lat + deltaLat, latlng2.lng + deltaLng]);

            this.renderLayerFromMarkers();
            this.updateMidpoints(marker); // ✅ 传入当前 marker，避免被销毁
            lastLatLng = current;
        });

        marker.on('dragend', () => {
            // 1. 移除可能存在的高亮
            this.clearSnapHighlights();
            // 2. 重新渲染更新中点 marker
            this.updateMidpoints();
            this.pushHistoryFromMarkers();
        });


        return marker;
    }


    private renderLayerFromMarkers() {
        const coords = this.getCurrentMarkerCoords()
        this.renderLayer(coords);
    }

    private pushHistoryFromMarkers() {
        const coords = this.getCurrentMarkerCoords()
        this.historyStack.push(coords);
    }

    /**  绘制时,用于撤销最后一个绘制点(一般绑定到快捷键ctrl + Z上)
     *
     *
     * @return {*}  {boolean}
     * @memberof PolygonEditor
     */
    public undoDraw(): boolean {
        if (this.currentState !== EditorState.Drawing)
            return false;

        if (this.tempCoords.length > 0) {
            // 移除最后一个点
            this.tempCoords.pop();

            // ✅ 修复：检查是否还有剩余点
            if (this.tempCoords.length > 0) {
                const finalCoords = [...this.tempCoords, this.lastMoveCoord];
                this.renderLayer([[finalCoords]]);
            } else {
                // 没有点了，清空渲染
                this.renderLayer([[]]);
                this.lastMoveCoord = []; // 清空移动点
            }
            return true;
        }

        return false;
    }

    // #endregion


}

