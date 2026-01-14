import * as L from "leaflet";
import { PolygonEditorState, type EditorListenerConfigs, type GeometryIndex, type SnapHighlightLayerOptions, type SnapMode, type SnapOptions, type SnapResult } from "../types";
import { SnapController } from "../utils/SnapController";

// BaseEditor.ts - 基础形状编辑器
export abstract class BaseEditor {
    // 静态属性 - 所有编辑器实例共享同一个激活状态
    private static currentActiveEditor: BaseEditor | null = null;
    // 通用属性
    protected map: L.Map; // 地图对象
    protected currentState: PolygonEditorState = PolygonEditorState.Idle; // 当前状态

    protected stateListeners: ((state: PolygonEditorState) => void)[] = []; // 状态监听器存储数组，比如来了多个监听函数，触发的时候，要遍历全部监听函数。
    protected isDraggingPolygon = false; // 是否是拖动多边形
    protected dragStartLatLng: L.LatLng | null = null; // 拖动多边形时，用户鼠标按下（mousedown）那一刻的坐标点，然后鼠标移动（mousemove）时，遍历全部的marker，做坐标偏移计算。
    protected isVisible = true; // 图层可见性

    // 吸附
    protected snapController?: SnapController; // 顶点吸附控制器
    private snapHighlightLayer: L.LayerGroup | undefined; // 吸附时，高亮显示的图层组
    private highlightCircleMarker: L.CircleMarker | null = null; // 吸附时，高亮显示的marker
    private highlightEdgeLayer: L.Polyline | null = null; // 吸附时，高亮显示的边线

    // 添加高亮配置属性
    protected snapHighlightOptions: SnapHighlightLayerOptions = {
        enabled: true,
        pointStyle: {
            radius: 15,
            color: '#00ff00',
            weight: 2,
            fillOpacity: 0.8,
            pane: 'overlayPane'
        },
        edgeStyle: {
            color: '#00ff00',
            weight: 5,
            dashArray: '4,2',
            pane: 'overlayPane'
        }
    };


    constructor(map: L.Map, options: { snap?: SnapOptions }) {
        if (!map) throw new Error('传入的地图对象异常，请先确保地图对象已实例完成。');
        this.map = map;
        // 初始化吸附控制器 
        this.snapHighlightLayer = L.layerGroup().addTo(map);
        this.initSnap(map, options?.snap);
    }

    // #region 实例是否是激活状态（编辑时，就是激活态，否则就是非激活态，这时，关闭全部事件） 

    /**
     * 激活当前编辑器实例
     */
    protected activate(): void {
        // console.log('激活编辑器:', this.constructor.name);

        // 保存之前的激活编辑器
        const previousActiveEditor = BaseEditor.currentActiveEditor;

        // 停用之前激活的编辑器
        if (previousActiveEditor && previousActiveEditor !== this) {
            // console.log('停用之前的编辑器:', previousActiveEditor.constructor.name);
            previousActiveEditor.forceExitEditMode(); // 强制退出编辑模式
            previousActiveEditor.deactivate(); // 停用激活状态
        }

        // 设置当前实例为激活状态
        BaseEditor.currentActiveEditor = this;
    }

    /**
     * 停用当前编辑器实例
     */
    protected deactivate(): void {
        // console.log('停用编辑器:', this.constructor.name);

        if (BaseEditor.currentActiveEditor === this) {
            BaseEditor.currentActiveEditor = null;
        }


    }

    /**
     * 检查当前实例是否激活
     */
    protected isActive(): boolean {
        return BaseEditor.currentActiveEditor === this && this.isVisible;
    }

    /**
     * 静态方法：停用所有编辑器（压根不用，我都不想写！）
     */
    public static deactivateAllEditors(): void {
        // console.log('停用所有编辑器');
        if (BaseEditor.currentActiveEditor) {
            BaseEditor.currentActiveEditor.deactivate();
        }
    }

    /**
     * 强制停用编辑状态（但不改变激活状态）
     */
    protected forceExitEditMode(): void {
        // console.log('强制退出编辑模式:', this.constructor.name);
        this.exitEditMode();
        if (this.currentState === PolygonEditorState.Editing) {
            this.updateAndNotifyStateChange(PolygonEditorState.Idle);
        }
        this.isDraggingPolygon = false;
        this.dragStartLatLng = null;
    }

