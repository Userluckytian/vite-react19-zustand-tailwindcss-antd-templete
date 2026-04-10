import { BaseEditor } from "../base/BaseEditor";
import { EditorState, type LeafletEditorOptions, type MidpointPair } from "../types";

/*

圆心拖拽、半径调整、吸附、撤销/重做、图层显隐控制、校验、样式配置

**第一轮分析（功能的合理性：从功能的必要性，绘制行为、编辑行为等角度分析）**：
现阶段圆形的geojson返回结果是使用turf.js的circle方法生成的，这会影响绘制行为和编辑行为，需要考虑下怎么调整。
1. 圆心拖拽：拖动的是整个圆 (✅)
2. 半径调整(✅)
3. 吸附：最多支持个圆心吸附和拖动位置的吸附吧？ (✅)
4. 图层显隐控制：可做， (✅)
5. 撤销重做：emmm... 
6. 校验: 支持提供最小圆的半径，小于用户设置的值，则不允许结束绘制。 (✅)
7. 样式配置：必做 (✅)

**第二轮分析(主要分析要不要放到BaseEditor中， 比如：BaseEditor中写抽象接口、方法、子类实现接口、方法。或者不应该放到BaseEditor中，由子类去写)**：
1. 圆心拖拽： (✅)
2. 半径调整：基类（circleShapeEditor） (✅)
3. 吸附：（放到baseEditor中） (✅)
4. 图层显隐控制：BaseEditor抽象，子类实现（一般都是设置透明度做图层显隐吧？ 是的话，可以写在BaseEditor中实现） (✅)
5. 撤销重做：（baseEditor做抽象，子类实现）
6. 校验：（baseEditor做接口抽象，子类实现） (✅)
7. 样式配置：（baseEditor做接口抽象，子类实现） (✅)

约束: circleEditor 要求传递的options.defaultGeometry是中点，options.defaultStyle中传递半径{radius:10}
 */

import * as L from 'leaflet';
import { booleanValidEnhance, getFractionalPointOnEdge, reversePointLatLngs } from "../utils/commonUtils";
import { booleanPointInPolygon, circle, point } from "@turf/turf";
import { Polyline, type LatLngExpression } from "leaflet";
import { isPointClickInCircle } from "../utils/topoUtils";
import { LeafletTopology } from "../topo/topo";

export default class CircleEditor extends BaseEditor<L.Circle> {


    // #region 不需要的部分
    protected midpointMarkers: MidpointPair[] = [];
    protected updateMidpoints(skipMarker?: L.Marker): void { }
    // #endregion

    protected vertexMarkers: L.Marker[] = [];
    protected historyStack: number[][][] = [];
    protected redoStack: any[] = [];

    // 中心点的拖动需要的两个变量
    protected isDragging = false; // 是否是拖动
    protected dragStartLatLng: L.LatLng | null = null; // 拖动时，用户鼠标按下（mousedown）那一刻的坐标点，然后鼠标移动（mousemove）时，遍历全部的marker，做坐标偏移计算。
    private dashLineLayer: L.Polyline | null = null; // 连接圆心、半径的虚线。
    // --- start ---
    private tempCoords: number[][] = [];  // 绘制的时候存储用户点击的坐标点
    private km_value = 1000; // 1千米 = 1000米

    constructor(map: L.Map, options: LeafletEditorOptions = {}) {
        super(map, options);
        if (this.map) {
            this.activate();
            const existGeometry = !!options?.defaultGeometry;
            // 初始化时，设置绘制状态为true(双击结束绘制时关闭绘制状态，其生命周期到头，且不再改变)，且发出状态通知
            this.updateAndNotifyStateChange(existGeometry ? EditorState.Idle : EditorState.Drawing);
            // 鼠标手势设置为十字
            this.map.getContainer().style.cursor = existGeometry ? 'grab' : 'crosshair';
            // 构建编辑器的图层内容
            this.initLayer(options?.defaultGeometry);
            // 绑定地图事件
            this.bindMapEvents(this.map);
        }
    }

