/* 本组件，设计初衷是用作绘制工具的。
 * 既然是绘制工具，目前能想到的用户使用场景：
 * 1：用户在地图上点击，绘制一个点。
 * 2：用户绘制完，获取这个点的坐标信息。以便做其他的操作。
 * 3：绘制状态时，外部ui可能要展示取消按钮，所以需要给外部提供当前是否是处于绘制状态，即需要添加一个事件回调机制，外部监听状态的改变进行响应的ui调整
 * 综上：本组件不会吐出circleLayer对象，只提供上面说的2的功能：吐出坐标信息，以及3里的监听事件回调机制。
 * */
import { booleanValid, circle } from '@turf/turf';
import * as L from 'leaflet';
import { PolygonEditorState } from '../types';
const km_value = 1000; // 1千米 = 1000米
export default class LeafletCircle {

    private map: L.Map;
    private circleLayer: L.Circle | null = null;
    // 图层初始化时
    private drawLayerStyle: L.CircleMarkerOptions = {
        color: '#008BFF', // 设置边线颜色
        fillColor: "#008BFF", // 设置填充颜色
        fillOpacity: 0.3, // 设置填充透明度
    };
    // 图层无效时的样式
    private errorDrawLayerStyle: L.CircleMarkerOptions = {
        color: 'red', // 设置边线颜色
        fillColor: "red", // 设置填充颜色
        fillOpacity: 0.3, // 设置填充透明度
    };
    private center: L.LatLng | null = null;
    private radius: number = 0;
    private tempCoords: L.LatLng[] = [];

    // 1：我们需要记录当前状态是处于绘制状态--见：currentState变量
    private currentState: PolygonEditorState = PolygonEditorState.Idle; // 默认空闲状态
    // 2：我们需要一个数组，存储全部的监听事件，然后在状态改变时，触发所有这些事件的监听回调！
    private stateListeners: ((state: PolygonEditorState) => void)[] = [];


    constructor(map: L.Map, options: L.CircleOptions = {}) {
        this.map = map;
        if (this.map) {
            // 初始化时，设置绘制状态为true，且发出状态通知
            this.updateAndNotifyStateChange(PolygonEditorState.Drawing);
            // 鼠标手势设置为十字
            this.map.getContainer().style.cursor = 'crosshair';
            // 禁用双击地图放大功能（先考虑让用户自己去写，里面不再控制）
            // this.map.doubleClickZoom.disable();
            // 使用用户传入的样式覆盖默认样式
            this.drawLayerStyle = { ...this.drawLayerStyle, ...options };
            this.initLayers();
            this.initMapEvent(this.map);
        }
    }

    // 初始化图层
    private initLayers() {
        // 试图给一个非法的经纬度，来测试是否leaflet直接抛出异常。如果不行，后续使用[-90, -180]坐标，也就是页面的左下角
        const circleOptions: L.CircleOptions = {
            pane: 'overlayPane',
            radius: 0,
            ...this.drawLayerStyle,
        };
        this.circleLayer = L.circle([181, 181], circleOptions);
        this.circleLayer.addTo(this.map);
    }

    /** 初始化地图事件监听
     *
     *
     * @private
     * @param {L.Map} map 地图对象
     * @memberof LeafletCircle
     */
    private initMapEvent(map: L.Map) {
        map.on('click', this.mapClickEvent);
        map.on('mousemove', this.mapMouseMoveEvent);
    }

