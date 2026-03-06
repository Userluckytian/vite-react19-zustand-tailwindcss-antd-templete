
import { bboxPolygon, booleanPointInPolygon, booleanValid, point } from "@turf/turf";
import { BaseEditor } from "../base/BaseEditor";
import { EditorState, type LeafletEditorOptions } from "../types";
import { buildMarkerIcon, isClickOnLayer, reverseRectLatLngs } from "../utils/commonUtils";
import * as L from 'leaflet';
import type { BBox } from "geojson";
import { LeafletTopology } from "@/components/custom-leaflet-draw/topo/topo";

export default class RectangleEditor extends BaseEditor<L.Rectangle> {


    // #region 暂时未使用的部分
    protected midpointMarkers: any[];  // 矩形暂时不实现这个
    // #endregion


    protected isDraggingPolygon = false; // 是否是拖动多边形
    protected dragStartLatLng: L.LatLng | null = null; // 拖动多边形时，用户鼠标按下（mousedown）那一刻的坐标点，然后鼠标移动（mousemove）时，遍历全部的marker，做坐标偏移计算。

    protected vertexMarkers: L.Marker[] = []; // 存储顶点标记的数组
    protected historyStack: number[][][] = []; // 历史记录，存储快照
    protected redoStack: number[][][] = []; // 重做记录，存储快照

    private tempCoords: L.LatLng[] = [];
    private lastMoveCoord: L.LatLng | null = null; // 存储鼠标移动的最后一个点的坐标信息


    constructor(map: L.Map, options?: LeafletEditorOptions) {
        super(map, options);
        if (this.map) {
            // 创建时激活
            this.activate();
            const existGeometry = !!options?.defaultGeometry;
            // 初始化时，设置绘制状态为true(双击结束绘制时关闭绘制状态，其生命周期到头，且不再改变)，且发出状态通知
            this.updateAndNotifyStateChange(existGeometry ? EditorState.Idle : EditorState.Drawing);
            // 鼠标手势设置为十字

            this.map.getContainer().style.cursor = existGeometry ? 'grab' : 'crosshair';
            // 不需要设置十字光标和禁用双击放大（先考虑让用户自己去写，里面不再控制）
            // existGeometry ? this.map.doubleClickZoom.enable() : this.map.doubleClickZoom.disable();
            this.initLayer(options?.defaultStyle, options?.defaultGeometry);
            this.bindMapEvents(this.map);
        }
    }

    protected initLayer<U extends L.LayerOptions>(layerOptions: U, geometry?: GeoJSON.Geometry): void {
        // 试图给一个非法的经纬度，来测试是否leaflet直接抛出异常。如果不行，后续使用[[-90, -180], [-90, -180]]坐标，也就是页面的左下角
        const polylineOptions = this.getLayerStyle();
        let coords: L.LatLngBoundsExpression = [[181, 181], [182, 182]]; // 默认空图形
        if (geometry) {
            coords = reverseRectLatLngs(geometry);
        }
        this.layer = L.rectangle(coords, polylineOptions);
        this.layer.addTo(this.map);
        this.initPolygonEvent();
        // 设置吸附源（排除当前图层） 
        if (this.IsEnableSnap()) {
            this.setSnapSources([this.layer]);
        }
    }

    /** 渲染图层
     *
     *
     * @private
     * @param { [][]} coords
     * @memberof LeafletEditRectangle
     */
    protected renderLayer(coords: any[], valid: boolean = true): void {
        if (this.layer) {
            const layerStyle = this.getLayerStyle(valid);
            this.layer.setStyle(layerStyle);
            const bounds = L.latLngBounds(coords);
            this.layer.setBounds(bounds);
        } else {
            throw new Error('图层不存在，无法渲染');
        }
    }

    /** 根据坐标重建 marker 和图形
     * 
     * @param latlngs 坐标数组
     */
    protected reBuildMarker(latlngs: number[][]): void {
        // 清除旧 marker
        this.vertexMarkers.forEach(m => this.map.removeLayer(m));
        this.vertexMarkers = [];

        // 确保有4个顶点（矩形的四个角）
        let corners: L.LatLng[];
        if (latlngs.length === 2) {
            // 如果是2个点（对角点），计算4个角
            const [coord1, coord2] = latlngs;
            const lat1 = coord1[0], lng1 = coord1[1];
            const lat2 = coord2[0], lng2 = coord2[1];

            const top = Math.max(lat1, lat2);
            const bottom = Math.min(lat1, lat2);
            const left = Math.min(lng1, lng2);
            const right = Math.max(lng1, lng2);

            corners = [
                L.latLng(top, left),    // 左上
                L.latLng(top, right),   // 右上
                L.latLng(bottom, right), // 右下
                L.latLng(bottom, left)  // 左下
            ];
        } else if (latlngs.length === 4) {
            // 如果已经是4个点，直接使用
            corners = latlngs.map(coord => L.latLng(coord[0], coord[1]));
        } else {
            console.error('无效的坐标数量:', latlngs.length);
            return;
        }

        // 构建4个顶点的 marker
        corners.forEach((latlng, index) => {
            const marker = L.marker(latlng, {
                draggable: true,
                icon: buildMarkerIcon()
            }).addTo(this.map);

            this.vertexMarkers.push(marker);
            this.bindMarkerEvents(marker, index);
        });

    }