    // #region 辅助函数

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
            fillColor: "#008BFF", // 设置填充颜色
            fillOpacity: 0.3, // 设置填充透明度
            color: '#008BFF', // 设置边线颜色
            weight: 2,
            radius: 0, // 圆形半径
            ...this.options.defaultStyle,
        };
        const allOptions = {
            pane: 'overlayPane',
            layerVisible: true, // 增加了一个自定义属性，用于用户从图层层面获取图层的显隐状态
            defaultStyle: defaultLayerStyle,
            ...defaultLayerStyle,
        }
        const errorLayerStyle = {
            color: 'red', // 设置边线颜色
            fillColor: "red", // 设置填充颜色
            fillOpacity: 0.3, // 设置填充透明度
            radius: 0, // 圆形半径
            weight: 2,
            ...this.options?.validation?.validErrorPolygonStyle
        }
        return valid ? allOptions : errorLayerStyle;
    }

    protected initLayer(geometry?: GeoJSON.Geometry): void {
        const layerStyle = this.getLayerStyle();
        let center: number[] = [181, 181]; // 中心点坐标
        if (geometry) {
            center = reversePointLatLngs(geometry);
        }
        this.layer = L.circle(center as any, layerStyle);
        this.layer.addTo(this.map);
        // 4: 绑定图层自身事件(无)
        // 5: 设置吸附源（排除当前图层） 
        if (this.IsEnableSnap()) {
            this.setSnapSources([this.layer]);
        }
    }

    protected bindMapEvents(map: L.Map): void {
        // 绘制只用了这俩
        map.on('click', this.mapClickEvent);
        map.on('mousemove', this.mapMouseMoveEvent);
        // 编辑用这个
        map.on('dblclick', this.mapDblClickEvent);
    }
    protected offMapEvents(map: L.Map): void {
        map.off('click', this.mapClickEvent);
        map.off('dblclick', this.mapDblClickEvent);
        map.off('mousemove', this.mapMouseMoveEvent);
    }
    protected reBuildMarkerAndRender(coordinatesArray: number[][]): void {
        // 更新临时坐标
        this.tempCoords = coordinatesArray;
        // 重建标记
        this.reBuildMarker(coordinatesArray);
        const { isValid } = this.getCenterAndRadiusByCoordArr(coordinatesArray);
        // 渲染图层
        this.renderLayer(coordinatesArray, isValid);
    }
    /** 返回图层的空间信息 
     * 
     * 
     * @memberof LeafletEditPolygon
     */
    public getGeoJSON(FittingPointNum: number = 64) {
        if (this.layer && (this.layer as any).toGeoJSON) {
            const center = this.layer.getLatLng();
            const radius = this.layer.getRadius();
            const lnglat = [center.lng, center.lat];
            const options: any = {
                steps: FittingPointNum ?? this.editOptions.circle_TopoFittingPointNum,
                units: 'kilometers',
                properties: { type: 'circle' }
            };
            const geojson = circle(lnglat, radius / this.km_value, options); // 获取图形！
            return geojson;
        } else {
            throw new Error("未捕获到图层，无法获取到geojson数据");
        }
    }

    // #endregion

    // #region 辅助函数
    /**  地图点击事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletCircle
     */
    private mapClickEvent = (e: L.LeafletMouseEvent) => {

        if (!this.isActive()) return;
        if (this.currentState === EditorState.Drawing) {
            // 尝试添加新点
            let waitingAddCoord = [e.latlng.lat, e.latlng.lng];
            if (this.IsEnableSnap()) {
                const { snappedLatLng } = this.applySnapWithTarget(e.latlng);
                waitingAddCoord = [snappedLatLng.lat, snappedLatLng.lng];
            }

            if (this.tempCoords.length === 0) {
                this.tempCoords.push(waitingAddCoord)
            } else {
                const finalCoords = [this.tempCoords[0], [e.latlng.lat, e.latlng.lng]];
                const { isValid } = this.getCenterAndRadiusByCoordArr(finalCoords);
                if (isValid) {
                    this.finishedDraw(finalCoords);
                } else {
                    // 校验失败，保持绘制状态（不执行reset）
                    throw new Error('绘制的圆形无效，请调整半径大小');
                    // 用户可以继续移动鼠标调整
                }
            }

        }
    }

    /** 完成绘制（结束绘制）
     *
     *
     * @private
     * @param {number[][][]} finalCoords 多线结构，如果你是单条线，就再包裹一层
     * @memberof LeafletPolyLine
     */
    private finishedDraw(finalCoords: number[][]): void {
        // 校验通过，完成绘制
        this.renderLayer(finalCoords);
        this.reset();
        // 不可清空，编辑时使用
        // this.tempCoords = [];
        // 移除（吸附后）可能存在的高亮
        this.clearSnapHighlights();
        // 设置为空闲状态，并发出状态通知
        this.updateAndNotifyStateChange(EditorState.Idle);
    }

    /** 通过坐标对，获取中心点，半径，以及圆形是否是有效的（因为有的时候，我们可以约束圆的面积不能太小。这样这个校验就是有用的。）
     *
     *
     * @private
     * @param {number[][]} coords
     * @return {*} 
     * @memberof CircleEditor
     */
    private getCenterAndRadiusByCoordArr(coords: number[][]) {
        const center = L.latLng(coords[0] as [number, number]);
        const radiusPoint = L.latLng(coords[1] as [number, number]);
        const radius = center.distanceTo(radiusPoint);
        const isValid = this.isValidCircle(center, radius);
        return { center, radius, isValid };
    }

    /** 渲染图层
     *
     *
     * @protected
     * @param { [][]} coords
     * @param {boolean} valid 几何形状的有效性，无效几何的颜色变色
     * @memberof LeafletCircle
     */
    protected renderLayer(coords: number[][], valid: boolean = true) {
        if (this.layer) {
            const layerStyle = this.getLayerStyle(valid);
            this.layer.setStyle(layerStyle);
            const { center, radius } = this.getCenterAndRadiusByCoordArr(coords);
            this.layer.setLatLng(center);
            this.layer.setRadius(radius);
        } else {
            throw new Error('图层不存在，无法渲染');
        }
    }

    /**  地图鼠标移动事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletCircle
     */
    private mapMouseMoveEvent = (e: L.LeafletMouseEvent) => {
        if (!this.isActive()) return;
        if (this.currentState === EditorState.Drawing) {
            let lastMoveEndPoint: number[] = [e.latlng.lat, e.latlng.lng];
            let tempMovedCoords = this.tempCoords;
            if (this.IsEnableSnap()) {
                const { snappedLatLng } = this.applySnapWithTarget(e.latlng);
                lastMoveEndPoint = [snappedLatLng.lat, snappedLatLng.lng];
            }
            // 1：一个点也没有时，我们移动事件，也什么也不做。
            if (!tempMovedCoords.length) return;
            // 2：只有一个点时，我们只保留第一个点和此刻移动结束的点。
            this.tempCoords = [tempMovedCoords[0], lastMoveEndPoint];
            const { isValid } = this.getCenterAndRadiusByCoordArr(this.tempCoords);
            // 实时渲染
            this.renderLayer(this.tempCoords, isValid);
        }
        if (this.currentState === EditorState.Editing) {
            return;
        }



    }

    /**  地图双击事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletPolyLine
     */
    private mapDblClickEvent = (e: L.LeafletMouseEvent) => {
        // 关键：只有激活的实例才处理事件
        if (!this.canConsume(e)) return;
        if (!this.layer) throw new Error('图层实例化失败，无法完成图层创建，请重试');
        if (this.currentState !== EditorState.Drawing) {
            // 已绘制完成后的后续双击事件的逻辑均走这个
            const isInside = isPointClickInCircle(e.latlng, this.layer as any);
            if (isInside && this.currentState !== EditorState.Editing) {
                this.startEdit();
            } else {
                this.commitEdit();
            }
        }
    }

    /** 双击事件是否可以继续触发
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @return {*}  {boolean}
     * @memberof BaseEditor
     */
    protected canConsume(e: L.LeafletMouseEvent): boolean {

        // 如果是绘制操作，则直接跳过判断，后面的逻辑是给编辑操作准备的
        if (this.currentState === EditorState.Drawing) return true;
        if (!this.layerVisble) return false;
        // 🔒 检查是否处于topo选择状态，如果是则不进入编辑模式
        if (LeafletTopology.isPicking(this.map)) {
            // topo正在选择图层，不处理双击编辑事件
            return false;
        }
        const clickIsSelf = isPointClickInCircle(e.latlng, this.layer as any);
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

    /** 使用 turf.booleanValid 校验圆形有效性
     *
     *
     * @private
     * @param {L.LatLng} center
     * @param {number} radius
     * @return {*}  {boolean}
     * @memberof LeafletCircle
     */
    private isValidCircle(center: L.LatLng, radius: number): boolean {
        try {
            // 1. 检查最小半径约束
            const minRadius = this.validationOptions.circle_minRadius;
            if (minRadius && radius < minRadius) {
                return false;
            }

            // 2. 使用 turf.circle 创建圆形几何体
            const circleGeoJSON = circle(
                [center.lng, center.lat],
                radius / this.km_value,  // 转换为公里
                { steps: 32, units: 'kilometers' }
            );

            // 3. 使用 turf.booleanValid 校验
            return booleanValidEnhance(circleGeoJSON);
        } catch (error) {
            // 如果创建或校验过程出错，说明圆形无效
            console.warn('圆形校验失败:', error);
            return false;
        }
    }

    /** 进入编辑模式
     *
     * @private
     * @memberof PolylineEditor
     */
    public startEdit(): void {
        if (!this.canEnterEditMode()) return;
        // 1：禁用双击地图放大功能（先考虑让用户自己去写，里面不再控制）
        // this.map.doubleClickZoom.disable();
        // 2：状态变更，并发出状态通知
        this.updateAndNotifyStateChange(EditorState.Editing);
        // 3: 设置当前激活态是本实例，因为事件监听和激活态实例是关联的，只有激活的实例才处理事件
        this.activate()
        // 4: 进入编辑模式
        this.enterEditMode();
    }

    protected enterEditMode(): void {
        if (!this.layer) return;

        let coords: number[][] = this.tempCoords;
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
    }



    protected getCurrentMarkerCoords() {
        // 读取当前 marker 坐标，构建完整结构
        const current = this.vertexMarkers.map(pointMarker => [pointMarker.getLatLng().lat, pointMarker.getLatLng().lng])
        return current;
    }

    protected reBuildMarker(coords: number[][]): void {
        // 清除旧的 marker   ---   [[[181, 181], [182, 182]]]
        this.vertexMarkers.forEach(marker => this.map.removeLayer(marker));
        this.vertexMarkers = [];
        // 1: 渲染顶点
        coords.forEach((coord, pointIndex) => {

            const latlng = L.latLng(coord[0], coord[1]);

            const marker = L.marker(latlng, this.editOptions.vertexsMarkerStyle).addTo(this.map);
            // 给中心点添加mouseDown事件
            if (pointIndex === 0) {
                marker.on('mousedown', (e: L.LeafletMouseEvent) => {
                    // 关键：只有激活的实例才处理事件
                    if (!this.isActive()) return;
                    if (this.currentState === EditorState.Editing) {
                        this.isDragging = true;
                        this.dragStartLatLng = e.latlng;
                        this.map.dragging.disable();
                    }
                });
            }

            // 拖动时更新图形
            marker.on('drag', (e: any) => {

                // 先进行吸附处理（确定吸附点）
                let latlng = marker.getLatLng();
                if (this.IsEnableSnap()) {
                    const { snappedLatLng } = this.applySnapWithTarget(marker.getLatLng());
                    latlng = snappedLatLng;
                }
                // 第一个点是中点，中点的拖动执行的操作是平移。非中点执行的是调整圆形大小
                if (pointIndex === 0) {
                    if (this.isDragging && this.dragStartLatLng) {
                        const deltaLat = e.latlng.lat - this.dragStartLatLng.lat;
                        const deltaLng = e.latlng.lng - this.dragStartLatLng.lng;

                        this.vertexMarkers.forEach(marker => {
                            const old = marker.getLatLng();
                            marker.setLatLng([old.lat + deltaLat, old.lng + deltaLng]);
                        });

                        this.renderLayerFromMarkers()

                        this.dragStartLatLng = e.latlng; // 连续拖动
                    }
                } else {
                    marker.setLatLng(latlng);
                    this.renderLayerFromMarkers();
                }
            });

            // 拖动结束后记录历史
            marker.on('dragend', () => {
                if (pointIndex === 0) {
                    if (this.isDragging) {
                        this.isDragging = false;
                        this.dragStartLatLng = null;
                        this.map.dragging.enable();
                        this.renderLayerFromMarkers();
                    }
                }
                // 1. 移除可能存在的高亮
                this.clearSnapHighlights();
                // 2. 更新历史记录
                this.pushHistoryFromMarkers();
            });

            this.vertexMarkers.push(marker);
        })
        // 2：渲染中点和半径之间的虚线
        this.renderDashLineLayer(coords);

    }


    protected exitEditMode(): void {
        this.tempCoords = [];
        // 移除所有顶点 marker
        this.vertexMarkers.forEach(marker => {
            this.map.removeLayer(marker);
            this.tempCoords.push([marker.getLatLng().lat, marker.getLatLng().lng]); // 退出编辑后，还要保存最后一次的坐标点，因为开启编辑时，还得恢复。
        });
        this.vertexMarkers = [];
        // 移除虚线图层
        this.removeDashLineLayer();
    }


    protected setLayerVisibility(visible: boolean): void {
        this.layerVisble = visible;
        if (visible) {
            this.show();
        } else {
            this.hide();
        }
    }

    /** 显示图层
     *
     *
     * @private
     * @memberof PolylineEditor
     */
    private show() {
        if (this.layer) {
            this.layer.setStyle({
                fillColor: "#008BFF", // 设置填充颜色
                fillOpacity: 0.3, // 设置填充透明度
                color: '#008BFF', // 设置边线颜色
                weight: 2, // 边线宽度
            })
        }
    }

    /** 隐藏图层
     *
     *
     * @private
     * @memberof PolylineEditor
     */
    private hide() {
        if (this.layer) {
            this.layer.setStyle({
                fillColor: "#008BFF", // 设置填充颜色
                fillOpacity: 0, // 设置填充透明度
                color: '#008BFF', // 设置边线颜色
                weight: 0, // 边线宽度
            })
        }
        // ✅ 退出编辑状态（若存在）
        if (this.currentState === EditorState.Editing) {
            this.exitEditMode();
            this.updateAndNotifyStateChange(EditorState.Idle);
        }
    }

    private renderLayerFromMarkers() {
        const coords = this.getCurrentMarkerCoords()
        const { isValid } = this.getCenterAndRadiusByCoordArr(coords);
        this.renderLayer(coords, isValid);
        this.renderDashLineLayer(coords);
    }

    private pushHistoryFromMarkers() {
        const coords = this.getCurrentMarkerCoords()
        this.historyStack.push(coords);
    }
    // 虚线图层
    private renderDashLineLayer(coords: number[][]) {
        const enableRanderDashLine = this.editOptions?.circle_LinkRadiusAndCenterDashLineOptions?.enabled;
        if (!enableRanderDashLine) return;

        if (this.dashLineLayer) {
            this.dashLineLayer.setLatLngs(coords as LatLngExpression[]);
        } else {
            // 要么使用注释的这个，即使用和自身图层样式一致的样式，或者使用用户传递进来的样式。
            // const { isValid } = this.getCenterAndRadiusByCoordArr(this.tempCoords);
            // const layerStyle = this.getLayerStyle(isValid);
            const labelStyle = this.editOptions?.circle_LinkRadiusAndCenterDashLineOptions?.dashLineStyle || {};
            this.dashLineLayer = new Polyline(coords as LatLngExpression[], {
                dashArray: [5, 5],
                color: '#008BFF',
                weight: 2,
                ...labelStyle
            });
            if (this.map) {
                this.dashLineLayer.addTo(this.map);
            }
        }
    }

    private removeDashLineLayer() {
        const enableRanderDashLine = this.editOptions?.circle_LinkRadiusAndCenterDashLineOptions?.enabled;
        if (!enableRanderDashLine) return;

        if (this.dashLineLayer && this.map) {
            this.map.removeLayer(this.dashLineLayer)
            this.dashLineLayer = null;
        }
    }

    // #endregion
}