/*
### 线
顶点拖拽、中点插入、边拖拽、顶点删除、吸附、撤销/重做、校验、状态管理、图层显隐控制、样式配置

**第一轮分析（功能的合理性：从功能的必要性，绘制行为、编辑行为等角度分析）**：

**顶点拖拽**：对于编辑行为来说，是需要的。

**中点插入**：对于编辑行为来说，是需要的。

**边拖拽**：对于编辑行为来说，是需要的。

**顶点删除**：对于编辑行为来说，是需要的。

**吸附**：编辑和绘制时都需要。

**撤销重做**：编辑时需要，绘制时要支持撤销已经绘制的点，允许重绘。

**校验**：有的，是否允许自相交

**状态管理**：用户从绘制状态变成完成状态、从编辑状态到完成状态。是必要的，可以做。

**图层显隐控制**：可做

**样式配置**：必做


**第二轮分析(主要分析要不要放到BaseEditor中， 比如：BaseEditor中写抽象接口、方法、子类实现接口、方法。或者不应该放到BaseEditor中，由子类去写)**：
1. 对于顶点： 无论点、线、面都有顶点，对于顶点的编辑行为，应该抽到BaseEditor中。
2. 对于中点、边拖拽：矩形一般是没必要的，圆也没必要。非通用部分抽离到基类（xxxShapeEditor）中。
3. 顶点删除：编辑状态下：对于点来说，至少保留1个点，对于线来说，至少保留2个点，对于面来说，至少保留3个点。（放BaseEditor抽象类中吧）
4. 吸附：编辑和绘制时都需要，放到BaseEditor抽象类中。
5. 撤销重做：编辑时需要，绘制时要支持撤销已经绘制的点，允许重绘（对于一个编辑器来说，应该是必须的，放到BaseEditor抽象类中）。
6. 校验：有的（放到BaseEditor抽象类中，不过每种类型的几何图层的校验规则、数量并不一致，baseEditor中只提供一个校验接口，子类实现校验逻辑）
7. 状态管理：用户从绘制状态变成完成状态、从编辑状态到完成状态。是必要的（放到BaseEditor抽象类中）。
8. 样式配置：baseEditor中提供接口，子类实现。
9. 图层显隐控制：BaseEditor抽象，子类实现（一般都是设置透明度做图层显隐吧？ 是的话，可以写在BaseEditor中实现）

*/
import * as L from 'leaflet';
import { BaseEditor } from "../base/BaseEditor";
import { EditorState, type LeafletEditorOptions } from "../types";
import { deduplicateCoordinates, reversePolyLineLatLngs } from '../utils/commonUtils';
import { polylineHasSelfIntersection } from '../utils/validShapeUtils';


export default class PolylineEditor extends BaseEditor<L.Polyline> {

    protected vertexMarkers: any[];
    protected midpointMarkers: any[];
    protected historyStack: any[];
    protected redoStack: any[];

    private tempCoords: number[][] = [];