    /** 绑定 marker 事件 */
    private bindMarkerEvents(marker: L.Marker, index: number): void {
        marker.on('drag', () => {
            // 应用吸附
            const { snappedLatLng: newLatLng } = this.applySnapWithTarget(marker.getLatLng());
            // 更新当前拖动的 marker
            marker.setLatLng(newLatLng);


            // 重新计算矩形的四个角
            this.updateRectangleCorners(index, newLatLng);
        });

        marker.on('dragend', () => {
            // 拖动结束时清除吸附高亮
            this.clearSnapHighlights();
            // 更新历史记录
            const updated = this.vertexMarkers.map(m => [m.getLatLng().lat, m.getLatLng().lng]);
            this.historyStack.push([...updated]);
        });
    }

    protected updateMidpoints(skipMarker?: L.Marker): void { }

    /** 根据坐标重建 marker 和图形 + 重新渲染图层
     * 
     * @param latlngs 坐标数组
     */
    protected reBuildMarkerAndRender(latlngs: number[][]): void {
        // 1. 重新渲染矩形
        this.renderLayerFromCoords(latlngs);

        // 2. 重新构建顶点标记
        this.reBuildMarker(latlngs);
    }
    /** 初始化地图事件监听
     *
     *
     * @private
     * @param {L.Map} map 地图对象
     * @memberof LeafletEditRectangle
     */
    protected bindMapEvents(map: L.Map): void {
        // 绘制操作会用到这俩
        map.on('click', this.mapClickEvent);
        map.on('mousemove', this.mapMouseMoveEvent);
        // -----分割线--------
        // [编辑操作]会用到双击事件
        map.on('dblclick', this.mapDblClickEvent);
        // 拖动面用的这个
        map.on('mouseup', this.mapMouseUpEvent);
    }

