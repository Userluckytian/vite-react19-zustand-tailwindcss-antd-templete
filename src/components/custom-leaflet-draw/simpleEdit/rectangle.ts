/* 本组件，设计初衷是用作编辑工具的。
 * 既然是编辑工具，目前能想到的用户使用场景：
 * 1：双击激活编辑逻辑。
 * 2：编辑时，支持拖动。
 * 3：绘制状态，外部ui要展示取消按钮，编辑状态，外部ui要展示编辑工具条，所以需要添加事件回调机制，外部监听状态的改变进行响应的ui调整
 * 4: 用户希望传入默认的空间geometry数据，那构造函数需要支持。
 * */
import * as L from 'leaflet';
import { PolygonEditorState } from '../types';
import { SimpleBaseEditor } from './SimpleBaseEditor';
import { booleanPointInPolygon, point } from '@turf/turf';

export default class LeafletEditRectangle extends SimpleBaseEditor {

    private rectangleLayer: L.Rectangle | null = null;
    // 图层初始化时
    private drawLayerStyle = {
        color: 'red', // 设置边线颜色
        fillColor: "red", // 设置填充颜色
        fillOpacity: 0.3, // 设置填充透明度
    };
    private tempCoords: L.LatLng[] = [];

    /** 创建一个矩形编辑类
     *
     * @param {L.Map} map 地图对象
     * @param {L.PolylineOptions} [options={}] 要构建的多边形的样式属性
     * @param {GeoJSON.Geometry} [defaultGeometry] 默认的空间信息
     * @memberof LeafletEditPolygon
     */
    constructor(map: L.Map, options: L.PolylineOptions = {}, defaultGeometry?: GeoJSON.Geometry) {
        super(map);
        if (this.map) {
            // 创建时激活
            this.activate();
            const existGeometry = !!defaultGeometry;
            // 初始化时，设置绘制状态为true(双击结束绘制时关闭绘制状态，其生命周期到头，且不再改变)，且发出状态通知
            this.updateAndNotifyStateChange(existGeometry ? PolygonEditorState.Idle : PolygonEditorState.Drawing);
            // 鼠标手势设置为十字
            this.map.getContainer().style.cursor = existGeometry ? 'grab' : 'crosshair';
            // 不需要设置十字光标和禁用双击放大（先考虑让用户自己去写，里面不再控制）
            // existGeometry ? this.map.doubleClickZoom.enable() : this.map.doubleClickZoom.disable();
            this.initLayers(options, existGeometry ? defaultGeometry : undefined);
            this.initMapEvent(this.map);
        }
    }

    // 初始化图层
    private initLayers(options: L.PolylineOptions, defaultGeometry?: GeoJSON.Geometry): void {
        // 试图给一个非法的经纬度，来测试是否leaflet直接抛出异常。如果不行，后续使用[[-90, -180], [-90, -180]]坐标，也就是页面的左下角
        const polylineOptions: L.PolylineOptions = {
            pane: 'overlayPane',
            ...this.drawLayerStyle,
            ...options
        };
        let coords: L.LatLngBoundsExpression = [[181, 181], [182, 182]]; // 默认空图形
        if (defaultGeometry) {
            coords = this.convertGeoJSONToLatLngs(defaultGeometry);
        }
        this.rectangleLayer = L.rectangle(coords, polylineOptions);
        this.rectangleLayer.addTo(this.map);
        this.initPolygonEvent();
    }

    /** 实例化矩形图层事件
     *
     *
     * @private
     * @memberof LeafletEditRectangle
     */
    private initPolygonEvent() {

        if (this.rectangleLayer) {

            this.rectangleLayer.on('mousedown', (e: L.LeafletMouseEvent) => {
                // 关键：只有激活的实例才处理事件
                if (!this.isActive()) return;
                if (this.currentState === PolygonEditorState.Editing) {
                    this.isDraggingPolygon = true;
                    this.dragStartLatLng = e.latlng;
                    this.map.dragging.disable();
                }
            });
        }
    }

    /** 初始化地图事件监听
     *
     *
     * @private
     * @param {L.Map} map 地图对象
     * @memberof LeafletEditRectangle
     */
    private initMapEvent(map: L.Map) {
        // 绘制操作会用到这俩
        map.on('click', this.mapClickEvent);
        map.on('mousemove', this.mapMouseMoveEvent);
        // 编辑操作会用到双击事件
        map.on('dblclick', this.mapDblClickEvent);
        // 拖动面用的这个
        map.on('mouseup', this.mapMouseUpEvent);
    }

