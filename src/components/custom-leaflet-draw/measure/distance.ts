/* 本组件，设计初衷是用作测量距离的工具的。
 * 因此：本组件不会吐出任何数据。
 * 1：绘制状态时，外部ui可能要展示取消按钮，所以需要给外部提供当前是否是处于绘制状态，即需要添加一个事件回调机制，外部监听状态的改变进行响应的ui调整
 * */
import { distance, type Units } from '@turf/turf';
import * as L from 'leaflet';
import { PolygonEditorState } from '../types';
import { modeManager } from '../interaction/InteractionModeManager';
type distanceOptions = {
    units?: Units;
    precision?: number;
    lang: 'en' | 'zh';
}
type FormattedDistance = {
    val: number;
    unit: string;
}
export default class LeafletDistance {
    private map: L.Map;
    private lineLayer: L.Polyline | null = null;
    // 图层初始化时
    private drawLayerStyle = {
        color: 'red', // 设置边线颜色
    };
    private tempCoords: number[][] = [];
    private markerArr: L.Marker[] = []; // 用于存放临时生成的marker弹窗
    private measureOptions: distanceOptions;
    private totalDistance: number = 0;

    // 1：我们需要记录当前状态是处于绘制状态--见：currentState变量
    private currentState: PolygonEditorState = PolygonEditorState.Idle; // 默认空闲状态
    // 2：我们需要一个数组，存储全部的监听事件，然后在状态改变时，触发所有这些事件的监听回调！
    private stateListeners: ((state: PolygonEditorState) => void)[] = [];