    // #region 工具函数，点图层的逻辑只需要看上面的内容就行了
    /**  地图点击事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletCircle
     */
    private mapClickEvent = (e: L.LeafletMouseEvent) => {
        // this.tempCoords.push([e.latlng.lat, e.latlng.lng])
        if (this.tempCoords.length === 0) {
            this.tempCoords.push(e.latlng)
        } else {
            const finalCoords = [this.tempCoords[0], e.latlng];
            const center = finalCoords[0];
            const radius = center.distanceTo(finalCoords[1]);
            const isValid = this.isValidCircle(center, radius);
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

    /** 渲染图层
     *
     *
     * @private
     * @param { [][]} coords
     * @param {boolean} valid 几何形状的有效性，无效几何的颜色变色
     * @memberof LeafletCircle
     */
    private renderLayer(coords: L.LatLng[], valid: boolean = true) {
        if (this.circleLayer) {
            this.circleLayer.setStyle(valid ? this.drawLayerStyle : this.errorDrawLayerStyle)
            this.center = coords[0];
            this.radius = this.center.distanceTo(coords[1]);
            this.circleLayer.setLatLng(this.center);
            this.circleLayer.setRadius(this.radius);
        } else {
            throw new Error('图层不存在，无法渲染');
        }
    }

    /** 状态重置
     *
     *
     * @private
     * @memberof LeafletCircle
     */
    private reset() {
        // 清空坐标把，因为没什么用了
        this.tempCoords = [];
        // 设置完毕就关闭地图事件监听
        this.offMapEvent(this.map);
        this.map.getContainer().style.cursor = 'grab';
        // 恢复双击地图放大事件（先考虑让用户自己去写，里面不再控制）
        // this.map.doubleClickZoom.enable();
        // 设置为空闲状态，并发出状态通知
        this.updateAndNotifyStateChange(PolygonEditorState.Idle);
    }
    /** 返回图层的空间信息 
     * 
     * 担心用户在绘制后，想要获取到点位的经纬度信息，遂提供吐出geojson的方法
     * @memberof LeafletCircle
     */
    public geojson() {
        if (this.circleLayer && this.center) {
            // 发出消息(圆需要自己定制吐出的结构)
            const lnglat = [this.center.lng, this.center.lat];
            const options: any = { steps: 64, units: 'kilometers', properties: { type: 'circle' } };
            const geojson = circle(lnglat, this.radius / km_value, options); // 获取图形！
            return geojson;
        } else {
            throw new Error("未捕获到图层，无法获取到geojson数据");
        }
    }

    /** 销毁图层，从地图中移除图层
     *
     *
     * @memberof LeafletCircle
     */
    public destroy() {
        if (this.circleLayer) {
            this.circleLayer.remove();
            this.circleLayer = null;
        }
        this.reset();
        this.clearAllStateListeners();
    }

    /** 关闭地图事件监听
     *
     *
     * @private
     * @param {L.Map} map 地图对象
     * @memberof LeafletCircle
     */
    private offMapEvent(map: L.Map) {
        map.off('click', this.mapClickEvent);
        map.off('mousemove', this.mapMouseMoveEvent);
    }

    // #endregion


    // #region 绘制状态改变时的事件回调
    /** 【外部使用】的监听器，用于监听状态改变事件
     *
     *
     * @param {(state: PolygonEditorState) => void} listener
     * @memberof LeafletCircle
     */
    public onStateChange(listener: (state: PolygonEditorState) => void): void {
        // 存储回调事件并立刻触发一次
        this.stateListeners.push(listener);
        // 立即回调当前状态
        listener(this.currentState);
    }

    /** 添加移除单个监听器的方法 
     * 
     */
    public offStateChange(listener: (state: PolygonEditorState) => void): void {
        const index = this.stateListeners.indexOf(listener);
        if (index > -1) {
            this.stateListeners.splice(index, 1);
        }
    }

    /** 清空所有状态监听器 
     * 
     */
    private clearAllStateListeners(): void {
        this.stateListeners = [];
    }

    /** 内部使用，状态改变时，触发所有的监听事件
     *
     *
     * @private
     * @memberof LeafletCircle
     */
    private updateAndNotifyStateChange(status: PolygonEditorState): void {
        this.currentState = status;
        this.stateListeners.forEach(fn => fn(this.currentState));
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
                radius / km_value,  // 转换为公里
                { steps: 64, units: 'kilometers' }
            );

            // 使用 turf.booleanValid 校验
            return booleanValid(circleGeoJSON);
        } catch (error) {
            // 如果创建或校验过程出错，说明圆形无效
            console.warn('圆形校验失败:', error);
            return false;
        }
    }
    // #endregion
}