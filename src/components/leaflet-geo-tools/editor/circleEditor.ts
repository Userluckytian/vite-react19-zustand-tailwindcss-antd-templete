import { BaseEditor } from "../base/BaseEditor";
import type { LeafletEditorOptions } from "../types";

/*

圆心拖拽、半径调整、吸附、撤销/重做、图层显隐控制、校验、样式配置

**第一轮分析（功能的合理性：从功能的必要性，绘制行为、编辑行为等角度分析）**：
现阶段圆形的geojson返回结果是使用turf.js的circle方法生成的，这会影响绘制行为和编辑行为，需要考虑下怎么调整。
1. 圆心拖拽：❌ 这是编辑时候的操作？好奇怪，怎么实现？
2. 半径调整：这是应该是编辑时候的操作 怎么实现？（能想到的渲染圆心，渲染边上的任意一点，设置编辑状态等）
3. 吸附：最多支持个圆心吸附和拖动位置的吸附吧？
4. 图层显隐控制：可做，
5. 撤销重做：emmm...
6. 校验: 支持提供最小圆的半径，小于用户设置的值，则不允许结束绘制。
7. 样式配置：必做

**第二轮分析(主要分析要不要放到BaseEditor中， 比如：BaseEditor中写抽象接口、方法、子类实现接口、方法。或者不应该放到BaseEditor中，由子类去写)**：
1. 圆心拖拽：❌
2. 半径调整：基类（circleShapeEditor）
3. 吸附：（放到baseEditor中）
4. 图层显隐控制：BaseEditor抽象，子类实现（一般都是设置透明度做图层显隐吧？ 是的话，可以写在BaseEditor中实现）
5. 撤销重做：（baseEditor做抽象，子类实现）
6. 校验：（baseEditor做接口抽象，子类实现）
7. 样式配置：（baseEditor做接口抽象，子类实现）


 */
export default class CircleEditor extends BaseEditor<L.Circle> {

    protected vertexMarkers: any[];
    protected midpointMarkers: any[];
    protected historyStack: any[];
    protected redoStack: any[];
    protected enterEditMode(): void { }
    protected exitEditMode(): void { }

    protected initLayer<U extends L.LayerOptions>(layerOptions: U, geometry?: GeoJSON.Geometry | L.LatLng): void { }
    protected bindMapEvents(map: L.Map): void { }
    protected offMapEvents(map: L.Map): void { }
    protected setLayerVisibility(visible: boolean): void { }
    protected renderLayer(coords: any[], valid: boolean): void { }
    protected getCurrentMarkerCoords() { }
    protected reBuildMarker(coords: any[]): void { }
    protected updateMidpoints(skipMarker?: L.Marker): void { }
    protected reBuildMarkerAndRender(coordinatesArray: any): void { }


    constructor(map: L.Map, options: LeafletEditorOptions = {}) {
        super(map, options);

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
            ...this.options?.validation?.validErrorPolygonStyle
        }
        return valid ? allOptions : errorLayerStyle;
    }

    // #endregion
}