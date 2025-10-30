/* 本组件，设计初衷是用作测量面积的工具的。
 * 因此：本组件不会吐出任何数据。
 * */
import { area, center, polygon } from '@turf/turf';
import * as L from 'leaflet';

type FormattedArea = {
    val: number;
    unit: string;
}

const HECTARE_THRESHOLD = 10000; // 1公顷 = 10000平方米
const SQUARE_KILOMETER_THRESHOLD = 1000000; // 1平方公里 = 1000000平方米
export default class LeafletArea {
    private map: L.Map;
    private polygonLayer: L.Polygon | null = null;
    // 图层初始化时
    private drawLayerStyle = {
        color: 'red', // 设置边线颜色
        fillColor: "red", // 设置填充颜色
        fillOpacity: 0.3, // 设置填充透明度
    };
    // marker图层
    private markerLayer: L.Marker = null;
    private tempCoords: number[][] = [];
    constructor(map: L.Map, options: L.PolylineOptions = {}) {
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
    private initLayers(options: L.PolylineOptions) {
        // 试图给一个非法的经纬度，来测试是否leaflet直接抛出异常。如果不行，后续使用[[-90, -180], [-90, -180], [-90, -180], [-90, -180]]坐标，也就是页面的左下角
        const polygonOptions: L.PolylineOptions = {
            pane: 'overlayPane',
            ...this.drawLayerStyle,
            ...options
        };
        this.polygonLayer = L.polygon([[181, 181], [181, 181], [181, 181], [181, 181]], polygonOptions);
        this.polygonLayer.addTo(this.map);
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
        map.on('dblclick', this.mapDblClickEvent);
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
        this.tempCoords.push([e.latlng.lat, e.latlng.lng])
    }
    /**  地图双击事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof markerPoint
     */
    private mapDblClickEvent = (e: L.LeafletMouseEvent) => {
        if (this.polygonLayer) {
            // 渲染图层, 先剔除重复坐标，双击事件实际触发了2次单机事件，所以，需要剔除重复坐标
            const finalCoords = this.deduplicateCoordinates(this.tempCoords);
            this.renderLayer([...finalCoords, finalCoords[0]]);
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
        // 清空坐标把，因为没什么用了
        this.tempCoords = [];
        // 设置完毕就关闭地图事件监听
        this.offMapEvent(this.map);
        this.map.getContainer().style.cursor = 'grab';
        // 恢复双击地图放大事件
        this.map.doubleClickZoom.enable();
    }
    /**  地图鼠标移动事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof markerPoint
     */
    private mapMouseMoveEvent = (e: L.LeafletMouseEvent) => {
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
    }

    /** 渲染线图层
     *
     *
     * @private
     * @param { [][]} coords
     * @memberof LeafletLine
     */
    private renderLayer(coords: number[][]) {
        if (this.polygonLayer) {
            this.polygonLayer.setLatLngs(coords as any);
        } else {
            throw new Error('线图层不存在，无法渲染');
        }

        // 无论鼠标移动，还是双击结束绘制，这个事件都会触发，所以我索性直接在这个组件中计算面积信息了，这样就不用考虑在鼠标移动事件和双击事件中写2遍了。
        if (coords.length > 2) {
            if (this.markerLayer) {
                this.markerLayer.remove();
                this.markerLayer = null;
            }
            // 这里因为mousemove的缘故，我不能确定提供的坐标点的数量是否包含了“结束点”：也就是结束点和第一个点要相同，索性，我再添加一遍
            const polygonCoords: any = [...coords, coords[0]];
            const turfPolygon = polygon([polygonCoords]);
            const areaNum = area(turfPolygon);
            const areaInfo = this.formatArea(areaNum);
            const areaCenter = center(turfPolygon);
            const markerCenter: any = areaCenter.geometry.coordinates;
            const markerOptions: L.MarkerOptions = {
                pane: 'markerPane',
                icon: this.measureMarkerIcon(areaInfo),
            };
            this.markerLayer = L.marker(markerCenter, markerOptions)
            this.markerLayer.addTo(this.map)
            // this.markerArr.push(marker);
        }
    }

    /** 返回图层的空间信息 
     * 
     * 担心用户在绘制后，想要获取到点位的经纬度信息，遂提供吐出geojson的方法
     * @memberof markerPoint
     */
    public geojson() {
        if (this.polygonLayer) {
            return this.polygonLayer.toGeoJSON();
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
        if (this.polygonLayer) {
            this.polygonLayer.remove();
            this.polygonLayer = null;
        }
        if (this.markerLayer) {
            this.markerLayer.remove();
            this.markerLayer = null;
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
        map.off('dblclick', this.mapDblClickEvent);
        map.off('mousemove', this.mapMouseMoveEvent);
    }

    /**
     * 面积单位转换函数
     * @param {number} squareMeters - 输入的平方米数值
     * @returns {FormattedArea} 格式化后的面积对象
     */
    private formatArea(squareMeters): FormattedArea {

        if (squareMeters >= SQUARE_KILOMETER_THRESHOLD) {
            // 转换为平方千米并保留2位小数
            const squareKilometers = squareMeters / SQUARE_KILOMETER_THRESHOLD;
            return {
                val: parseFloat(squareKilometers.toFixed(2)),
                unit: "平方公里"
            };
        } else if (squareMeters >= HECTARE_THRESHOLD) {
            // 转换为公顷并保留2位小数
            const hectares = squareMeters / HECTARE_THRESHOLD;
            return {
                val: parseFloat(hectares.toFixed(2)),
                unit: "公顷"
            };
        } else {
            // 保持平方米并保留2位小数
            return {
                val: parseFloat(squareMeters.toFixed(2)),
                unit: "平方米"
            };
        }
    }

    /** 动态生成marker图标(天地图应该是构建的点图层+marker图层两个)
     *
     *
     * @private
     * @param {FormattedArea} area
     * @return {*}  {L.DivIcon}
     * @memberof LeafletDistance
     */
    private measureMarkerIcon(area: FormattedArea): L.DivIcon {
        return L.divIcon({
            className: 'measure-area-marker',
            html: `<div style="width: 10px;height: 10px; text-align: center; position: relative;">
                            <!-- 构建小圆点 -->
                            <div style="width: 10px;height: 10px;border-radius: 50%;background: #ffffff;border: solid 2px red; position: absolute;left: 1px;top: 1px;"></div>
                            <!-- 下面的内容展示文字 -->
                            <div style="width: max-content; padding: 3px; border: solid 1px red; background: #ffffff;  position: absolute; left: 10px; top: 10px;">
                                ${area.val} ${area.unit}
                            </div>
                        </div>`
        });
    }

    /**
     * 简单坐标去重 - 剔除连续重复坐标
     * @param {Array} coordinates - 坐标数组 [[lat, lng], [lat, lng], ...]
     * @param {number} precision - 精度（小数位数），默认6位
     * @returns {Array} 去重后的坐标数组
     */
    private deduplicateCoordinates(coordinates, precision = 6) {
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

}