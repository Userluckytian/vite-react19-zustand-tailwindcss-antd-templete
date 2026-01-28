/* 本组件，设计初衷是用作测量面积的工具的。
 * 因此：本组件不会吐出任何数据。
 * 1 ：绘制状态时，外部ui可能要展示取消按钮，所以需要给外部提供当前是否是处于绘制状态，即需要添加一个事件回调机制，外部监听状态的改变进行响应的ui调整
 * 2 ：除了部分类型需要引入之外，本组件所有内容均在组件内容，可以直接搬运
 * */
import { area, center, kinks, polygon } from '@turf/turf';
import * as L from 'leaflet';
import { PolygonEditorState, type ValidationOptions } from '../types';

export type areaOptions = {
    precision?: number;
    lang?: 'en' | 'zh';
    polygonStyle?: L.PolylineOptions; // 存放（用户自己想要设置的）图层的默认样式信息
    validErrorPolygonStyle?: L.PolylineOptions; // 校验失败时的样式
    validation?: ValidationOptions;
    markerStyle?: areaMarker; // 存放（测量结果的）marker 
}

export type areaMarker = {
    containerClassName: string, // dot和label是内部内容，这个是包裹它俩的
    dotClassName: string,
    labelClassName: string,
}


export type FormattedArea = {
    val: number;
    unit: string;
}

const HECTARE_THRESHOLD = 10000; // 1公顷 = 10000平方米
const SQUARE_KILOMETER_THRESHOLD = 1000000; // 1平方公里 = 1000000平方米

// 单位映射表
const UNIT_MAP = {
    'zh': {
        'squareMeter': '平方米',
        'hectare': '公顷',
        'squareKilometer': '平方公里'
    },
    'en': {
        'squareMeter': 'm²',
        'hectare': 'ha',
        'squareKilometer': 'km²'
    }
};

export default class LeafletArea {
    private map: L.Map;
    private polygonLayer: L.Polygon | null = null;
    // marker图层
    private markerLayer: L.Marker | null = null;
    private tempCoords: number[][] = [];
    private measureOptions: areaOptions = {
        precision: 2,
        lang: 'zh',
        polygonStyle: {
            color: '#008BFF', // 设置边线颜色
            fillColor: "#008BFF", // 设置填充颜色
            fillOpacity: 0.3, // 设置填充透明度
        },
        validErrorPolygonStyle: {
            color: 'red', // 设置边线颜色
            fillColor: "red", // 设置填充颜色
            fillOpacity: 0.3, // 设置填充透明度
        },
        markerStyle: {
            containerClassName: '',
            dotClassName: '',
            labelClassName: ''
        }
    };
    private static markerStyle = {
        containerStyle: "width: 10px;height: 10px; text-align: center; position: relative;",
        dotStyle: "width: 10px;height: 10px;border-radius: 50%;background: #ffffff;border: solid 2px #008BFF; position: absolute;left: 1px;top: 1px;",
        labelStyle: "width: max-content; padding: 3px; font-weight: bold; border: solid 1px #008BFF; background: #ffffff;  position: absolute; left: 10px; top: 10px;",
    }

    // 1：我们需要记录当前状态是处于绘制状态--见：currentState变量
    private currentState: PolygonEditorState = PolygonEditorState.Idle; // 默认空闲状态
    // 2：我们需要一个数组，存储全部的监听事件，然后在状态改变时，触发所有这些事件的监听回调！
    private stateListeners: ((state: PolygonEditorState) => void)[] = [];

    // 添加校验配置
    private validationOptions: ValidationOptions = {
        allowSelfIntersect: true,  // 默认允许自相交
    };


    constructor(map: L.Map, measureOptions: areaOptions = {}) {
        this.map = map;
        // 合并用户配置和默认配置
        this.measureOptions = {
            ...this.measureOptions,
            ...measureOptions,
        };
        if (this.map) {
            // 初始化时，设置绘制状态为true，且发出状态通知
            this.updateAndNotifyStateChange(PolygonEditorState.Drawing);
            // 鼠标手势设置为十字
            this.map.getContainer().style.cursor = 'crosshair';
            // 禁用双击地图放大功能（先考虑让用户自己去写，里面不再控制）
            // this.map.doubleClickZoom.disable();
            // 初始化校验自身的相关配置信息
            if (measureOptions.validation) {
                this.validationOptions = {
                    ...this.validationOptions,
                    ...measureOptions.validation
                }
            }
            this.initLayers();
            this.initMapEvent(this.map);
        }
    }

    // 初始化图层
    private initLayers() {
        // 试图给一个非法的经纬度，来测试是否leaflet直接抛出异常。如果不行，后续使用[[-90, -180], [-90, -180], [-90, -180], [-90, -180]]坐标，也就是页面的左下角
        const polygonOptions: L.PolylineOptions = {
            pane: 'overlayPane',
            ...this.measureOptions?.polygonStyle,
        };
        this.polygonLayer = L.polygon([[181, 181], [181, 181], [181, 181], [181, 181]], polygonOptions);
        this.polygonLayer.addTo(this.map);
    }