    // #region 工具函数，点图层的逻辑只需要看上面的内容就行了
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
        if (this.currentState === PolygonEditorState.Drawing) {
            if (this.tempCoords.length === 0) {
                this.tempCoords.push(e.latlng)
            } else {
                const finalCoords = [this.tempCoords[0], e.latlng];
                this.renderLayer(finalCoords);
                this.tempCoords = []; // 清空吧，虽然不清空也没事，毕竟后面就不使用了
                this.reset();
                // 设置为空闲状态，并发出状态通知
                this.updateAndNotifyStateChange(PolygonEditorState.Idle);
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
        if (!this.rectangleLayer) throw new Error('图层实例化失败，无法完成图层创建，请重试');
        const clickedLatLng = e.latlng;
        const polygonGeoJSON = this.rectangleLayer.toGeoJSON();
        // 判断用户是否点击到了面上，是的话，就开始编辑模式
        const turfPoint = point([clickedLatLng.lng, clickedLatLng.lat]);
        const isInside = booleanPointInPolygon(turfPoint, polygonGeoJSON);
        if (isInside) {
            if (this.currentState !== PolygonEditorState.Editing) {
                // 1：禁用双击地图放大功能（先考虑让用户自己去写，里面不再控制）
                // this.map.doubleClickZoom.disable();
                // 2：状态变更，并发出状态通知
                this.updateAndNotifyStateChange(PolygonEditorState.Editing);
                // 3: 设置当前激活态是本实例，因为事件监听和激活态实例是关联的，只有激活的实例才处理事件
                this.isActive()
                // 4: 进入编辑模式
                this.enterEditMode();
            }
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
        if (this.currentState === PolygonEditorState.Drawing) {
            // 1：一个点也没有时，我们移动事件，也什么也不做。
            if (!this.tempCoords.length) return;
            const lastMoveEndPoint = e.latlng;
            // 2：只有一个点时，我们只保留第一个点和此刻移动结束的点。
            if (this.tempCoords.length > 0) {
                this.tempCoords = [this.tempCoords[0], lastMoveEndPoint]
            }
            // 实时渲染
            this.renderLayer(this.tempCoords);
        }
        // 编辑时的逻辑
        if (this.currentState === PolygonEditorState.Editing) {
            // 事件机制1：拖动机制时的事件。
            if (this.isDraggingPolygon && this.dragStartLatLng) {
                const deltaLat = e.latlng.lat - this.dragStartLatLng.lat;
                const deltaLng = e.latlng.lng - this.dragStartLatLng.lng;

                this.vertexMarkers.forEach(marker => {
                    const old = marker.getLatLng();
                    marker.setLatLng([old.lat + deltaLat, old.lng + deltaLng]);
                });

                const updated = this.vertexMarkers.map(m => [m.getLatLng().lat, m.getLatLng().lng]);
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
        if (this.currentState === PolygonEditorState.Editing) {
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

    /** 渲染图层
     *
     *
     * @private
     * @param { [][]} coords
     * @memberof LeafletEditRectangle
     */
    private renderLayer(coords: L.LatLng[]) {
        if (this.rectangleLayer) {
            const bounds = L.latLngBounds(coords);
            this.rectangleLayer.setBounds(bounds);
        } else {
            throw new Error('图层不存在，无法渲染');
        }
    }

    /** 渲染图层-2
     *
     *
     * @private
     * @param { [][]} coords
     * @memberof LeafletEditRectangle
     */
    private renderLayerFromCoords(coords: number[][]): void {
        if (!this.rectangleLayer) return;

        // 将 number[][] 转换为 L.LatLng[]
        const latlngs = coords.map(coord => L.latLng(coord[0], coord[1]));
        this.renderLayer(latlngs);
    }

    /** 返回图层的空间信息 
     * 
     * 担心用户在绘制后，想要获取到点位的经纬度信息，遂提供吐出geojson的方法
     * @memberof LeafletEditRectangle
     */
    public geojson() {
        if (this.rectangleLayer) {
            return this.rectangleLayer.toGeoJSON();
        } else {
            throw new Error("未捕获到图层，无法获取到geojson数据");
        }
    }

    /** 返回绘制的图层
     * 
     * 应用场景1： 地图上存在多个图层实例，每个图层的options属性中有其唯一id标识。现在若要删除其中一个图层，就需要先找到这个图层实例的options中存储的id标识，然后调用后台的删除接口。
     * 
     * 应用场景2： 更改图层样式。
     *
     * （简言之： 场景太多，索性直接返回图层对象即可）
     * @return {*} 
     * @memberof LeafletEditRectangle
     */
    public getLayer() {
        return this.rectangleLayer;
    }


    /** 销毁图层，从地图中移除图层
     *
     *
     * @memberof LeafletEditRectangle
     */
    public destroy() {

        // #region 1：绘制图层用到的内容
        this.destroyLayer();
        // #endregion
        // #region 2：编辑模式用到的内容
        // 关闭事件监听内容
        this.deactivate();
        // 编辑模式的内容也重置
        this.exitEditMode();
        // #endregion
        // #region3：地图相关内容处理（关闭事件监听，恢复部分交互功能【缩放、鼠标手势】）
        this.offMapEvent(this.map);
        this.reset();
        // #endregion
        // #region4：清除类自身绑定的相关事件
        this.clearAllStateListeners();
        // 设置为空闲状态，并发出状态通知
        this.updateAndNotifyStateChange(PolygonEditorState.Idle);
        // #endregion
    }


    /** 销毁绘制的图层
     *
     *
     * @private
     * @memberof LeafletEditRectangle
     */
    private destroyLayer() {
        // 1.1清空坐标把，因为没什么用了
        this.tempCoords = [];
        // 1.2从地图中移除图层
        if (this.rectangleLayer) {
            this.rectangleLayer.remove();
            this.rectangleLayer = null;
        }
    }

    /** 关闭地图事件监听
     *
     *
     * @private
     * @param {L.Map} map 地图对象
     * @memberof LeafletEditRectangle
     */
    private offMapEvent(map: L.Map) {
        // 绘制操作会用到这俩
        map.off('click', this.mapClickEvent);
        map.off('mousemove', this.mapMouseMoveEvent);
        // 编辑操作会用到双击事件
        map.off('dblclick', this.mapDblClickEvent);
        // 拖动面用的这个
        map.off('mouseup', this.mapMouseUpEvent);
    }

    // #endregion


    // #region 编辑用到的工具函数

    /** 进入编辑模式
     * 1: 更新编辑状态变量 
     * 2: 构建marker点 
     * 3: 给marker添加拖动事件
     *
     * @private 
     * @return {*}  {void}
     * @memberof LeafletEditRectangle
     */
    private enterEditMode(): void {

        if (!this.rectangleLayer) return;

        const bounds = this.rectangleLayer.getBounds();
        const corners = [
            bounds.getNorthWest(), // 左上
            bounds.getNorthEast(), // 右上
            bounds.getSouthEast(), // 右下
            bounds.getSouthWest()  // 左下
        ];

        const coords: number[][] = corners.map(p => [p.lat, p.lng]);
        // 记录初始快照
        this.historyStack.push(coords);

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



    /** 动态生成marker图标(天地图应该是构建的点图层+marker图层两个)
     *
     *
     * @private
     * @param {string} [iconStyle="border-radius: 50%;background: #ffffff;border: solid 3px red;"]
     * @param {L.PointExpression} [iconSize=[20, 20]]
     * @param {L.DivIconOptions} [options]
     * @return {*}  {L.DivIcon}
     * @memberof LeafletEditRectangle
     */
    private buildMarkerIcon(iconStyle = "border-radius: 50%;background: #ffffff;border: solid 3px red;", iconSize: number[] = [20, 20], options?: L.DivIconOptions): L.DivIcon {
        let defaultIconStyle = `width:${iconSize[0]}px; height: ${iconSize[1]}px;`
        return L.divIcon({
            className: 'edit-polygon-marker',
            html: `<div style="${iconStyle + defaultIconStyle}"></div>`,
            iconSize: iconSize as L.PointExpression,
            ...options
        });
    }

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
    /** 根据坐标重建 marker 和图形
     * 
     * @param latlngs 坐标数组
     */
    private reBuildMarker(latlngs: number[][]): void {
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
                icon: this.buildMarkerIcon()
            }).addTo(this.map);

            this.vertexMarkers.push(marker);
            this.bindMarkerEvents(marker, index);
        });

    }

    /** 绑定 marker 事件 */
    private bindMarkerEvents(marker: L.Marker, index: number): void {
        marker.on('drag', (e: L.LeafletMouseEvent) => {
            const newLatLng = e.latlng;

            // 更新当前拖动的 marker
            marker.setLatLng(newLatLng);

            // 重新计算矩形的四个角
            this.updateRectangleCorners(index, newLatLng);
        });

        marker.on('dragend', () => {
            const updated = this.vertexMarkers.map(m => [m.getLatLng().lat, m.getLatLng().lng]);
            this.historyStack.push([...updated]);
        });
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


    // #region 辅助函数

    /**  判断点击事件是否自己身上
     *
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @return {*}  {boolean}
     * @memberof LeafletEditRectangle
     */
    private isClickOnMyLayer(e: L.LeafletMouseEvent): boolean {
        if (!this.rectangleLayer) return false;

        try {
            const polygonGeoJSON = this.rectangleLayer.toGeoJSON();
            const turfPoint = point([e.latlng.lng, e.latlng.lat]);
            return booleanPointInPolygon(turfPoint, polygonGeoJSON);
        } catch (error) {
            console.error('检查点击图层时出错:', error);
            return false;
        }
    }

    private canConsume(e: L.LeafletMouseEvent): boolean {
        // 如果是绘制操作，则直接跳过判断，后面的逻辑是给编辑操作准备的
        if (this.currentState === PolygonEditorState.Drawing) return true;
        const clickIsSelf = this.isClickOnMyLayer(e);
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

    private convertGeoJSONToLatLngs(geometry: GeoJSON.Geometry): L.LatLngBoundsExpression {
        if (geometry.type === 'Polygon') {
            const coords = geometry.coordinates[0]; // [[lng, lat], ...]
            const lats = coords.map(c => c[1]);
            const lngs = coords.map(c => c[0]);

            const south = Math.min(...lats);
            const north = Math.max(...lats);
            const west = Math.min(...lngs);
            const east = Math.max(...lngs);

            return [[south, west], [north, east]];
        } else {
            throw new Error('不支持的 geometry 类型: ' + geometry.type);
        }
    }


    // #endregion

}