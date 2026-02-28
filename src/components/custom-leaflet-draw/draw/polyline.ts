/* 本组件，设计初衷是用作绘制工具的。
 * 既然是绘制工具，目前能想到的用户使用场景：
 * 1：用户在地图上点击，绘制一个点。
 * 2：用户绘制完，获取这个点的坐标信息。以便做其他的操作。
 * 3：绘制状态时，外部ui可能要展示取消按钮，所以需要给外部提供当前是否是处于绘制状态，即需要添加一个事件回调机制，外部监听状态的改变进行响应的ui调整
 * 综上：本组件不会吐出lineLayer对象，只提供上面说的2的功能：吐出坐标信息，以及3里的监听事件回调机制。
 * */
import * as L from 'leaflet';
import { kinks, lineString } from '@turf/turf';
import { PolygonEditorState, type LeafletToolsOptions, type ValidationOptions } from '../types';
export default class LeafletPolyline {

    private map: L.Map;
    private lineLayer: L.Polyline | null = null;
    // 图层初始化时
    private drawLayerStyle = {
        color: '#008BFF', // 设置边线颜色
        fillColor: "#008BFF", // 设置填充颜色
        fillOpacity: 0.3, // 设置填充透明度
    };
    // 图层无效时的样式
    private errorDrawLayerStyle = {
        color: 'red', // 设置边线颜色
        fillColor: "red", // 设置填充颜色
        fillOpacity: 0.3, // 设置填充透明度
    };
    private tempCoords: number[][] = [];

    // 1：我们需要记录当前状态是处于绘制状态--见：currentState变量
    private currentState: PolygonEditorState = PolygonEditorState.Idle; // 默认空闲状态
    // 2：我们需要一个数组，存储全部的监听事件，然后在状态改变时，触发所有这些事件的监听回调！
    private stateListeners: ((state: PolygonEditorState) => void)[] = [];

    // 添加校验配置
    private validationOptions = {
        allowSelfIntersect: true,  // 默认允许自相交
    };

    constructor(map: L.Map, options: LeafletToolsOptions = {}) {
        this.map = map;
        if (this.map) {
            // 初始化时，设置绘制状态为true，且发出状态通知
            this.updateAndNotifyStateChange(PolygonEditorState.Drawing);
            // 鼠标手势设置为十字
            this.map.getContainer().style.cursor = 'crosshair';
            // 禁用双击地图放大功能（先考虑让用户自己去写，里面不再控制）
            // this.map.doubleClickZoom.disable();
            // 初始化校验自身的相关配置信息
            if (options.validation) {
                this.validationOptions = {
                    ...this.validationOptions,
                    ...options.validation
                }
            }
            // 用用户提供的样式，覆盖类中默认的样式
            this.drawLayerStyle = { ...this.drawLayerStyle, ...options?.defaultStyle };
            this.initLayers();
            this.initMapEvent(this.map);
        }
    }

    // 初始化图层
    private initLayers() {
        // 试图给一个非法的经纬度，来测试是否leaflet直接抛出异常。如果不行，后续使用[[-90, -180], [-90, -180]]坐标，也就是页面的左下角
        const polylineOptions: L.PolylineOptions = {
            pane: 'overlayPane',
            ...this.drawLayerStyle,
        };
        this.lineLayer = L.polyline([[181, 181], [182, 182]], polylineOptions);
        this.lineLayer.addTo(this.map);
    }

    /** 初始化地图事件监听
     *
     *
     * @private
     * @param {L.Map} map 地图对象
     * @memberof LeafletPolyLine
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
        if (this.lineLayer) {
            const lastCoord = [e.latlng.lat, e.latlng.lng];
            // 渲染图层, 先剔除重复坐标，双击事件实际触发了2次单机事件，所以，需要剔除重复坐标
            const finalCoords = this.deduplicateCoordinates([...this.tempCoords, lastCoord]);
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

    /** 状态重置
     *
     *
     * @private
     * @memberof LeafletPolyLine
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
        // 关闭全部监听器
        this.clearAllStateListeners();
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

    /** 渲染图层
     *
     *
     * @private
     * @param { [][]} coords
     * @memberof LeafletPolyLine
     */
    private renderLayer(coords: number[][], valid: boolean = true) {
        if (this.lineLayer) {
            this.lineLayer.setStyle(valid ? this.drawLayerStyle : this.errorDrawLayerStyle);
            this.lineLayer.setLatLngs(coords as any);
        } else {
            throw new Error('图层不存在，无法渲染');
        }
    }

    /** 返回图层的空间信息 
     * 
     * 担心用户在绘制后，想要获取到点位的经纬度信息，遂提供吐出geojson的方法
     * @memberof LeafletPolyLine
     */
    public geojson(precision?: number | false) {
        if (this.lineLayer) {
            return this.lineLayer.toGeoJSON(precision);
        } else {
            throw new Error("未捕获到图层，无法获取到geojson数据");
        }
    }

    /** 销毁图层，从地图中移除图层
     *
     *
     * @memberof LeafletPolyLine
     */
    public destroy() {
        if (this.lineLayer) {
            this.map.removeLayer(this.lineLayer);
            this.lineLayer.remove();
            this.lineLayer = null;
        }
        this.reset();
        this.clearAllStateListeners();
    }

    /** 关闭地图事件监听
     *
     *
     * @private
     * @param {L.Map} map 地图对象
     * @memberof LeafletPolyLine
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
    private deduplicateCoordinates(coordinates: number[][]) {
        if (!Array.isArray(coordinates) || coordinates.length === 0) {
            return [];
        }

        const result = [coordinates[0]]; // 总是保留第一个坐标

        for (let i = 1; i < coordinates.length; i++) {
            const current = coordinates[i];
            const previous = coordinates[i - 1];

            // 检查当前坐标是否与上一个坐标相同（在指定精度下）
            const isDuplicate = current[0] === previous[0] && current[1] === previous[1];

            if (!isDuplicate) {
                result.push(current);
            }
        }

        return result;
    }

    // #endregion


    // #region 绘制状态改变时的事件回调
    /** 【外部使用】的监听器，用于监听状态改变事件
     *
     *
     * @param {(state: PolygonEditorState) => void} listener
     * @memberof LeafletPolyLine
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
     * @memberof LeafletPolyLine
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
    private isValidPolyline(coords: number[][]): boolean {

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
        // 至少需要4个点才可能形成自相交
        if (coords.length < 4) return false;

        try {
            // 转换为GeoJSON格式 [lng, lat]
            const lineCoords = coords.map(coord => [coord[1], coord[0]]);
            const line = lineString(lineCoords);

            // 使用 turf.kinks 检测自相交
            const intersections = kinks(line);

            // 如果有交点，说明自相交
            return intersections.features.length > 0;
        } catch (error) {
            console.warn('自相交检测失败:', error);
            return false;
        }
    }
    // #endregion


}