    /** 初始化地图事件监听
     *
     *
     * @private
     * @param {L.Map} map 地图对象
     * @memberof LeafletArea
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
     * @memberof LeafletArea
     */
    private mapClickEvent = (e: L.LeafletMouseEvent) => {
        // 尝试添加新点
        const newPoint = [e.latlng.lat, e.latlng.lng];
        const testCoords = [...this.tempCoords, newPoint, this.tempCoords[0]];
        // 实时校验并改变样式
        const isValid = this.isValidPolygon(testCoords);
        // 通过校验，则添加点
        isValid && this.tempCoords.push(newPoint);
    }
    /**  地图双击事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletArea
     */
    private mapDblClickEvent = (e: L.LeafletMouseEvent) => {
        if (this.polygonLayer) {
            const lastCoord = [e.latlng.lat, e.latlng.lng];
            // 渲染图层, 先剔除重复坐标，双击事件实际触发了2次单机事件，所以，需要剔除重复坐标
            const ringCoords = [...this.tempCoords, lastCoord, this.tempCoords[0]]
            const finalCoords = this.deduplicateCoordinates(ringCoords);
            if (this.isValidPolygon(finalCoords)) {
                this.renderLayer(finalCoords);
                this.reset();
            } else {
                // 校验失败，保持绘制状态
                throw new Error('绘制面无效，请继续绘制或调整');
                // 不执行 reset()，让用户继续调整
            }
        }
    }
    /** 状态重置
     *
     *
     * @private
     * @memberof LeafletArea
     */
    private reset() {
        // 清空坐标把，因为没什么用了
        this.tempCoords = [];
        // 设置完毕就关闭地图事件监听
        this.offMapEvent(this.map);
        this.map.getContainer().style.cursor = 'grab';
        // 恢复双击地图放大事件（先考虑让用户自己去写，里面不再控制）
        // this.map.doubleClickZoom.enable();
        // 初始化时，设置绘制状态为true，且发出状态通知
        this.updateAndNotifyStateChange(PolygonEditorState.Idle);
    }
    /**  地图鼠标移动事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletArea
     */
    private mapMouseMoveEvent = (e: L.LeafletMouseEvent) => {
        if (!this.tempCoords.length) return;
        const lastMoveEndPoint: number[] = [e.latlng.lat, e.latlng.lng];
        let tempMovedCoords = this.tempCoords;
        // 1：一个点也没有时，我们移动事件，也什么也不做。
        // 2：只有一个点时，我们只保留第一个点和此刻移动结束的点。
        if (tempMovedCoords.length === 1) {
            tempMovedCoords = [tempMovedCoords[0], lastMoveEndPoint]
        }
        // 3：有两个及以上的点时，我们删掉在只有一个点时，塞入的最后移动的那个点，也就是前一个if语句中塞入的那个点，然后添加此刻移动结束的点。
        tempMovedCoords = [...tempMovedCoords, lastMoveEndPoint];
        // 实时校验并改变样式
        const isValid = this.isValidPolygon([...tempMovedCoords, this.tempCoords[0]]);
        // 实时渲染
        this.renderLayer(tempMovedCoords, isValid);
    }