    // #endregion

    // #region 事件回调
    /** 状态改变时，触发存储的所有监听事件的回调
     *
     *
     * @protected
     * @param {PolygonEditorState} status
     * @param {boolean} [immediateNotify] (立即发出消息通知)
     * @return {*}  {void}
     * @memberof BaseEditor
     */
    protected updateAndNotifyStateChange(status: PolygonEditorState, immediateNotify: boolean = true): void {
        this.currentState = status;
        if (immediateNotify) {
            this.stateListeners.forEach(fn => fn(this.currentState));
        }
    }

    /** 设置当前的状态，
     *
     *
     * @param {PolygonEditorState} status
     * @memberof BaseEditor
     */
    public setCurrentState(status: PolygonEditorState): void {
        this.currentState = status;
    }

    /** 外部监听者添加的回调监听函数，存储到这边，状态改变时，触发这些监听事件的回调
     *
     *
     * @param {(state: PolygonEditorState) => void} listener // 监听事件
     * @param {EditorListenerConfigs} [configs={ immediateNotify: false }] // 配置参数
     * @memberof BaseEditor
     */
    public onStateChange(listener: (state: PolygonEditorState) => void, configs: EditorListenerConfigs = { immediateNotify: false }): void {
        // 存储回调事件并立刻触发一次
        this.stateListeners.push(listener);
        configs.immediateNotify && listener(this.currentState);
    }

    /** 移除监听器的方法
     *
     *
     * @param {(state: PolygonEditorState) => void} listener
     * @memberof BaseEditor
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
    protected clearAllStateListeners(): void {
        this.stateListeners = [];
    }

    // #endregion

    // #region 吸附行为
    /** 
      * arcgis，
      * 1：拖动面时，不进行吸附行为，
      * 2：拖动点接近另一个点时，点被吸附到一起，
      * 3：拖动一个点接近一条线时，点会被吸附到线上
      * 4：拖动一条线接近另一条线时，会根据鼠标按下拖动的那个坐标去吸附目标线，而拖动的线会跟着跑，同步的图形也在变化
     */


    /** 初始化吸附控制器
     *
     *
     * @protected
     * @param {L.Map} map
     * @param {SnapOptions} [snap]
     * @memberof BaseEditor
     */
    private initSnap(map: L.Map, snap?: SnapOptions) {
        if (!snap?.enabled) return;

        this.snapController = new SnapController(map);
        this.snapController.setModes(snap?.modes ?? ['vertex']);
        this.snapController.setTolerance(snap?.tolerance ?? 8);
    }

    /**
     * 动态启用/禁用吸附功能
     * @param options 吸附选项
     */
    public updateSnapOptions(options: SnapOptions): void {
        if (options.enabled) {
            // 1：无论下面那个，都要设置高亮信息（这种写法是把吸附控制器和高亮行为区分开了，不知道是对是错！）
            if (options?.highlight) {
                this.snapHighlightOptions = options.highlight;
            }
            // 2：启用吸附
            if (!this.snapController) {
                // 初始化吸附控制器
                this.initSnap(this.map, options);
            } else if (options) {
                // 更新配置
                this.snapController.setModes(options.modes ?? ['vertex']);
                this.snapController.setTolerance(options?.tolerance ?? 8);
            }
        } else {
            // 禁用吸附
            if (this.snapController) {
                this.cleanupSnapResources();
            }
        }
    }

    /**
     * 获取当前吸附配置
     */
    public getSnapOptions(): SnapOptions | null {
        if (!this.snapController) {
            return null;
        }

        return {
            enabled: true,
            modes: this.snapController.getModes(),
            tolerance: this.snapController.getTolerance()
        };
    }

    /**
     * 设置吸附源（其他几何图形）
     * @param layers 要排除的图层列表
     */
    protected setSnapSources(excludeLayers: L.Layer[]): void {
        if (!this.snapController) {
            throw new Error('吸附功能未启用');
        }

        const allIndices: GeometryIndex[] = [];

        excludeLayers.forEach(excludeLayer => {
            const indices = this.collectAllOtherGeometryIndices(this.map, excludeLayer);
            allIndices.push(...indices);
        });

        this.snapController.setGeometrySources(allIndices);
    }

