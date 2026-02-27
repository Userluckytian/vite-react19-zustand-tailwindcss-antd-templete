import * as L from 'leaflet';
import { PolygonEditorState, type LeafletToolsOptions, type MidpointPair, type SnapOptions } from '../types';
import { booleanPointInPolygon, point } from '@turf/turf';
import { BasePolygonEditor } from './BasePolygonEditor';
import { LeafletTopology } from '../topo/topo';
export default class LeafletPolygonEditor extends BasePolygonEditor {

    private polygonLayer: L.Polygon | null = null;
    // 图层初始化时
    private drawLayerStyle = {
        weight: 2,
        color: '#008BFF', // 设置边线颜色
        fillColor: "#008BFF", // 设置填充颜色
        fillOpacity: 0.3, // 设置填充透明度
        fill: true, // no fill color means default fill color (gray for `dot` and `circle` markers, transparent for `plus` and `star`)
    };

    // 图层无效时的样式
    private errorDrawLayerStyle = {
        weight: 2,
        color: 'red', // 设置边线颜色
        fillColor: "red", // 设置填充颜色
        fillOpacity: 0.3, // 设置填充透明度
        fill: true,
    };

    private tempCoords: number[][] = [];
    private lastMoveCoord: number[] = []; // 存储鼠标移动的最后一个点的坐标信息