    /**
     * 创建一个测量距离的类
     * @param {L.Map} map 地图对象
     * @param {distanceOptions} [measureOptions={ units: 'meters' }] turf库的测量距离的options选项
     * @param {L.PolylineOptions} [options={}] 测量距离时的polyline样式，允许用户自定义
     * @memberof LeafletDistance
     */
    constructor(map: L.Map, measureOptions: distanceOptions = { units: 'meters', precision: 2, lang: 'zh' }, options: L.PolylineOptions = {}) {
        this.map = map;
        this.measureOptions = measureOptions;
        if (this.map) {
            // 初始化时，设置绘制状态为true，且发出状态通知
            this.updateAndNotifyStateChange(PolygonEditorState.Drawing);
            this.totalDistance = 0;
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
        // 试图给一个非法的经纬度，来测试是否leaflet直接抛出异常。如果不行，后续使用[[-90, -180], [-90, -180]]坐标，也就是页面的左下角
        const polylineOptions: L.PolylineOptions = {
            pane: 'overlayPane',
            ...this.drawLayerStyle,
            ...options
        };
        this.lineLayer = L.polyline([[181, 181], [182, 182]], polylineOptions);
        this.lineLayer.addTo(this.map);
    }

    /** 初始化地图事件监听
     *
     *
     * @private
     * @param {L.Map} map 地图对象
     * @memberof LeafletDistance
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
     * @memberof LeafletDistance
     */
    private mapClickEvent = (e: L.LeafletMouseEvent) => {
        this.tempCoords.push([e.latlng.lat, e.latlng.lng])
        // todo：每次点击后，在该处添加popup弹窗
        this.calcDistanceAndCreatePopup(this.tempCoords)
    }
    /**  地图双击事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletDistance
     */
    private mapDblClickEvent = (e: L.LeafletMouseEvent) => {
        if (this.lineLayer) {
            // 渲染图层, 先剔除重复坐标，双击事件实际触发了2次单机事件，所以，需要剔除重复坐标
            const finalCoords = this.deduplicateCoordinates(this.tempCoords);
            this.renderLayer(finalCoords);
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
        // 设置为空闲状态，并发出状态通知
        this.updateAndNotifyStateChange(PolygonEditorState.Idle);
    }

    /**  地图鼠标移动事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletDistance
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

    /** 渲染图层
     *
     *
     * @private
     * @param { [][]} coords
     * @memberof LeafletDistance
     */
    private renderLayer(coords: number[][]) {
        if (this.lineLayer) {
            this.lineLayer.setLatLngs(coords as any);
        } else {
            throw new Error('图层不存在，无法渲染');
        }
    }

    /** 返回图层的空间信息 
     * 
     * 担心用户在绘制后，想要获取到点位的经纬度信息，遂提供吐出geojson的方法
     * @memberof LeafletDistance
     */
    public geojson() {
        if (this.lineLayer) {
            return this.lineLayer.toGeoJSON();
        } else {
            throw new Error("未捕获到图层，无法获取到geojson数据");
        }
    }

    /** 销毁图层，从地图中移除图层
     *
     *
     * @memberof LeafletDistance
     */
    public destroy() {
        if (this.lineLayer) {
            this.lineLayer.remove();
            this.lineLayer = null;
        }
        if (this.markerArr && this.markerArr.length) {
            this.markerArr.forEach((marker: L.Marker) => {
                marker.remove();
            });
        }
        this.markerArr = [];
        this.reset();
    }

    /** 关闭地图事件监听
     *
     *
     * @private
     * @param {L.Map} map 地图对象
     * @memberof LeafletDistance
     */
    private offMapEvent(map: L.Map) {
        map.off('click', this.mapClickEvent);
        map.off('dblclick', this.mapDblClickEvent);
        map.off('mousemove', this.mapMouseMoveEvent);
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


    /**
     * 计算距离并创建popup
     *
     * @private
     * @param {number[][]} coordinates
     * @memberof LeafletDistance
     */
    private calcDistanceAndCreatePopup(coordinates: number[][]): void {
        const finalCoords = this.deduplicateCoordinates(this.tempCoords);
        const waitingMeasure = finalCoords.slice(-2);
        if (waitingMeasure.length === 1) {
            const markerOptions: L.MarkerOptions = {
                pane: 'markerPane',
                icon: this.measureMarkerIcon(this.measureOptions.lang === 'zh' ? '起点' : 'start point'),
            };
            // 定义popup起点
            const marker = L.marker(waitingMeasure[0], markerOptions).addTo(this.map)
            this.markerArr.push(marker);
        }
        if (waitingMeasure.length >= 2) {
            // 开始计算
            const measureDistance = distance(waitingMeasure[0], waitingMeasure[1], this.measureOptions);
            this.totalDistance += measureDistance;
            // 使用新的格式化函数
            const formatted = this.formatDistance(this.totalDistance, this.measureOptions);
            const markerOptions: L.MarkerOptions = {
                pane: 'markerPane',
                icon: this.measureMarkerIcon(formatted),
            };
            const marker = L.marker(waitingMeasure[1], markerOptions).addTo(this.map)
            this.markerArr.push(marker);
        }
    }

    /** 动态生成marker图标(天地图应该是构建的点图层+marker图层两个)
     *
     *
     * @private
     * @param {(number | string)} distance
     * @return {*}  {L.DivIcon}
     * @memberof LeafletDistance
     */
    private measureMarkerIcon(distance: FormattedDistance | string): L.DivIcon {
        return L.divIcon({
            className: 'measure-distance-marker',
            html: `<div style="width: 10px;height: 10px; text-align: center; position: relative;">
                        <!-- 构建小圆点 -->
                        <div style="width: 10px;height: 10px;border-radius: 50%;background: #ffffff;border: solid 2px red; position: absolute;left: 1px;top: 1px;"></div>
                        <!-- 下面的内容展示文字 -->
                        <div style="width: max-content; padding: 3px; border: solid 1px red; background: #ffffff;  position: absolute; left: 10px; top: 10px;">
                            ${typeof distance === 'string' ? distance : `${distance.val} ${distance.unit}`}
                        </div>
                    </div>`
        });
    }

    // #endregion


    // #region 距离单位换算函数，内容偏多，这块不用看，知道有距离计算就行
    /**
     * 格式化距离单位
     * @param value 原始距离值
     * @param unit 原始单位
     * @param options 格式化选项
     * @returns 格式化后的距离对象
     */
    private formatDistance(value: number, options: distanceOptions): FormattedDistance {
        const { lang = 'zh', precision = 2, units } = options;

        // 先统一处理同义词
        const normalizedUnit = this.normalizeUnit(units);

        switch (normalizedUnit) {
            // 国际单位制 - 米/千米系列
            case 'meters':
                return this.formatMetricSystem(value, 'meters', lang, precision);
            case 'kilometers':
                return this.formatMetricSystem(value * 1000, 'meters', lang, precision);
            case 'centimeters':
                return this.formatMetricSystem(value / 100, 'meters', lang, precision);
            case 'millimeters':
                return this.formatMetricSystem(value / 1000, 'meters', lang, precision);

            // 英里
            case 'miles':
                return {
                    val: Number(value.toFixed(precision)),
                    unit: this.getUnitName('miles', lang)
                };

            // 海里
            case 'nauticalmiles':
                return {
                    val: Number(value.toFixed(precision)),
                    unit: this.getUnitName('nauticalmiles', lang)
                };

            // 英尺
            case 'feet':
                return this.formatFeet(value, lang, precision);

            // 码
            case 'yards':
                return this.formatYards(value, lang, precision);

            // 英寸
            case 'inches':
                return this.formatInches(value, lang, precision);

            // 角度单位（特殊处理）
            case 'radians':
                return {
                    val: Number(value.toFixed(4)), // 角度单位固定4位小数
                    unit: this.getUnitName('radians', lang)
                };
            case 'degrees':
                return {
                    val: Number(value.toFixed(4)), // 角度单位固定4位小数
                    unit: this.getUnitName('degrees', lang)
                };

            default:
                return {
                    val: Number(value.toFixed(precision)),
                    unit: this.getUnitName(normalizedUnit as any, lang)
                };
        }
    }

    /** 统一处理单位同义词 */
    private normalizeUnit(unit: Units): string {
        const synonymMap: Record<string, string> = {
            'metres': 'meters',
            'millimetres': 'millimeters',
            'centimetres': 'centimeters',
            'kilometres': 'kilometers'
        };
        return synonymMap[unit] || unit;
    }

    /** 获取单位名称（支持中英文） */
    private getUnitName(unit: string, lang: 'en' | 'zh'): string {
        const unitMap: Record<string, { en: string, zh: string }> = {
            'meters': { en: 'meters', zh: '米' },
            'kilometers': { en: 'kilometers', zh: '公里' },
            'centimeters': { en: 'centimeters', zh: '厘米' },
            'millimeters': { en: 'millimeters', zh: '毫米' },
            'miles': { en: 'miles', zh: '英里' },
            'nauticalmiles': { en: 'nautical miles', zh: '海里' },
            'feet': { en: 'feet', zh: '英尺' },
            'yards': { en: 'yards', zh: '码' },
            'inches': { en: 'inches', zh: '英寸' },
            'radians': { en: 'radians', zh: '弧度' },
            'degrees': { en: 'degrees', zh: '度' }
        };

        return unitMap[unit]?.[lang] || unit;
    }

    /** 处理国际单位制换算 */
    private formatMetricSystem(meters: number, originalUnit: string, lang: 'en' | 'zh', precision: number): FormattedDistance {
        if (meters >= 1000) {
            // 转换为公里
            return {
                val: Number((meters / 1000).toFixed(precision)),
                unit: this.getUnitName('kilometers', lang)
            };
        } else {
            // 保持为米，根据原始单位决定显示
            if (originalUnit === 'meters') {
                return {
                    val: Number(meters.toFixed(precision)),
                    unit: this.getUnitName('meters', lang)
                };
            } else {
                // 从厘米/毫米转换过来的，直接显示米
                return {
                    val: Number(meters.toFixed(precision)),
                    unit: this.getUnitName('meters', lang)
                };
            }
        }
    }

    /** 处理英尺换算 */
    private formatFeet(feet: number, lang: 'en' | 'zh', precision: number): FormattedDistance {
        if (feet < 5280) {
            // 显示英尺（取整）
            return {
                val: lang === 'en' ? Math.round(feet) : Number(feet.toFixed(precision)),
                unit: this.getUnitName('feet', lang)
            };
        } else {
            // 转换为英里
            return {
                val: Number((feet / 5280).toFixed(precision)),
                unit: this.getUnitName('miles', lang)
            };
        }
    }

    /** 处理码换算 */
    private formatYards(yards: number, lang: 'en' | 'zh', precision: number): FormattedDistance {
        if (yards < 1760) {
            // 显示码（取整）
            return {
                val: lang === 'en' ? Math.round(yards) : Number(yards.toFixed(precision)),
                unit: this.getUnitName('yards', lang)
            };
        } else {
            // 转换为英里
            return {
                val: Number((yards / 1760).toFixed(precision)),
                unit: this.getUnitName('miles', lang)
            };
        }
    }

    /** 处理英寸换算 */
    private formatInches(inches: number, lang: 'en' | 'zh', precision: number): FormattedDistance {
        if (inches < 12) {
            // 显示英寸（取整）
            return {
                val: lang === 'en' ? Math.round(inches) : Number(inches.toFixed(precision)),
                unit: this.getUnitName('inches', lang)
            };
        } else if (inches < 63360) {
            // 转换为英尺
            return {
                val: Number((inches / 12).toFixed(lang === 'en' ? 1 : precision)),
                unit: this.getUnitName('feet', lang)
            };
        } else {
            // 转换为英里
            return {
                val: Number((inches / 63360).toFixed(precision)),
                unit: this.getUnitName('miles', lang)
            };
        }
    }


    // #endregion


    // #region 绘制状态改变时的事件回调
    /** 【外部使用】的监听器，用于监听状态改变事件
     *
     *
     * @param {(state: PolygonEditorState) => void} listener
     * @memberof LeafletDistance
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
    public clearAllStateListeners(): void {
        this.stateListeners = [];
    }

    /** 内部使用，状态改变时，触发所有的监听事件
     *
     *
     * @private
     * @memberof LeafletDistance
     */
    private updateAndNotifyStateChange(status: PolygonEditorState): void {
        this.currentState = status;
        this.stateListeners.forEach(fn => fn(this.currentState));
        // ✅ 同步到全局状态里：设置交互模式
        switch (status) {
            case PolygonEditorState.Drawing:
                modeManager.setMode('draw');
                break;
            case PolygonEditorState.Editing:
                modeManager.setMode('edit');
                break;
            case PolygonEditorState.Idle:
                modeManager.reset();
                break;
        }
    }
    // #endregion

}