    /** 【吸附器】确定最终的坐标(顶点会去吸附边和其他顶点)
     *
     *
     * @protected
     * @param {L.LatLng} latlng
     * @return {*}  {L.LatLng}
     * @memberof BaseEditor
     */
    protected applySnapWithTarget(latlng: L.LatLng): SnapResult {
        // 移除高亮的图层
        this.clearSnapHighlights();
        const snappedVertex = this.snapController?.snapVertex?.(latlng);
        if (snappedVertex) {
            // console.log('顶点吸附：', snappedVertex);
            if (this.snapHighlightOptions.enabled) this.highlightPoint(snappedVertex);
            return {
                snappedLatLng: snappedVertex,
                snapped: true,
                type: 'vertex',
                target: snappedVertex
            };
        }

        const snappedEdge = this.snapController?.snapEdge?.(latlng);
        if (snappedEdge) {
            // console.log('边缘吸附：', snappedEdge);
            const edge = this.snapController?.getClosestEdge?.(latlng); // 返回输入点即将吸附的目标边线
            if (this.snapHighlightOptions.enabled && edge) this.highlightEdge(edge);
            return {
                snappedLatLng: snappedEdge,
                snapped: true,
                type: 'edge',
                target: edge
            };
        }

        return {
            snappedLatLng: latlng,
            snapped: false
        };
    }


    /** 【顶点吸附器】收集所有其他图层的顶点信息
     *
     *
     * @protected
     * @param {L.Map} map
     * @param {L.Layer} excludeLayer
     * @return {*}  {L.LatLng[]}
     * @memberof BaseEditor
     */
    protected collectAllOtherGeometryIndices(map: L.Map, excludeLayer: L.Layer): GeometryIndex[] {
        const indices: GeometryIndex[] = [];

        map.eachLayer((layer: any) => {
            if (layer !== excludeLayer && layer.toGeoJSON) {
                const geo = layer.toGeoJSON();
                const geometry = geo.type === 'Feature' ? geo.geometry : geo;
                try {
                    const index = this.buildGeometryIndex(geometry);
                    indices.push(index);
                } catch (e) {
                    console.warn('跳过不支持的图层类型', e);
                }
            }
        });

        return indices;
    }

    /** 高亮吸附目标点
     *
     *
     * @protected
     * @param {{ start: L.LatLng; end: L.LatLng }} edge
     * @memberof BaseEditor
     */
    private highlightPoint(latlng: L.LatLng) {
        // 清除上一次的高亮图层
        if (this.highlightCircleMarker) {
            this.highlightCircleMarker.remove();
            this.highlightCircleMarker = null;
        }
        const marker = L.circleMarker(latlng, this.snapHighlightOptions.pointStyle);
        if (!this.snapHighlightLayer) {
            this.snapHighlightLayer = L.layerGroup().addTo(this.map);
        }
        this.snapHighlightLayer.addLayer(marker);
        this.highlightCircleMarker = marker;
    }

    /** 高亮吸附目标线段
     *
     *
     * @protected
     * @param {{ start: L.LatLng; end: L.LatLng }} edge
     * @memberof BaseEditor
     */
    private highlightEdge(edge: { start: L.LatLng; end: L.LatLng }) {
        // 移除上次吸附高亮图层
        if (this.highlightEdgeLayer) {
            this.highlightEdgeLayer.remove();
            this.highlightEdgeLayer = null;
        }
        // 添加新的高亮图层
        const edgeLine = L.polyline([edge.start, edge.end], this.snapHighlightOptions.edgeStyle)
        if (!this.snapHighlightLayer) {
            this.snapHighlightLayer = L.layerGroup().addTo(this.map);
        }
        this.snapHighlightLayer.addLayer(edgeLine);
        this.highlightEdgeLayer = edgeLine;
    }

    /** 移除上次吸附高亮图层
     * 
     *
     * @protected
     * @memberof BaseEditor
     */
    protected clearSnapHighlights() {
        // 清除上一次的高亮图层
        if(this.snapHighlightLayer){
            this.snapHighlightLayer.clearLayers();
        }
        this.highlightCircleMarker = null;
        this.highlightEdgeLayer = null;
    }

