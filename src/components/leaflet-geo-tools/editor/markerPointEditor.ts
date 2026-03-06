/* 
    针对点： 
    拖拽调整位置、吸附、撤销/重做、图层显隐控制、状态管理、样式配置

    **第一轮分析（功能的合理性： 从功能的必要性，绘制行为、编辑行为等角度分析）**：
    **点拖动**，可以做（但这个不是编辑行为，默认支持的）

    **吸附**：绘制时支持吸附，拖动时支持吸附（不是编辑行为）。

    **撤销重做**：用户绘制了一个点，然后发现自己绘制错了，可以撤销，重新绘制。（
    Q: 那什么时候能完成绘制呢？ 除非提供一个按钮，点击表示完成绘制。
    A: 去球吧~，没必要支持撤销重做，用户绘制错了，就把当前绘制的点删除，重新绘制就行了。
    ）

    **图层显隐控制**：可做(怎么做？ 答：编辑器中定义isVisible属性，然后用户在设置图层显隐时，设置该属性的值，然后提供getVisible函数，用户获取当前图层状态)

    **状态管理**：用户从绘制状态变成完成绘 制状态。是必要的，可以做。

    **样式配置**：必做


    **第二轮分析(主要分析要不要放到BaseEditor中， 比如：BaseEditor中写抽象接口、方法、子类实现接口、方法。或者不应该放到BaseEditor中，由子类去写)**：
    1. 拖动这个功能是marker自带的属性信息。
    2. 吸附这个功能是不是点、线、面都应该有 或者说 编辑器是否应该提供吸附能力？ 答：我觉得应该是需要的，编辑器应该提供吸附能力吧？（抽到BaseEditor中）
    3. 撤销重做这个功能目前看点是不需要的，（BaseEditor中写抽象方法，子类实现（点的实现逻辑直接return，或者提醒用户不可以撤销。））。
    4. 状态管理：这个应该都需要，（抽到BaseEditor中）。
    5. 样式配置：baseEditor中提供接口，子类实现。
    6. 图层显隐控制：BaseEditor抽象，子类实现。（一般都是设置透明度做图层显隐吧？ 是的话，可以写在BaseEditor中实现）、

    原则上BaseXXXEditor抽象类用于做【历史栈】的具体实现。绘制点的情况下是没有历史栈的，所以可以不用BaseXXXEditor这一层。
    
    */
import * as L from 'leaflet';

import { EditorState, type BaseEditOptions, type LeafletEditorOptions } from '../types';
import { BaseEditor } from '../base/BaseEditor';
import { reversePointLatLngs } from '../utils/commonUtils';

export class MarkerPointEditor extends BaseEditor<L.Marker> {


    // #region 暂时未使用的部分
    protected vertexMarkers: any[];
    protected midpointMarkers: any[];
    protected historyStack: any[];
    protected redoStack: any[];
    protected enterEditMode(): void { }
    protected reBuildMarker(coords: any[]): void { }
    protected renderLayer(coords: any[], valid: boolean): void { }
    protected getCurrentMarkerCoords() { }
    protected updateMidpoints(skipMarker?: L.Marker): void { }
    protected reBuildMarkerAndRender(coordinatesArray: any): void { }
    // #endregion

    constructor(map: L.Map, options?: LeafletEditorOptions) {
        super(map, options);
        if (this.map) {
            const existPosition = !!options.defaultGeometry;
            // 初始化时，设置绘制状态为true，且发出状态通知
            this.updateAndNotifyStateChange(existPosition ? EditorState.Idle : EditorState.Drawing);
            this.map.getContainer().style.cursor = existPosition ? 'grab' : 'crosshair';
            this.initLayer(options?.defaultStyle, options?.defaultGeometry);
            this.bindMapEvents();
        }
    }

    // 初始化图层
    protected initLayer<U extends L.LayerOptions>(layerOptions: U, geometry?: GeoJSON.Geometry): void {
        // 试图给一个非法的经纬度，来测试是否leaflet直接抛出异常。如果不行，后续使用[-90, -180]坐标，也就是页面的左下角
        const polylineOptions = this.getLayerStyle();
        let coords: number[] = [181, 181];
        if (geometry) {
            coords = reversePointLatLngs(geometry);
        }
        this.layer = L.marker(coords as L.LatLngExpression, polylineOptions);
        this.layer.addTo(this.map);
        // 绑定图层自身事件(无)
        // 设置吸附源（排除当前图层） 
        if (this.IsEnableSnap()) {
            this.setSnapSources([this.layer]);
        }
    }

    protected bindMapEvents() {
        this.map && this.map.on('click', this.mapClickEvent);
    }

    protected offMapEvents() {
        // 设置完毕就关闭地图事件监听
        this.map && this.map.off('click', this.mapClickEvent);
    }

    protected setLayerVisibility(visible: boolean) {
        this.layerVisble = visible;
        this.layer.setOpacity(visible ? 1 : 0);
    }

    /**  地图点击事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof markerPoint
     */
    private mapClickEvent = (e: L.LeafletMouseEvent) => {
        if (this.layer) {
            this.layer.setLatLng([e.latlng.lat, e.latlng.lng]);
            this.resetStatus();
        }
    }

    /** 状态重置
     *
     *
     * @private
     * @memberof MarkerPoint
     */
    private resetStatus() {
        // 设置完毕就关闭地图事件监听
        this.offMapEvents()
        this.map.getContainer().style.cursor = 'grab';
        // 设置为空闲状态，并发出状态通知
        this.updateAndNotifyStateChange(EditorState.Idle);
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
        const markerIcon = L.divIcon({
            className: 'draw-marker-icon',
            html: `<div style="width: 16px; height: 16px; border-radius: 8px; overflow: hidden; border: solid 1px ${valid ? '#8abee6' : '#ff0000'}; background: ${valid ? '#8abee648' : '#ff000048'}"></div>`
        });

        // 1: 提供一些默认值, 防止用户构建的图层样式异常
        const defaultLayerStyle = {
            icon: markerIcon,
            opacity: 1,
            ...this.options.defaultStyle,
        };
        const allOptions = {
            pane: 'markerPane',
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
    // #endregion

    // --------下面的针对点似乎就没有，写个空函数咯？--------

    public exitEditMode(): void {
        // 移除真实拐点Marker(没有)
        // 移除边的中线点标记(没有)
    }

}