    /** 创建一个多边形编辑类
     *
     * @param {L.Map} map 地图对象
     * @param {LeafletToolsOptions} [options={}] 要构建的多边形的样式属性以及额外自定义的信息
     * @param {GeoJSON.Geometry} [defaultGeometry] 默认的空间信息
     * @memberof LeafletEditPolygon
     */
    constructor(map: L.Map, options: LeafletToolsOptions = {}, defaultGeometry?: GeoJSON.Geometry) {
        if (!map) {
            throw new Error('地图实例不能为空');
        }
        super(map, {
            snap: options?.snap,
            edit: options?.edit,
            validation: options?.validation,
        });
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
            this.drawLayerStyle = { ...this.drawLayerStyle, ...options?.defaultStyle };
            this.errorDrawLayerStyle = { ...this.errorDrawLayerStyle, ...options?.validErrorPolygonStyle };
            this.initLayers(existGeometry ? defaultGeometry : undefined);
            this.initMapEvent(this.map);
        }
    }

    // 初始化图层
    private initLayers(defaultGeometry?: GeoJSON.Geometry): void {
        // 试图给一个非法的经纬度，来测试是否leaflet直接抛出异常。如果不行，后续使用[[-90, -180], [-90, -180], [-90, -180], [-90, -180]]坐标，也就是页面的左下角
        const polygonOptions = {
            pane: 'overlayPane',
            layerVisible: true, // 增加了一个自定义属性，用于用户从图层层面获取图层的显隐状态
            defaultStyle: this.drawLayerStyle,
            ...this.drawLayerStyle,
        };

        let coords: L.LatLngExpression[] | L.LatLngExpression[][] | L.LatLngExpression[][][] = [[181, 181], [181, 181], [181, 181], [181, 181]]; // 默认空图形
        if (defaultGeometry) {
            coords = this.convertGeoJSONToLatLngs(defaultGeometry);
        }
        this.polygonLayer = L.polygon(coords, polygonOptions);
        this.polygonLayer.addTo(this.map);
        this.initPolygonEvent();
        // 设置吸附源（排除当前图层） 
        if (this.IsEnableSnap()) {
            this.setSnapSources([this.polygonLayer]);
        }
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

    // #region 绘制用到的工具函数
    public undoDraw(): boolean {
        if (this.currentState !== PolygonEditorState.Drawing)
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
        if (!this.polygonLayer) throw new Error('面图层实例化失败，无法完成图层创建，请重试');
        // 情况1： 正在绘制状态时，绘制的逻辑
        if (this.currentState === PolygonEditorState.Drawing) {
            const lastCoord = [e.latlng.lat, e.latlng.lng];
            // 渲染图层, 先剔除重复坐标，双击事件实际触发了2次单机事件，所以，需要剔除重复坐标
            const ringCoords = [...this.tempCoords, lastCoord, this.tempCoords[0]];
            const finalCoords: number[][] = this.deduplicateCoordinates(ringCoords);
            if (this.isValidPolygon(finalCoords)) {
                this.finishedDraw(finalCoords);
            } else {
                // 校验失败，保持绘制状态
                throw new Error('绘制面无效，请继续绘制或调整');
            }
        } else {
            // 情况 2：已绘制完成后的后续双击事件的逻辑均走这个
            const clickedLatLng = e.latlng;
            const polygonGeoJSON = this.polygonLayer.toGeoJSON();
            // 判断用户是否点击到了面上，是的话，就开始编辑模式
            const turfPoint = point([clickedLatLng.lng, clickedLatLng.lat]);
            const isInside = booleanPointInPolygon(turfPoint, polygonGeoJSON);
            if (isInside && this.currentState !== PolygonEditorState.Editing) {
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
        if (this.currentState === PolygonEditorState.Drawing) {
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
        if (this.currentState === PolygonEditorState.Editing) {
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

                const updated = this.vertexMarkers.map(polygon =>
                    polygon.map(ring =>
                        ring.map(marker => [marker.getLatLng().lat, marker.getLatLng().lng])
                    ));
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
        if (this.currentState === PolygonEditorState.Editing) {
            // 条件1-1： 编辑状态下： 拖动面的事件
            if (this.isDraggingPolygon) {
                this.isDraggingPolygon = false;
                this.dragStartLatLng = null;
                this.map.dragging.enable();
                const updated = this.vertexMarkers.map(polygon =>
                    polygon.map(ring =>
                        ring.map(marker => [marker.getLatLng().lat, marker.getLatLng().lng])
                    )
                );

                this.renderLayer(updated);
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
    private renderLayer(coords: number[][][][], valid: boolean = true): void {
        if (!this.polygonLayer) {
            throw new Error('图层不存在，无法渲染');
        }
        const latlngs = coords.map(polygon =>
            polygon.map(ring =>
                ring.map(([lat, lng]) => L.latLng(lat, lng))
            )
        );
        this.polygonLayer.setStyle(valid ? this.drawLayerStyle : this.errorDrawLayerStyle);
        this.polygonLayer.setLatLngs(latlngs as any);
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
        this.updateAndNotifyStateChange(PolygonEditorState.Idle);
    }


    /** 返回图层的空间信息 
     * 
     * 担心用户在绘制后，想要获取到点位的经纬度信息，遂提供吐出geojson的方法
     * @memberof LeafletEditPolygon
     */
    public geojson(precision?: number | false) {
        if (this.polygonLayer) {
            return this.polygonLayer.toGeoJSON(precision);
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

    /** 控制图层显示
     *
     *
     * @memberof LeafletEditPolygon
     */
    private show() {
        this.isVisible = true;
        // 使用用户默认设置的样式，而不是我自定义的！
        this.polygonLayer?.setStyle({ ...(this.polygonLayer.options as any).defaultStyle, layerVisible: true });
    }
    /** 控制图层隐藏
     *
    *
    * @memberof LeafletEditPolygon
    */
    private hide() {
        this.isVisible = false;
        const hideStyle = {
            color: 'red',
            weight: 0,
            fill: false, // no fill color means default fill color (gray for `dot` and `circle` markers, transparent for `plus` and `star`)
            fillColor: 'red', // same color as the line
            fillOpacity: 0
        };
        this.polygonLayer?.setStyle({ ...hideStyle, layerVisible: false } as any);
        // ✅ 退出编辑状态（若存在）
        if (this.currentState === PolygonEditorState.Editing) {
            this.exitEditMode();
            this.updateAndNotifyStateChange(PolygonEditorState.Idle);
        }
    }


    /** 设置图层显隐
     *
     *
     * @param {boolean} visible
     * @memberof LeafletEditPolygon
     */
    public setVisible(visible: boolean) {
        if (visible) {
            this.show();
        } else {
            this.hide();
        }
    }

    /** 获取图层显隐
     *
     *
     * @param {boolean} visible
     * @memberof LeafletEditPolygon
     */
    public getLayerVisible(): boolean {
        return (this.polygonLayer?.options as any).layerVisible;
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

        // #region 3：吸附用到的内容
        this.cleanupSnapResources();
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
    private deduplicateCoordinates(coordinates: string | any[]) {
        if (!Array.isArray(coordinates) || coordinates.length === 0) {
            return [];
        }

        const result = [coordinates[0]]; // 总是保留第一个坐标

        for (let i = 1; i < coordinates.length; i++) {
            const current = coordinates[i];
            const previous = coordinates[i - 1];

            // 检查当前坐标是否与上一个坐标相同（在指定精度下）
            const isDuplicate = current[0] === previous[0] && current[1] === previous[1];

            if (!isDuplicate) {
                result.push(current);
            }
        }

        return result;
    }

    // #endregion

    // #region 编辑用到的工具函数

    /**
     * 检查是否可以进入编辑模式
     * @private
     */
    private canEnterEditMode(): boolean {
        // 基础检查
        if (!this.polygonEditOptions.enabled) return false;
        if (!this.polygonLayer) return false;
        if (this.currentState === PolygonEditorState.Editing) return false;
        if (!this.isVisible) return false;

        return true;
    }

    /**
     * 进入编辑模式
     * @public
     */
    public startEdit(): void {
        if (!this.canEnterEditMode()) return;
        // 1：禁用双击地图放大功能（先考虑让用户自己去写，里面不再控制）
        // this.map.doubleClickZoom.disable();
        // 2：状态变更，并发出状态通知
        this.updateAndNotifyStateChange(PolygonEditorState.Editing);
        // 3: 设置当前激活态是本实例，因为事件监听和激活态实例是关联的，只有激活的实例才处理事件
        this.isActive()
        // 4: 进入编辑模式
        this.enterEditMode();
    }


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

        const latlngs = this.polygonLayer.getLatLngs() as L.LatLng[][][] | L.LatLng[][];
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
            this.setSnapSources([this.polygonLayer]);
        }

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
        // 移除所有顶点 marker
        this.vertexMarkers.flat(2).forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.vertexMarkers = [];

        // 移除所有中点 marker
        this.removeAllMidPointMarkers();

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
    protected createInsertMidpointMarker(
        p1: L.Marker,
        p2: L.Marker,
        polygonIndex: number,
        ringIndex: number,
        insertIndex: number,
        positionRadio: number
    ): L.Marker {
        const midPoint = this.getFractionalPointOnEdge(p1.getLatLng(), p2.getLatLng(), positionRadio);

        const marker = L.marker(midPoint, this.polygonEditOptions.dragMidMarkerOptions!.dragMarkerStyle).addTo(this.map);

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
            const coords = this.vertexMarkers.map(polygon =>
                polygon.map(ring =>
                    ring.map(m => [m.getLatLng().lat, m.getLatLng().lng])
                )
            );

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
            const newMarker = L.marker(latlng, this.polygonEditOptions.vertexsMarkerStyle).addTo(this.map);

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
     * @param p1 起点 marker
     * @param p2 终点 marker
     * @param polygonIndex 多边形索引
     * @param ringIndex 环索引
     * @param {number} positionRadio 位置比率
     * @returns L.Marker
     */
    protected createEdgeDragMarker(
        p1: L.Marker,
        p2: L.Marker,
        polygonIndex: number,
        ringIndex: number,
        positionRadio: number
    ): L.Marker {
        const midDragPoint = this.getFractionalPointOnEdge(p1.getLatLng(), p2.getLatLng(), positionRadio);
        const marker = L.marker(midDragPoint, this.polygonEditOptions.dragLineMarkerOptions!.dragMarkerStyle).addTo(this.map);
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
    private reBuildMarker(coords: number[][][][]): void {
        // 清除旧的 marker
        this.vertexMarkers.flat(2).forEach(m => this.map.removeLayer(m));
        this.vertexMarkers = [];

        coords.forEach((polygon, polygonIndex) => {
            const polygonMarkers: L.Marker[][] = [];

            polygon.forEach((ring, ringIndex) => {
                const ringMarkers: L.Marker[] = [];

                ring.forEach((coord, pointIndex) => {
                    const latlng = L.latLng(coord[0], coord[1]);

                    const marker = L.marker(latlng, this.polygonEditOptions.vertexsMarkerStyle).addTo(this.map);

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

    private renderLayerFromMarkers() {
        const coords = this.vertexMarkers.map(polygon =>
            polygon.map(ring =>
                ring.map(m => [m.getLatLng().lat, m.getLatLng().lng])
            )
        );
        this.renderLayer(coords);
    }

    private pushHistoryFromMarkers() {
        const coords = this.vertexMarkers.map(polygon =>
            polygon.map(ring =>
                ring.map(m => [m.getLatLng().lat, m.getLatLng().lng])
            )
        );
        this.historyStack.push(coords);
    }

    // #endregion

    // #region 吸附函数

    /**
     * 快捷方法：动态切换吸附功能
     */
    public toggleSnap(options: SnapOptions): void {
        this.updateSnapOptions(options);
        // 如果正在编辑，需要更新吸附源
        if (this.currentState === PolygonEditorState.Editing) {
            if (this.IsEnableSnap()) {
                this.setSnapSources([this.polygonLayer!]);
            }
        }
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
            console.log('turfPoint', turfPoint, polygonGeoJSON);


            return booleanPointInPolygon(turfPoint, polygonGeoJSON);
        } catch (error) {
            console.error('检查点击图层时出错:', error);
            return false;
        }
    }

    private canConsume(e: L.LeafletMouseEvent): boolean {
        // 如果是绘制操作，则直接跳过判断，后面的逻辑是给编辑操作准备的
        if (this.currentState === PolygonEditorState.Drawing) return true;
        if (!this.isVisible) return false;
        // 🔒 检查是否处于topo选择状态，如果是则不进入编辑模式
        if (LeafletTopology.isPicking(this.map)) {
            // topo正在选择图层，不处理双击编辑事件
            return false;
        }
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

    /** 是否开启了吸附操作
     *
     *
     * @private
     * @return {*}  {boolean}
     * @memberof LeafletPolygonEditor
     */
    private IsEnableSnap(): boolean {
        const snapOptions = this.getSnapOptions();
        if (snapOptions && snapOptions.enabled && this.snapController) {
            return true;
        }
        return false;
    }
    /** 转换【多边形】的GeoJSON数据为Leaflet可接受的格式
     *
     *
     * @private
     * @param {GeoJSON.Geometry} geometry
     * @return {*}  {(L.LatLngExpression[][] | L.LatLngExpression[][][])}
     * @memberof LeafletPolygonEditor
     */
    private convertGeoJSONToLatLngs(
        geometry: GeoJSON.Geometry
    ): L.LatLngExpression[][] | L.LatLngExpression[][][] {
        if (geometry.type === 'Polygon') {
            // Polygon: [ [ [lng, lat], [lng, lat], ... ], [hole1], [hole2], ... ]
            return geometry.coordinates.map(ring =>
                ring.map(([lng, lat]) => [lat, lng])
            );
        } else if (geometry.type === 'MultiPolygon') {
            // MultiPolygon: [ [ [ [lng, lat], ... ], [hole1], ... ], [ [ ... ] ], ... ]
            return geometry.coordinates.map(polygon =>
                polygon.map(ring =>
                    ring.map(([lng, lat]) => [lat, lng])
                )
            ) as any;
        } else {
            throw new Error('不支持的 geometry 类型: ' + geometry.type);
        }
    }


    // #endregion


}