    /** 渲染图层
     *
     *
     * @private
     * @param { [][]} coords
     * @memberof LeafletArea
     */
    private renderLayer(coords: number[][], valid: boolean = true) {
        if (this.polygonLayer) {
            this.polygonLayer.setStyle(valid ? this.measureOptions?.polygonStyle! : this.measureOptions?.validErrorPolygonStyle!);
            this.polygonLayer.setLatLngs(coords as any);
        } else {
            throw new Error('图层不存在，无法渲染');
        }

        // 无论鼠标移动，还是双击结束绘制，这个事件都会触发，所以我索性直接在这个组件中计算面积信息了，这样就不用考虑在鼠标移动事件和双击事件中写2遍了。
        if (this.markerLayer) {
            this.markerLayer.remove();
            this.markerLayer = null;
        }
        if (valid && coords.length > 2) {
            // 这里因为mousemove的缘故，我不能确定提供的坐标点的数量是否包含了“结束点”：也就是结束点和第一个点要相同，索性，我再添加一遍
            const polygonCoords: any = [...coords, coords[0]];
            const turfPolygon = polygon([polygonCoords]);
            const areaNum = area(turfPolygon);
            const areaInfo = this.formatArea(areaNum, this.measureOptions);
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
     * @memberof LeafletArea
     */
    public geojson() {
        if (this.polygonLayer) {
            return this.polygonLayer.toGeoJSON();
        } else {
            throw new Error("未捕获到图层，无法获取到geojson数据");
        }
    }

    /** 销毁图层，从地图中移除图层
     *
     *
     * @memberof LeafletArea
     */
    public destroy() {
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
     * @memberof LeafletArea
     */
    private offMapEvent(map: L.Map) {
        map.off('click', this.mapClickEvent);
        map.off('dblclick', this.mapDblClickEvent);
        map.off('mousemove', this.mapMouseMoveEvent);
    }

    /** 动态生成marker图标(天地图应该是构建的点图层+marker图层两个)
     *
     *
     * @private
     * @param {FormattedArea} area
     * @return {*}  {L.DivIcon}
     * @memberof LeafletArea
     */
    private measureMarkerIcon(area: FormattedArea): L.DivIcon {
        return L.divIcon({
            className: this.measureOptions.markerStyle?.containerClassName ? this.measureOptions.markerStyle?.containerClassName : 'measure-area-marker',
            html: `<div ${this.measureOptions.markerStyle?.containerClassName ? (`class=${this.measureOptions.markerStyle?.containerClassName}`) : (`style="${LeafletArea.markerStyle.containerStyle}"`)}>
                        <!-- 构建小圆点 -->
                        <div ${this.measureOptions.markerStyle?.dotClassName ? (`class=${this.measureOptions.markerStyle?.dotClassName}`) : (`style="${LeafletArea.markerStyle.dotStyle}"`)}></div>
                        <!-- 下面的内容展示文字 -->
                        <div ${this.measureOptions.markerStyle?.labelClassName ? (`class=${this.measureOptions.markerStyle?.labelClassName}`) : (`style="${LeafletArea.markerStyle.labelStyle}"`)}>
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
    private deduplicateCoordinates(coordinates: string | any[], precision = 6) {
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

    // #region 面积单位换算函数，内容偏多，这块不用看，知道有面积计算就行

    /**
     * 面积单位转换函数
     * @param {number} squareMeters - 输入的平方米数值
     * @returns {FormattedArea} 格式化后的面积对象
     */
    private formatArea(squareMeters: number, options: areaOptions): FormattedArea {
        const { lang = 'zh', precision = 2 } = options;
        const units = UNIT_MAP[lang];

        // 参数验证
        if (squareMeters < 0) {
            throw new Error('面积值不能为负数');
        }

        if (precision < 0 || precision > 10) {
            throw new Error('精度值必须在0-10之间');
        }

        let result: FormattedArea;

        if (squareMeters >= SQUARE_KILOMETER_THRESHOLD) {
            // 转换为平方千米并保留2位小数
            const squareKilometers = squareMeters / SQUARE_KILOMETER_THRESHOLD;
            return {
                val: parseFloat(squareKilometers.toFixed(precision)),
                unit: units.squareKilometer
            };
        } else if (squareMeters >= HECTARE_THRESHOLD) {
            // 转换为公顷并保留2位小数
            const hectares = squareMeters / HECTARE_THRESHOLD;
            return {
                val: parseFloat(hectares.toFixed(precision)),
                unit: units.hectare
            };
        } else {
            // 保持平方米并保留2位小数
            return {
                val: parseFloat(squareMeters.toFixed(precision)),
                unit: units.squareMeter
            };
        }
    }


    // #endregion

    // #region 绘制状态改变时的事件回调
    /** 【外部使用】的监听器，用于监听状态改变事件
     *
     *
     * @param {(state: PolygonEditorState) => void} listener
     * @memberof LeafletArea
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
     * @memberof LeafletArea
     */
    private updateAndNotifyStateChange(status: PolygonEditorState): void {
        this.currentState = status;
        this.stateListeners.forEach(fn => fn(this.currentState));
    }
    // #endregion


    // #region 几何图形的有效性校验

    /** 更新几何校验的内容项
     * 
     *
     * @param {ValidationOptions} rules
     * @memberof LeafletPolyline
     */
    public setValidationRules(rules: ValidationOptions): void {
        this.validationOptions = { ...this.validationOptions, ...rules };
    }

    /** 校验线图层的有效性
     *
     *
     * @private
     * @param {L.LatLng[]} coords
     * @return {*}  {boolean}
     * @memberof LeafletRectangle
     */
    private isValidPolygon(coords: number[][]): boolean {

        // 1. 检查自相交（根据配置）
        if (this.validationOptions.allowSelfIntersect === false) {
            if (this.hasSelfIntersection(coords)) {
                return false;
            }
        }

        // 2. 其他校验规则可以在这里添加...

        return true;

    }

    /** 自相交检测（使用 turf.kinks）
     *
     *
     * @private
     * @param {number[][]} coords
     * @return {*}  {boolean} true=有自相交，false=无自相交
     * @memberof LeafletPolyline
     */
    private hasSelfIntersection(coords: number[][]): boolean {

        if (coords.length < 4) return false;

        try {
            // 2. 转换为GeoJSON格式 [lng, lat] ✅ 这个转换是必要的！
            const geoJsonCoords = coords.map(coord => [coord[1], coord[0]]);
            const turfPolygon = polygon([geoJsonCoords]);
            const intersections = kinks(turfPolygon);

            return intersections.features.length > 0;
        } catch (error) {
            console.warn('自相交检测失败:', error);
            return false;
        }
    }
    // #endregion


}