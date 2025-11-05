/* 本组件，设计初衷是用作绘制工具的。
 * 既然是绘制工具，目前能想到的用户使用场景：
 * 1：用户在地图上点击，绘制一个点。
 * 2：用户绘制完，获取这个点的坐标信息。以便做其他的操作。
 * 综上：本组件不会吐出markerLayer对象，只提供上面说的2的功能：吐出坐标信息。
 * */
import * as L from 'leaflet';
export default class MarkerPoint {
    // 常量
    private map: L.Map;
    private markerLayer: L.Marker | null = null;
    private static markerIcon = L.divIcon({
        className: 'draw-marker-icon',
        html: '<div style="width: 16px; height: 16px; border-radius: 8px; overflow: hidden; border: solid 1px red; background: #ff000048"></div>'
    });

    constructor(map: L.Map, options: L.MarkerOptions = {}) {
        this.map = map;
        if (this.map) {
            this.map.getContainer().style.cursor = 'crosshair';
            this.initLayers(options);
            this.initMapEvent(this.map);
        }
    }

    // 初始化图层
    private initLayers(options: L.MarkerOptions) {
        // 试图给一个非法的经纬度，来测试是否leaflet直接抛出异常。如果不行，后续使用[-90, -180]坐标，也就是页面的左下角
        const markerOptions: L.MarkerOptions = {
            pane: 'markerPane',
            icon: MarkerPoint.markerIcon,
            ...options
        };
        this.markerLayer = L.marker([181, 181], markerOptions);
        this.markerLayer.addTo(this.map);
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
        if (this.markerLayer) {
            this.markerLayer.setLatLng([e.latlng.lat, e.latlng.lng]);
            this.reset();
        }
    }

    /** 状态重置
     *
     *
     * @private
     * @memberof LeafletDistance
     */
    private reset() {
        // 设置完毕就关闭地图事件监听
        this.map.off('click', this.mapClickEvent);
        this.map.getContainer().style.cursor = 'grab';
    }

    /** 返回图层的空间信息 
     * 
     * 担心用户在绘制后，想要获取到点位的经纬度信息，遂提供吐出geojson的方法
     * @memberof markerPoint
     */
    public geojson() {
        if (this.markerLayer) {
            return this.markerLayer.toGeoJSON();
        } else {
            throw new Error("未捕获到marker图层，无法获取到geojson数据");
        }
    }

    /** 销毁图层，从地图中移除图层
     *
     *
     * @memberof markerPoint
     */
    public destroy() {
        if (this.markerLayer) {
            this.markerLayer.remove();
            this.markerLayer = null;
        }
        this.reset();
    }

    // #endregion

}