    // 清理吸附相关资源的方法
    protected cleanupSnapResources(): void {
        // 1. 清理高亮层
        this.clearSnapHighlights();
        // 清空组
        if (this.snapHighlightLayer && this.map.hasLayer(this.snapHighlightLayer)) {
            this.map.removeLayer(this.snapHighlightLayer);
            this.snapHighlightLayer = undefined;
        }
        // 2. 清理吸附控制器
        this.snapController = undefined;
    }


    // #endregion

    // #region 渲染行为

    /** 退出编辑模式
     *
     *
     * @abstract
     * @memberof BaseEditor
     */
    public abstract exitEditMode(): void;

    // #endregion

    // #region 辅助函数

    /** 提取多边形的坐标点（全部平铺到一个数组中）
     *
     *
     * @protected
     * @param {GeoJSON.GeoJSON} geo
     * @return {*}  {L.LatLng[]}
     * @memberof BaseEditor
     */
    protected extractVerticesFromGeoJSON(geo: GeoJSON.GeoJSON): L.LatLng[] {
        const result: L.LatLng[] = [];
        if (geo.type === 'Feature') geo = geo.geometry;
        if (geo.type === 'Polygon') {
            geo.coordinates.forEach(ring =>
                ring.forEach(([lng, lat]) => result.push(L.latLng(lat, lng)))
            );
        } else if (geo.type === 'MultiPolygon') {
            geo.coordinates.forEach(polygon =>
                polygon.forEach(ring =>
                    ring.forEach(([lng, lat]) => result.push(L.latLng(lat, lng)))
                )
            );
        }
        return result;
    }

    /** 构建空间数据索引 
     *
     *
     * @protected
     * @param {GeoJSON.Geometry} geometry
     * @return {*}  {GeometryIndex}
     * @memberof BaseEditor
     */
    protected buildGeometryIndex(geometry: GeoJSON.Geometry): GeometryIndex {
        const vertices: L.LatLng[] = [];
        const edges: { start: L.LatLng; end: L.LatLng }[] = [];

        if (geometry.type === 'Polygon') {
            geometry.coordinates.forEach(ring => {
                const ringPoints = ring.map(([lng, lat]) => L.latLng(lat, lng));
                vertices.push(...ringPoints);
                for (let i = 0; i < ringPoints.length; i++) {
                    const start = ringPoints[i];
                    const end = ringPoints[(i + 1) % ringPoints.length]; // 闭合
                    edges.push({ start, end });
                }
            });
        } else if (geometry.type === 'MultiPolygon') {
            geometry.coordinates.forEach(polygon => {
                polygon.forEach(ring => {
                    const ringPoints = ring.map(([lng, lat]) => L.latLng(lat, lng));
                    vertices.push(...ringPoints);
                    for (let i = 0; i < ringPoints.length; i++) {
                        const start = ringPoints[i];
                        const end = ringPoints[(i + 1) % ringPoints.length];
                        edges.push({ start, end });
                    }
                });
            });
        } else if (geometry.type === 'LineString') {
            const linePoints = geometry.coordinates.map(([lng, lat]) => L.latLng(lat, lng));
            vertices.push(...linePoints);
            for (let i = 0; i < linePoints.length - 1; i++) {
                edges.push({ start: linePoints[i], end: linePoints[i + 1] });
            }
        } else if (geometry.type === 'MultiLineString') {
            geometry.coordinates.forEach(line => {
                const linePoints = line.map(([lng, lat]) => L.latLng(lat, lng));
                vertices.push(...linePoints);
                for (let i = 0; i < linePoints.length - 1; i++) {
                    edges.push({ start: linePoints[i], end: linePoints[i + 1] });
                }
            });
        } else {
            // 不再执行输出错误信息
            // throw new Error(`不支持的 geometry 类型: ${geometry.type}`);
        }

        const bounds = L.latLngBounds(vertices);

        return {
            type: geometry.type.startsWith('Polygon') ? 'polygon' : 'polyline',
            vertices,
            edges,
            bounds,
            geometry
        };
    }



    // #endregion
}