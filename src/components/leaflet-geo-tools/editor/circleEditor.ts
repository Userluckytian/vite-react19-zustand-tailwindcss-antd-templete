import { BaseEditor } from "../base/BaseEditor";
import { EditorState, type LeafletEditorOptions } from "../types";

/*

圆心拖拽、半径调整、吸附、撤销/重做、图层显隐控制、校验、样式配置

**第一轮分析（功能的合理性：从功能的必要性，绘制行为、编辑行为等角度分析）**：
现阶段圆形的geojson返回结果是使用turf.js的circle方法生成的，这会影响绘制行为和编辑行为，需要考虑下怎么调整。
1. 圆心拖拽：拖动的是整个圆
2. 半径调整：这是应该是编辑时候的操作 怎么实现？（能想到的渲染圆心，渲染边上的任意一点，设置编辑状态等）
3. 吸附：最多支持个圆心吸附和拖动位置的吸附吧？
4. 图层显隐控制：可做，
5. 撤销重做：emmm...
6. 校验: 支持提供最小圆的半径，小于用户设置的值，则不允许结束绘制。
7. 样式配置：必做

**第二轮分析(主要分析要不要放到BaseEditor中， 比如：BaseEditor中写抽象接口、方法、子类实现接口、方法。或者不应该放到BaseEditor中，由子类去写)**：
1. 圆心拖拽：
2. 半径调整：基类（circleShapeEditor）
3. 吸附：（放到baseEditor中）
4. 图层显隐控制：BaseEditor抽象，子类实现（一般都是设置透明度做图层显隐吧？ 是的话，可以写在BaseEditor中实现）
5. 撤销重做：（baseEditor做抽象，子类实现）
6. 校验：（baseEditor做接口抽象，子类实现）
7. 样式配置：（baseEditor做接口抽象，子类实现）

约束: circleEditor 要求传递的options.defaultGeometry是中点，options.defaultStyle中传递半径{radius:10}
 */

import * as L from 'leaflet';
import { booleanValidEnhance, reversePointLatLngs } from "../utils/commonUtils";
import { circle } from "@turf/turf";
export default class CircleEditor extends BaseEditor<L.Circle> {

    protected vertexMarkers: any[];
    protected midpointMarkers: any[];
    protected historyStack: any[];
    protected redoStack: any[];
    protected enterEditMode(): void { }
    protected exitEditMode(): void { }


    protected offMapEvents(map: L.Map): void { }
    protected setLayerVisibility(visible: boolean): void { }

    protected getCurrentMarkerCoords() { }
    protected reBuildMarker(coords: any[]): void { }
    protected updateMidpoints(skipMarker?: L.Marker): void { }
    protected reBuildMarkerAndRender(coordinatesArray: any): void { }



    // --- start ---
    private tempCoords: number[][] = [];
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
        map.on('click', this.mapClickEvent);
        map.on('mousemove', this.mapMouseMoveEvent);
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
        // this.tempCoords.push([e.latlng.lat, e.latlng.lng])

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
                    // 校验通过，完成绘制
                    this.renderLayer(finalCoords);
                    this.reset();
                } else {
                    // 校验失败，保持绘制状态（不执行reset）
                    throw new Error('绘制的圆形无效，请调整半径大小');
                    // 用户可以继续移动鼠标调整
                }
            }

        }
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
     * @private
     * @param { [][]} coords
     * @param {boolean} valid 几何形状的有效性，无效几何的颜色变色
     * @memberof LeafletCircle
     */
    private renderLayer(coords: number[][], valid: boolean = true) {
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
        // 1：一个点也没有时，我们移动事件，也什么也不做。
        if (!this.tempCoords.length) return;
        // 2：只有一个点时，我们只保留第一个点和此刻移动结束的点。
        const lastMoveEndPoint = e.latlng;
        if (this.tempCoords.length > 0) {
            this.tempCoords = [this.tempCoords[0], lastMoveEndPoint];

            const center = this.tempCoords[0];
            const radius = center.distanceTo(lastMoveEndPoint);
            const isValid = this.isValidCircle(center, radius);
            // 实时渲染
            this.renderLayer(this.tempCoords, isValid);
        }
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
            // 使用 turf.circle 创建圆形几何体
            const circleGeoJSON = circle(
                [center.lng, center.lat],
                radius / this.km_value,  // 转换为公里
                { steps: 64, units: 'kilometers' }
            );

            // 使用 turf.booleanValid 校验
            return booleanValidEnhance(circleGeoJSON);
        } catch (error) {
            // 如果创建或校验过程出错，说明圆形无效
            console.warn('圆形校验失败:', error);
            return false;
        }
    }

    // #endregion
}