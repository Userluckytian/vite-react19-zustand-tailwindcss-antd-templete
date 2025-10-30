/* 本组件，设计初衷是用作绘制工具的。
 * 既然是绘制工具，目前能想到的用户使用场景：
 * 1：用户在地图上点击，绘制一个点。
 * 2：用户绘制完，获取这个点的坐标信息。以便做其他的操作。
 * 综上：本组件不会吐出circleLayer对象，只提供上面说的2的功能：吐出坐标信息。
 * */
import { circle } from '@turf/turf';
import * as L from 'leaflet';
const km_value = 1000; // 1千米 = 1000米
export default class LeafletCircle {

    private map: L.Map;
    private circleLayer: L.Circle | null = null;
    // 图层初始化时
    private drawLayerStyle = {
        color: 'red', // 设置边线颜色
        fillColor: "red", // 设置填充颜色
        fillOpacity: 0.3, // 设置填充透明度
    };
    private center: L.LatLng | null = null;
    private radius: number | null = null;
    private tempCoords: L.LatLng[] = [];
    constructor(map: L.Map, options: L.CircleOptions = {}) {
        this.map = map;
        if (this.map) {
            // 鼠标手势设置为十字
            this.map.getContainer().style.cursor = 'crosshair';
            // 禁用双击地图放大功能
            this.map.doubleClickZoom.disable();
            this.initLayers(options);
            this.initMapEvent(this.map);
        }
    }

    // 初始化图层
    private initLayers(options: L.CircleOptions) {
        // 试图给一个非法的经纬度，来测试是否leaflet直接抛出异常。如果不行，后续使用[-90, -180]坐标，也就是页面的左下角
        const circleOptions: L.CircleOptions = {
            pane: 'overlayPane',
            radius: 0,
            ...this.drawLayerStyle,
            ...options
        };
        this.circleLayer = L.circle([181, 181], circleOptions);
        this.circleLayer.addTo(this.map);
    }

    /** 初始化地图事件监听
     *
     *
     * @private
     * @param {L.Map} map 地图对象
     * @memberof markerPoint
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
     * @memberof markerPoint
     */
    private mapClickEvent = (e: L.LeafletMouseEvent) => {
        // this.tempCoords.push([e.latlng.lat, e.latlng.lng])
        if (this.tempCoords.length === 0) {
            this.tempCoords.push(e.latlng)
        } else {
            const finalCoords = [this.tempCoords[0], e.latlng];
            this.renderLayer(finalCoords);
            this.reset();
        }
    }
    /**  地图鼠标移动事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof markerPoint
     */
    private mapMouseMoveEvent = (e: L.LeafletMouseEvent) => {
        // 1：一个点也没有时，我们移动事件，也什么也不做。
        if (!this.tempCoords.length) return;
        // 2：只有一个点时，我们只保留第一个点和此刻移动结束的点。
        const lastMoveEndPoint = e.latlng;
        if (this.tempCoords.length > 0) {
            this.tempCoords = [this.tempCoords[0], lastMoveEndPoint]
        }
        // 实时渲染
        this.renderLayer(this.tempCoords);
    }

    /** 渲染线图层
     *
     *
     * @private
     * @param { [][]} coords
     * @memberof LeafletPolyLine
     */
    private renderLayer(coords: L.LatLng[]) {
        if (this.circleLayer) {
            this.center = coords[0];
            this.radius = this.center.distanceTo(coords[1]);
            this.circleLayer.setLatLng(this.center);
            this.circleLayer.setRadius(this.radius);
        } else {
            throw new Error('线图层不存在，无法渲染');
        }
    }

    /** 状态重置
 *
 *
 * @private
 * @memberof LeafletDistance
 */
    private reset() {
        // 清空坐标把，因为没什么用了
        this.tempCoords = [];
        // 设置完毕就关闭地图事件监听
        this.offMapEvent(this.map);
        this.map.getContainer().style.cursor = 'grab';
        // 恢复双击地图放大事件
        this.map.doubleClickZoom.enable();
    }
    /** 返回图层的空间信息 
     * 
     * 担心用户在绘制后，想要获取到点位的经纬度信息，遂提供吐出geojson的方法
     * @memberof markerPoint
     */
    public geojson() {
        if (this.circleLayer) {
            // 发出消息(圆需要自己定制吐出的结构)
            const lnglat = [this.center.lng, this.center.lat];
            const options: any = { steps: 64, units: 'kilometers', properties: { type: 'circle' } };
            const geojson = circle(lnglat, this.radius / km_value, options); // 获取图形！
            return geojson;
        } else {
            throw new Error("未捕获到marker图层，无法获取到geojson数据");
        }
    }

    /** 销毁图层，从地图中移除图层
     *
     *
     * @memberof markerPoint
     */
    public destory() {
        if (this.circleLayer) {
            this.circleLayer.remove();
            this.circleLayer = null;
        }
        this.reset();
    }

    /** 关闭地图事件监听
     *
     *
     * @private
     * @param {L.Map} map 地图对象
     * @memberof markerPoint
     */
    private offMapEvent(map: L.Map) {
        map.off('click', this.mapClickEvent);
        map.off('mousemove', this.mapMouseMoveEvent);
    }

    // #endregion
}