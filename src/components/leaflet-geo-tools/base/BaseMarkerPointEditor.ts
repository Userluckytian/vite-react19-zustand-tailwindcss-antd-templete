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

    **状态管理**：用户从绘制状态变成完成绘制状态。是必要的，可以做。

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
import { BaseEditor } from "./BaseEditor";
import { EditorState, type BaseEditOptions } from '../types';

export abstract class BaseMarkerPointEditor extends BaseEditor<L.Marker> {
    // 常量
    private map: L.Map;
    private static markerIcon = L.divIcon({
        className: 'draw-marker-icon',
        html: '<div style="width: 16px; height: 16px; border-radius: 8px; overflow: hidden; border: solid 1px red; background: #ff000048"></div>'
    });

    constructor(map: L.Map, options: L.MarkerOptions = {}, defaultPosition?: L.LatLng) {
        super();
        this.map = map;
        if (this.map) {
            const existPosition = !!defaultPosition;
            // 初始化时，设置绘制状态为true，且发出状态通知
            this.updateAndNotifyStateChange(existPosition ? EditorState.Idle : EditorState.Drawing);
            this.map.getContainer().style.cursor = existPosition ? 'grab' : 'crosshair';
            this.createLayer(options, defaultPosition);
            this.bindMapEvents();
        }

    }

    // 初始化图层
    protected createLayer(options: L.MarkerOptions, latlng?: L.LatLng) {
        // 试图给一个非法的经纬度，来测试是否leaflet直接抛出异常。如果不行，后续使用[-90, -180]坐标，也就是页面的左下角
        const markerOptions: L.MarkerOptions = {
            pane: 'markerPane',
            icon: BaseMarkerPointEditor.markerIcon,
            ...options
        };
        this.layer = L.marker(latlng ?? [181, 181], markerOptions);
        this.layer.addTo(this.map);
    }

    protected bindMapEvents() {
        this.map && this.map.on('click', this.mapClickEvent);
    }

    protected offMapEvents() {
        // 设置完毕就关闭地图事件监听
        this.map && this.map.off('click', this.mapClickEvent);
    }

    protected setLayerVisibility(visible: boolean) {
        this.isVisible = visible;
        this.layer.setOpacity(visible ? 1 : 0);
    }

    // 返回图层可见性
    protected getLayerVisible() {
        return this.isVisible;
    }

    /** 获取绘制要素的空间信息
     *
     *
     * @private
     * @memberof MarkerPoint
     */
    protected getGeoJson() {
        if (this.layer) {
            return this.layer.toGeoJSON();
        } else {
            throw new Error("未捕获到图层，无法获取到geojson数据");
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
        if (this.layer) {
            this.layer.setLatLng([e.latlng.lat, e.latlng.lng]);
            this.reset();
        }
    }

    /** 状态重置
     *
     *
     * @private
     * @memberof MarkerPoint
     */
    private reset() {
        // 设置完毕就关闭地图事件监听
        this.offMapEvents()
        this.map.getContainer().style.cursor = 'grab';
        // 设置为空闲状态，并发出状态通知
        this.updateAndNotifyStateChange(EditorState.Idle);
    }


    // --------下面的针对点似乎就没有，写个空函数咯？--------

    public exitEditMode(): void {
        // 移除真实拐点Marker(没有)
        // 移除边的中线点标记(没有)
    }

    /**
     * 更新编辑配置
     * @param options 编辑配置
     */
    public updateEditOptions(options: BaseEditOptions): void {
        // 深度合并配置
        this.mergeEditOptions(options);

        // 如果正在编辑，需要重新渲染
        if (this.currentState === EditorState.Editing) {
           
        }
    }

    /**
     * 深度合并编辑配置
     * @private
     */
    private mergeEditOptions(options: BaseEditOptions): void {}


}