    /** 关闭地图事件监听
     *
     *
     * @protected
     * @param {L.Map} map 地图对象
     * @memberof LeafletEditRectangle
     */
    protected offMapEvents(map: L.Map): void {
        // 绘制操作会用到这俩
        map.off('click', this.mapClickEvent);
        map.off('mousemove', this.mapMouseMoveEvent);
        // 编辑操作会用到双击事件
        map.off('dblclick', this.mapDblClickEvent);
        // 拖动面用的这个
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

    /** 进入编辑模式
     * 1: 更新编辑状态变量 
     * 2: 构建marker点 
     * 3: 给marker添加拖动事件
     *
     * @private 
     * @return {*}  {void}
     * @memberof LeafletEditRectangle
     */
    protected enterEditMode(): void {

        if (!this.layer) return;

        const bounds = this.layer.getBounds();
        const corners = [
            bounds.getNorthWest(), // 左上
            bounds.getNorthEast(), // 右上
            bounds.getSouthEast(), // 右下
            bounds.getSouthWest()  // 左下
        ];

        const coords: number[][] = corners.map(p => [p.lat, p.lng]);
        // 记录初始快照
        this.historyStack.push(coords);
        // 清空重做栈
        this.redoStack = [];

        // 设置吸附源（排除当前图层） 
        if (this.IsEnableSnap()) {
            this.setSnapSources([this.layer]);
        }

        // 渲染每个顶点为可拖动 marker
        this.reBuildMarker(coords)
    }

    /** 退出编辑模式
     * 进入编辑模式时，事件内部绑定了三个事件（drag、dragend、contextmenu），
     * 事件绑定之后是需要解绑的，不过Leaflet 的事件绑定是和对象实例绑定的，
     * 一旦你调用 map.removeLayer(marker)，
     * 这个 marker 就被销毁了，它的事件也随之失效， 
     * 所以你只需要在 exitEditMode() 中清理掉 vertexMarkers，
     * 就可以完成“事件解绑”的效果
     * 
     * @private
     * @memberof LeafletEditRectangle
     */
    public exitEditMode(): void {
        // 移除真实拐点Marker
        this.vertexMarkers.forEach(marker => {
            this.map.removeLayer(marker); // 移除 marker，会默认清除Marker自身的事件
        });
        this.vertexMarkers = [];
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

    /** 实例化矩形图层事件
     *
     *
     * @private
     * @memberof LeafletEditRectangle
     */
    private initPolygonEvent() {

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
     * @memberof LeafletEditRectangle
     */
    private mapClickEvent = (e: L.LeafletMouseEvent) => {
        // 关键：只有激活的实例才处理事件
        if (!this.isActive()) return;
        // 绘制时的逻辑
        if (this.currentState === EditorState.Drawing) {
            if (this.tempCoords.length === 0) {
                let point = e.latlng;
                if (this.IsEnableSnap()) {
                    const { snappedLatLng } = this.applySnapWithTarget(e.latlng);
                    point = snappedLatLng;
                }
                this.tempCoords.push(point);
            } else {
                // 添加吸附处理
                let point = e.latlng;
                if (this.IsEnableSnap()) {
                    const { snappedLatLng } = this.applySnapWithTarget(e.latlng);
                    point = snappedLatLng;
                }
                const finalCoords = [this.tempCoords[0], point];
                const isValid = this.isValidRectangle(finalCoords);
                if (isValid) {
                    // 校验通过，完成绘制
                    this.finishedDraw(finalCoords)
                } else {
                    // 校验失败，保持绘制状态（不执行reset）
                    throw new Error('绘制的矩形无效，请调整');
                    // 用户可以继续移动鼠标调整
                }
            }
        }
    }


    /**  地图双击事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletEditRectangle
     */
    private mapDblClickEvent = (e: L.LeafletMouseEvent) => {
        // 关键：只有激活的实例才处理事件
        if (!this.canConsume(e)) return;
        if (!this.layer) throw new Error('图层实例化失败，无法完成图层创建，请重试');
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

    /**  地图鼠标移动事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletEditRectangle
     */
    private mapMouseMoveEvent = (e: L.LeafletMouseEvent) => {
        // 关键：只有激活的实例才处理事件
        if (!this.isActive()) return;
        if (this.currentState === EditorState.Drawing) {
            this.lastMoveCoord = e.latlng;
            if (this.IsEnableSnap()) {
                const { snappedLatLng } = this.applySnapWithTarget(e.latlng);
                this.lastMoveCoord = snappedLatLng;
            }
            // 1：一个点也没有时，我们移动事件，也什么也不做。
            if (!this.tempCoords.length) return;
            // 2：只有一个点时，我们只保留第一个点和此刻移动结束的点。
            if (this.tempCoords.length > 0) {
                const movedPathCoords = [...this.tempCoords, this.lastMoveCoord];
                const isValid = this.isValidRectangle(movedPathCoords);
                // 实时渲染
                this.renderLayer(movedPathCoords, isValid);
            }
        }
        // 编辑时的逻辑
        if (this.currentState === EditorState.Editing) {
            // 事件机制1：拖动机制时的事件。
            if (this.isDraggingPolygon && this.dragStartLatLng) {
                const deltaLat = e.latlng.lat - this.dragStartLatLng.lat;
                const deltaLng = e.latlng.lng - this.dragStartLatLng.lng;

                this.vertexMarkers.forEach(marker => {
                    const old = marker.getLatLng();
                    marker.setLatLng([old.lat + deltaLat, old.lng + deltaLng]);
                });

                const updated = this.getCurrentMarkerCoords();
                this.renderLayerFromCoords(updated);

                this.dragStartLatLng = e.latlng; // 连续拖动
            }
        }
    }

    /**  地图鼠标抬起事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletEditRectangle
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
                const updated = this.vertexMarkers.map(m => [m.getLatLng().lat, m.getLatLng().lng]);
                this.renderLayerFromCoords(updated); // 可更新也可不更新，因为mousemove的最后一次可以理解为已经更新过了
                this.historyStack.push(updated);
                return;
            }
        }
    }

    /** 使用 turf.booleanValid 校验矩形有效性
     *
     *
     * @private
     * @param {L.LatLng[]} coords
     * @return {*}  {boolean}
     * @memberof LeafletRectangle
     */
    protected isValidRectangle(coords: L.LatLng[]): boolean {
        if (coords.length < 2) return false;

        const point1 = coords[0];
        const point2 = coords[1];

        // 快速检查：距离是否过小
        if (point1.distanceTo(point2) < 0.1) {
            return false;
        }

        try {
            // 使用 turf 进行专业校验
            const bounds = L.latLngBounds(coords);
            const bbox: BBox = [
                bounds.getWest(),
                bounds.getSouth(),
                bounds.getEast(),
                bounds.getNorth()
            ];

            const rectanglePolygon = bboxPolygon(bbox);
            return booleanValid(rectanglePolygon);

        } catch (error) {
            return false;
        }
    }

    /** 完成绘制
     *
     *
     * @private
     * @param {L.LatLng[]} finalCoords
     * @memberof LeafletRectangleEditor
     */
    private finishedDraw(finalCoords: L.LatLng[]): void {
        this.renderLayer(finalCoords);
        this.tempCoords = []; // 清空吧，虽然不清空也没事，毕竟后面就不使用了
        this.lastMoveCoord = null; // 清空吧，虽然不清空也没事，毕竟后面就不使用了
        this.reset();
        // 移除（吸附后）可能存在的高亮
        this.clearSnapHighlights();
        // 设置为空闲状态，并发出状态通知- 61 + 
        this.updateAndNotifyStateChange(EditorState.Idle);
    }

    /** 双击事件是否可以继续执行
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @return {*}  {boolean}
     * @memberof RectangleEditor
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

    /** 获取当前 marker 坐标
     *
     *
     * @protected
     * @return {*} 
     * @memberof PolygonEditor
     */
    protected getCurrentMarkerCoords(): number[][] {
        // 读取当前 marker 坐标，构建完整结构 [面][环][点][latlng]
        const current = this.vertexMarkers.map(marker => [marker.getLatLng().lat, marker.getLatLng().lng]);
        return current;
    }

    /**
     * 进入编辑模式
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

    /** 绘制时撤销最后一个顶点
     *
     *
     * @return {*}  {boolean}
     * @memberof RectangleEditor
     */
    public undoDraw(): boolean {
        if (this.currentState !== EditorState.Drawing)
            return false;

        if (this.tempCoords.length > 0) {
            // 移除最后一个点
            this.tempCoords.pop();
            this.lastMoveCoord = null;

            if (this.tempCoords.length === 0) {
                // 构建无效点，等待用户重绘
                this.renderLayerFromCoords([[181, 181], [182, 182]]);
                return true;
            }

            return false;
        }

        return false;
    }

    /** 渲染图层-2
     * 
     * 
     * @private
     * @param { [][]} coords
     * @memberof LeafletEditRectangle
     */
    private renderLayerFromCoords(coords: number[][]): void {
        if (!this.layer) return;

        // 将 number[][] 转换为 L.LatLng[]
        const latlngs = coords.map(coord => L.latLng(coord[0], coord[1]));
        this.renderLayer(latlngs);
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
            fillOpacity: 0,
        };
        this.layer?.setStyle({ ...hideStyle, layerVisible: false } as any);
        // ✅ 退出编辑状态（若存在）
        if (this.currentState === EditorState.Editing) {
            this.exitEditMode();
            this.updateAndNotifyStateChange(EditorState.Idle);
        }
    }


    /** 更新矩形角点 */
    private updateRectangleCorners(draggedIndex: number, newLatLng: L.LatLng): void {
        // 获取所有当前坐标
        const currentCorners = this.vertexMarkers.map(m => m.getLatLng());

        // 根据拖动的角点重新计算矩形
        let newCorners: L.LatLng[];

        if (draggedIndex === 0) { // 左上角
            newCorners = [
                newLatLng,
                L.latLng(newLatLng.lat, currentCorners[1].lng),
                L.latLng(currentCorners[2].lat, currentCorners[1].lng),
                L.latLng(currentCorners[2].lat, newLatLng.lng)
            ];
        } else if (draggedIndex === 1) { // 右上角
            newCorners = [
                L.latLng(newLatLng.lat, currentCorners[0].lng),
                newLatLng,
                L.latLng(currentCorners[2].lat, newLatLng.lng),
                L.latLng(currentCorners[2].lat, currentCorners[0].lng)
            ];
        } else if (draggedIndex === 2) { // 右下角
            newCorners = [
                L.latLng(currentCorners[0].lat, currentCorners[0].lng),
                L.latLng(currentCorners[0].lat, newLatLng.lng),
                newLatLng,
                L.latLng(newLatLng.lat, currentCorners[0].lng)
            ];
        } else { // 左下角
            newCorners = [
                L.latLng(currentCorners[0].lat, newLatLng.lng),
                L.latLng(currentCorners[0].lat, currentCorners[1].lng),
                L.latLng(newLatLng.lat, currentCorners[1].lng),
                newLatLng
            ];
        }

        // 更新所有 marker 位置
        newCorners.forEach((latlng, i) => {
            this.vertexMarkers[i].setLatLng(latlng);
        });

        // 重新渲染矩形
        this.renderLayer(newCorners);
    }
    // #endregion


}