    constructor(map: L.Map, options?: LeafletEditorOptions) {
        super(map, options);
        if (this.map) {
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

    // [绘制]: 创建图层 + 绑定/关闭监听事件 + 设置图层显隐 + (缺少的[layerDestroy\getLayer\getGeoJSON\getLayerVisibility\]在基类中已实现)

    protected initLayer<U extends L.LayerOptions>(layerOptions: U, geometry?: GeoJSON.Geometry): void {
        const layerStyle = this.getLayerStyle();
        let coords: number[][] | number[][][] = [[181, 181], [182, 182]];
        if (geometry) {
            coords = reversePolyLineLatLngs(geometry);
        }
        this.layer = L.polyline(coords as any, layerStyle);
        this.layer.addTo(this.map);
        // 4: 绑定图层自身事件(无)
        // 5: 设置吸附源（排除当前图层） 
        if (this.IsEnableSnap()) {
            this.setSnapSources([this.layer]);
        }
    }

    protected bindMapEvents(map: L.Map): void {
        map.on('click', this.mapClickEvent);
        map.on('dblclick', this.mapDblClickEvent);
        map.on('mousemove', this.mapMouseMoveEvent);
    }

    protected offMapEvents(map: L.Map): void {
        map.off('click', this.mapClickEvent);
        map.off('dblclick', this.mapDblClickEvent);
        map.off('mousemove', this.mapMouseMoveEvent);
    }

    protected setLayerVisibility(visible: boolean): void {
        this.layerVisble = visible;
        if (visible) {
            this.show();
        } else {
            this.hide();
        }
    }

    protected renderLayer(coords: number[][], valid: boolean = true): void {
        if (this.layer) {
            const layerStyle = this.getLayerStyle(valid);
            this.layer.setStyle(layerStyle);
            this.layer.setLatLngs(coords as any);
        } else {
            throw new Error('图层不存在，无法渲染');
        }
    }

    // [编辑]: 编辑的配置项 + 更新编辑功能 + 进入\退出编辑\编辑时的撤销\重做\重置\完成编辑等功能

    protected enterEditMode(): void { }

    protected exitEditMode(): void { }

    protected undoEdit(): void { }

    protected redoEdit(): void { }

    protected resetToInitial(): void { }

    protected commitEdit(): void { }

    protected getLastCoords() { }

    protected reBuildMarkerAndRender(coordinatesArray: any): void { }

    protected reBuildMarker(coords: any[]): void { }

    protected updateMidpoints(skipMarker?: L.Marker): void { }

    protected getCurrentMarkerCoords(): number[][][] {
        return []
    }


    // [吸附]: 全部内容已经写在基类中
    // [状态]: 全部内容已经写在基类中


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
    /**  地图点击事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletPolyLine
     */
    private mapClickEvent = (e: L.LeafletMouseEvent) => {
        // 尝试添加新点
        const newPoint = [e.latlng.lat, e.latlng.lng];
        const testCoords = [...this.tempCoords, newPoint];
        // 实时校验并改变样式
        const isValid = this.isValidPolyline(testCoords);
        // 通过校验，则添加点
        isValid && this.tempCoords.push(newPoint);
    }

    /**  地图双击事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletPolyLine
     */
    private mapDblClickEvent = (e: L.LeafletMouseEvent) => {
        if (this.layer) {
            const lastCoord = [e.latlng.lat, e.latlng.lng];
            // 渲染图层, 先剔除重复坐标，双击事件实际触发了2次单机事件，所以，需要剔除重复坐标
            const finalCoords = deduplicateCoordinates([...this.tempCoords, lastCoord]);
            if (this.isValidPolyline(finalCoords)) {
                this.renderLayer(finalCoords);
                this.reset();
            } else {
                // 校验失败，保持绘制状态
                throw new Error('绘制的折线无效，请继续绘制或调整');
                // 不执行 reset()，让用户继续调整
            }
        }
    }
    /**  地图鼠标移动事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletPolyLine
     */
    private mapMouseMoveEvent = (e: L.LeafletMouseEvent) => {
        // 1：一个点也没有时，我们移动事件，也什么也不做。
        if (!this.tempCoords.length) return;
        const lastMoveEndPoint: number[] = [e.latlng.lat, e.latlng.lng];
        const tempRenderCoords = [...this.tempCoords, lastMoveEndPoint];
        // 实时校验并改变样式
        const isValid = this.isValidPolyline(tempRenderCoords);
        // 实时渲染
        this.renderLayer(tempRenderCoords, isValid);
    }

    /** 校验线图层的有效性
     *
     *
     * @private
     * @param {L.LatLng[]} coords
     * @return {*}  {boolean}
     * @memberof LeafletRectangle
     */
    private isValidPolyline(coords: number[][]): boolean {

        // 1. 检查自相交（根据配置）
        if (this.validationOptions.allowSelfIntersect === false) {
            if (polylineHasSelfIntersection(coords)) {
                return false;
            }
        }

        // 2. 其他校验规则可以在这里添加...

        return true;

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
                opacity: 1,
                weight: 2,
                color: '#3388ff'
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
                opacity: 0,
                weight: 0,
                color: '#3388ff'
            })
        }
    }
    // #endregion

}