/* 本组件，设计初衷是用作编辑工具的。
 * 既然是编辑工具，目前能想到的用户使用场景：
 * 1：双击激活编辑逻辑。
 * 2：编辑时，支持拖动。
 * 3：绘制状态，外部ui要展示取消按钮，编辑状态，外部ui要展示编辑工具条，所以需要添加事件回调机制，外部监听状态的改变进行响应的ui调整
 * 4: 用户希望传入默认的空间geometry数据，那构造函数需要支持。
 * */
/* 代码量很多，作者做的时候，是先梳理实现了绘制的功能，然后再梳理增加编辑的功能。按照我的思路去看代码把，不然太多容易乱 */
import { booleanPointInPolygon, point } from '@turf/turf';
import * as L from 'leaflet';
import { PolygonEditorState } from '../types';
import { SimpleBaseEditor } from './SimpleBaseEditor';


export default class LeafletEditPolygon extends SimpleBaseEditor {

    private polygonLayer: L.Polygon | null = null;
    // 图层初始化时
    private drawLayerStyle = {
        color: 'red', // 设置边线颜色
        fillColor: "red", // 设置填充颜色
        fillOpacity: 0.3, // 设置填充透明度
    };
    private tempCoords: number[][] = [];

    /** 创建一个多边形编辑类
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
            // 不需要设置十字光标和禁用双击放大
            existGeometry ? this.map.doubleClickZoom.enable() : this.map.doubleClickZoom.disable();
            this.initLayers(options, existGeometry ? defaultGeometry : undefined);
            this.initMapEvent(this.map);
        }
    }

    // 初始化图层
    private initLayers(options: L.PolylineOptions, defaultGeometry?: GeoJSON.Geometry): void {
        // 试图给一个非法的经纬度，来测试是否leaflet直接抛出异常。如果不行，后续使用[[-90, -180], [-90, -180], [-90, -180], [-90, -180]]坐标，也就是页面的左下角
        const polygonOptions: L.PolylineOptions = {
            pane: 'overlayPane',
            ...this.drawLayerStyle,
            ...options
        };

        let coords: L.LatLngExpression[] | L.LatLngExpression[][] | L.LatLngExpression[][][] = [[181, 181], [181, 181], [181, 181], [181, 181]]; // 默认空图形
        if (defaultGeometry) {
            coords = this.convertGeoJSONToLatLngs(defaultGeometry);
        }
        this.polygonLayer = L.polygon(coords, polygonOptions);
        this.polygonLayer.addTo(this.map);
        this.initPolygonEvent();
    }

    /** 实例化面图层事件
     *
     *
     * @private
     * @memberof LeafletEditPolygon
     */
    private initPolygonEvent() {

        if (this.polygonLayer) {
            this.polygonLayer.on('mousedown', (e: L.LeafletMouseEvent) => {
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
     * @memberof LeafletEditPolygon
     */
    private initMapEvent(map: L.Map) {
        // 绘制、编辑用前三个
        map.on('click', this.mapClickEvent);
        map.on('dblclick', this.mapDblClickEvent);
        map.on('mousemove', this.mapMouseMoveEvent);
        // 拖动面用的这个
        map.on('mouseup', this.mapMouseUpEvent);
    }

    // #region 工具函数，点图层的逻辑只需要看上面的内容就行了
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
        if (this.currentState === PolygonEditorState.Drawing) {
            this.tempCoords.push([e.latlng.lat, e.latlng.lng])
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
        if (!this.polygonLayer) throw new Error('面图层实例化失败，无法完成图层创建，请重试');
        // 情况1： 正在绘制状态时，绘制的逻辑
        if (this.currentState === PolygonEditorState.Drawing) {
            // 渲染图层, 先剔除重复坐标，双击事件实际触发了2次单机事件，所以，需要剔除重复坐标
            const finalCoords = this.deduplicateCoordinates(this.tempCoords);
            this.renderLayer([...finalCoords, finalCoords[0]]);
            this.tempCoords = []; // 清空吧，虽然不清空也没事，毕竟后面就不使用了
            this.reset();
            // 设置为空闲状态，并发出状态通知
            this.updateAndNotifyStateChange(PolygonEditorState.Idle);
            return;
        } else {
            // 情况 2：已绘制完成后的后续双击事件的逻辑均走这个
            const clickedLatLng = e.latlng;
            const polygonGeoJSON = this.polygonLayer.toGeoJSON();
            // 判断用户是否点击到了面上，是的话，就开始编辑模式
            const turfPoint = point([clickedLatLng.lng, clickedLatLng.lat]);
            const isInside = booleanPointInPolygon(turfPoint, polygonGeoJSON);
            if (isInside && this.currentState !== PolygonEditorState.Editing) {
                // 1：禁用双击地图放大功能
                this.map.doubleClickZoom.disable();
                // 2：状态变更，并发出状态通知
                this.updateAndNotifyStateChange(PolygonEditorState.Editing);
                // 3: 设置当前激活态是本实例，因为事件监听和激活态实例是关联的，只有激活的实例才处理事件
                this.isActive()
                // 4: 进入编辑模式
                this.enterEditMode();

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
        if (this.currentState === PolygonEditorState.Drawing) {
            if (!this.tempCoords.length) return;
            const lastMoveEndPoint: L.LatLngExpression = [e.latlng.lat, e.latlng.lng];
            // 1：一个点也没有时，我们移动事件，也什么也不做。
            // 2：只有一个点时，我们只保留第一个点和此刻移动结束的点。
            if (this.tempCoords.length === 1) {
                this.tempCoords = [this.tempCoords[0], lastMoveEndPoint]
            }
            // 3：有两个及以上的点时，我们删掉在只有一个点时，塞入的最后移动的那个点，也就是前一个if语句中塞入的那个点，然后添加此刻移动结束的点。
            const fixedPoints = this.tempCoords.slice(0, this.tempCoords.length - 1); // 除最后一个点外的所有点
            this.tempCoords = [...fixedPoints, lastMoveEndPoint];
            // 实时渲染
            this.renderLayer(this.tempCoords);
            return;
        }
        // 逻辑2：编辑状态下的逻辑（编辑状态下如果分多个逻辑，需要定义新的变量用于区分。但这些都是在编辑状态下才会执行）
        if (this.currentState === PolygonEditorState.Editing) {
            // 🎯 编辑模式下的逻辑（可扩展），例如：拖动整个面时显示辅助线、吸附提示等
            // 事件机制1：拖动机制时的事件。
            if (this.isDraggingPolygon && this.dragStartLatLng) {
                const deltaLat = e.latlng.lat - this.dragStartLatLng.lat;
                const deltaLng = e.latlng.lng - this.dragStartLatLng.lng;

                this.vertexMarkers.forEach(marker => {
                    const old = marker.getLatLng();
                    marker.setLatLng([old.lat + deltaLat, old.lng + deltaLng]);
                });

                const updated = this.vertexMarkers.map(m => [m.getLatLng().lat, m.getLatLng().lng]);
                this.renderLayer([...updated, updated[0]]);
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
        if (this.currentState === PolygonEditorState.Editing) {
            // 条件1-1： 编辑状态下： 拖动面的事件
            if (this.isDraggingPolygon) {
                this.isDraggingPolygon = false;
                this.dragStartLatLng = null;
                this.map.dragging.enable();
                const updated = this.vertexMarkers.map(m => [m.getLatLng().lat, m.getLatLng().lng]);
                this.renderLayer([...updated, updated[0]]);
                this.historyStack.push(updated);
                this.updateMidpoints();
                return;
            }
        }
    }
    /** 渲染图层
     *
     *
     * @private
     * @param { [][]} coords
     * @memberof LeafletEditPolygon
     */
    private renderLayer(coords: number[][]) {
        if (this.polygonLayer) {
            this.polygonLayer.setLatLngs(coords as any);
        } else {
            throw new Error('图层不存在，无法渲染');
        }
    }

    /** 返回图层的空间信息 
     * 
     * 担心用户在绘制后，想要获取到点位的经纬度信息，遂提供吐出geojson的方法
     * @memberof LeafletEditPolygon
     */
    public geojson() {
        if (this.polygonLayer) {
            return this.polygonLayer.toGeoJSON();
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
     * @memberof LeafletEditPolygon
     */
    public getLayer() {
        return this.polygonLayer;
    }

    /** 销毁图层，从地图中移除图层
     *
     *
     * @memberof LeafletEditPolygon
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
     * @memberof LeafletEditPolygon
     */
    private destroyLayer() {
        // 1.1清空坐标把，因为没什么用了
        this.tempCoords = [];
        // 1.2从地图中移除图层
        if (this.polygonLayer) {
            this.polygonLayer.remove();
            this.polygonLayer = null;
        }
    }


    /** 关闭地图事件监听
     *
     *
     * @private
     * @param {L.Map} map 地图对象
     * @memberof LeafletEditPolygon
     */
    private offMapEvent(map: L.Map) {
        map.off('click', this.mapClickEvent);
        map.off('dblclick', this.mapDblClickEvent);
        map.off('mousemove', this.mapMouseMoveEvent);
        map.off('mouseup', this.mapMouseUpEvent);
    }

    /**
     * 简单坐标去重 - 剔除连续重复坐标
     * @param {Array} coordinates - 坐标数组 [[lat, lng], [lat, lng], ...]
     * @param {number} precision - 精度（小数位数），默认6位
     * @returns {Array} 去重后的坐标数组
     */
    private deduplicateCoordinates(coordinates: string | any[], precision = 6) {
        if (!Array.isArray(coordinates) || coordinates.length === 0) {
            return [];
        }

        const result = [coordinates[0]]; // 总是保留第一个坐标

        for (let i = 1; i < coordinates.length; i++) {
            const current = coordinates[i];
            const previous = coordinates[i - 1];

            // 检查当前坐标是否与上一个坐标相同（在指定精度下）
            const isDuplicate =
                current[0].toFixed(precision) === previous[0].toFixed(precision) &&
                current[1].toFixed(precision) === previous[1].toFixed(precision);

            if (!isDuplicate) {
                result.push(current);
            }
        }

        return result;
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
     * @memberof LeafletEditPolygon
     */
    private enterEditMode(): void {

        if (!this.polygonLayer) return;

        const latlngs = this.polygonLayer.getLatLngs()[0] as L.LatLng[];
        const coords: number[][] = latlngs.map(p => [p.lat, p.lng]);
        // 记录初始快照
        this.historyStack.push(coords);

        // 渲染每个顶点为可拖动 marker
        this.reBuildMarker(coords)
        // 渲染边的中线点
        this.insertMidpointMarkers();
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
     * @memberof LeafletEditPolygon
     */
    public exitEditMode(): void {
        // 移除真实拐点Marker
        this.vertexMarkers.forEach(marker => {
            this.map.removeLayer(marker); // 移除 marker，会默认清除Marker自身的事件
        });
        this.vertexMarkers = [];
        // 移除边的中线点标记
        this.midpointMarkers.forEach(m => this.map.removeLayer(m));
        this.midpointMarkers = [];
    }

    /** 插入中间点坐标
     *
     *
     * @private
     * @return {*}  {void}
     * @memberof LeafletEditPolygon
     */
    private insertMidpointMarkers(): void {
        if (!this.polygonLayer || this.currentState !== PolygonEditorState.Editing) return;

        // 清除旧的中点标记（若数组中存在）
        this.midpointMarkers.forEach(m => this.map.removeLayer(m));
        this.midpointMarkers = [];

        const latlngs = this.vertexMarkers.map(m => m.getLatLng());

        for (let i = 0; i < latlngs.length; i++) {
            const nextIndex = (i + 1) % latlngs.length;
            const p1 = latlngs[i];
            const p2 = latlngs[nextIndex];

            const midpoint = L.latLng(
                (p1.lat + p2.lat) / 2,
                (p1.lng + p2.lng) / 2
            );

            const marker = L.circleMarker(midpoint, {
                radius: 6,
                color: '#ff0000',
                fillColor: '#ffffff',
                opacity: 0.8,
                fillOpacity: 0.8,
                weight: 1
            }).addTo(this.map);
            // 为什么不写成dragStart，因为circleMarker不支持拖动
            marker.on('click', () => {
                // 插入新顶点
                const insertIndex = nextIndex;
                const newMarker = L.marker(midpoint, { draggable: true, icon: this.buildMarkerIcon() }).addTo(this.map);

                newMarker.on('drag', () => {
                    const updated = this.vertexMarkers.map(m => [m.getLatLng().lat, m.getLatLng().lng]);
                    this.renderLayer([...updated, updated[0]]);
                    this.updateMidpoints();
                });

                newMarker.on('dragend', () => {
                    const updated = this.vertexMarkers.map(m => [m.getLatLng().lat, m.getLatLng().lng]);
                    this.historyStack.push(updated);
                });

                newMarker.on('contextmenu', () => {
                    if (this.vertexMarkers.length > 3) {
                        this.map.removeLayer(newMarker);
                        this.vertexMarkers = this.vertexMarkers.filter(m => m !== newMarker);
                        const updated = this.vertexMarkers.map(m => [m.getLatLng().lat, m.getLatLng().lng]);
                        this.renderLayer([...updated, updated[0]]);
                        this.historyStack.push(updated);
                        this.updateMidpoints();
                    }
                });

                this.vertexMarkers.splice(insertIndex, 0, newMarker);

                const updated = this.vertexMarkers.map(m => [m.getLatLng().lat, m.getLatLng().lng]);
                this.renderLayer([...updated, updated[0]]);
                this.historyStack.push(updated);

                // 重建中点标记
                this.insertMidpointMarkers();
            });

            this.midpointMarkers.push(marker);
        }
    }

    /** 实时更新中线点的位置
     *
     *
     * @private
     * @memberof LeafletEditPolygon
     */
    private updateMidpoints(): void {
        // 清除旧的中点
        this.midpointMarkers.forEach(m => this.map.removeLayer(m));
        this.midpointMarkers = [];

        // 重新插入
        this.insertMidpointMarkers();
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
        this.renderLayer([...latlngs, latlngs[0]]);

        this.reBuildMarker(latlngs);

        this.updateMidpoints();

    }

    /** 根据坐标重建 marker 和图形
     * 
     * @param latlngs 坐标数组
     */
    private reBuildMarker(latlngs: number[][]): void {
        // 清除旧 marker
        this.vertexMarkers.forEach(m => this.map.removeLayer(m));
        this.vertexMarkers = [];

        // 构建新 marker
        latlngs.forEach(coord => {
            const latlng = L.latLng(coord[0], coord[1]);
            const marker = L.marker(latlng, { draggable: true, icon: this.buildMarkerIcon() }).addTo(this.map);
            this.vertexMarkers.push(marker);
            // 下面这三个事件虽然被写在循环里了，但是事件里的内容并不是立刻执行的内容。
            marker.on('drag', (e: L.LeafletMouseEvent) => {
                const newLatLng = e.latlng;
                const updated = this.vertexMarkers.map(m => [m.getLatLng().lat, m.getLatLng().lng]);
                this.renderLayer([...updated, updated[0]]);
                this.updateMidpoints();
            });

            marker.on('dragend', () => {
                const updated = this.vertexMarkers.map(m => [m.getLatLng().lat, m.getLatLng().lng]);
                this.historyStack.push([...updated]);
            });

            marker.on('contextmenu', () => {
                if (this.vertexMarkers.length > 3) {
                    // 好奇marker的查找方式吗? 毕竟marker是一个对象呀。
                    // 解答：marker 是一个图层对象（L.Marker 实例），但在 JavaScript 中，对象是按引用存储的，所以实际比较的是地址，这俩实际指向同一个地址。     
                    const idx = this.vertexMarkers.findIndex(m => m === marker);
                    if (idx !== -1) {
                        this.map.removeLayer(marker);
                        this.vertexMarkers.splice(idx, 1);
                        const updated = this.vertexMarkers.map(m => [m.getLatLng().lat, m.getLatLng().lng]);
                        this.renderLayer([...updated, updated[0]]);
                        this.historyStack.push([...updated]);
                        this.updateMidpoints();
                    }
                }
            });
        });

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
        if (!this.polygonLayer) return false;

        try {
            const polygonGeoJSON = this.polygonLayer.toGeoJSON();
            const turfPoint = point([e.latlng.lng, e.latlng.lat]);
            return booleanPointInPolygon(turfPoint, polygonGeoJSON);
        } catch (error) {
            console.error('检查点击图层时出错:', error);
            return false;
        }
    }

    private canConsume(e: L.LeafletMouseEvent): boolean {
        if (!this.isActive()) {
            if (this.isClickOnMyLayer(e)) {
                // console.log('重新激活编辑器');
                this.activate();
                return true;
            } else {
                return false;
            }
        }
        return true;
    }

    private convertGeoJSONToLatLngs(geometry: GeoJSON.Geometry): L.LatLngExpression[] | L.LatLngExpression[][] | L.LatLngExpression[][][] {
        if (geometry.type === 'Polygon') {
            return geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
        } else if (geometry.type === 'MultiPolygon') {
            return geometry.coordinates[0][0].map(([lng, lat]) => [lat, lng]);
        } else {
            throw new Error('不支持的 geometry 类型: ' + geometry.type);
        }
    }

    // #endregion


}