import { buildMarkerIcon } from "@/components/custom-leaflet-draw/utils/commonUtils";
import { EditorState, type BaseEditOptions, type EditOptionsExpends, type EditorListenerConfigs, type GeometryIndex, type LeafletEditorOptions, type SnapHighlightLayerOptions, type SnapOptions, type SnapResult, type ValidationOptions } from "../types";
import { SnapController } from "@/components/custom-leaflet-draw/utils/SnapController";
import { kinks, polygon } from "@turf/turf";
import * as L from "leaflet";


export abstract class BaseEditor<T extends L.Layer> {

    protected map: L.Map; // 地图实例（编辑器本身是不需要的，奈何其他的都继承自它，索性直接在这里定义好了）

    protected options: LeafletEditorOptions = {}; // 配置信息

    protected layer: T; // 图层实例（编辑器本身是不需要的，奈何其他的都继承自它，索性直接在这里定义好了）

    protected layerVisble: boolean = true; // 图层的显隐状态

    // #region 编辑器的[图层]内容
    /** 编辑器的图层需要提供的内容
     * 
     * 1.1：初始化构建`abstruct createEditorLayer()`方法，交由子类去实现，毕竟不同的编辑器，图层类型不一样，构建方式也不一样。
     * 1.2：图层初始化后，还要绑定一系列的地图事件（点击、双击、鼠标移动） abstruct bindMapEvents()方法，交由子类去实现，毕竟不同的编辑器，事件绑定的方式和事件类型也不一样。
     * 1.3：编辑器是否提供显隐事件？如果不提供的话，比如双击编辑事件，如果这个图层是隐藏的，就不能激活编辑功能, 如何做？先提供吧。 abstruct setLayerVisibility()方法，交由子类去实现，毕竟不同的编辑器，图层显隐的方式也不一样。
     * 1.4：toGeojson默认支持的参数，要保持住，之前的丢了。
     * 1.5：销毁鼠标监听事件 abstruct offMapEvents()方法，交由子类去实现，毕竟不同的编辑器，事件解绑的方式和事件类型也不一样。
     */


    /**创建图层并添加到地图上（三件事:1: 创建图层并添加到地图上 2:要不要给图层绑定自身的监听事件? 3: 如果编辑器开启吸附,则需要设置吸附源）
     *
     *
     * @protected
     * @abstract
     * @template U
     * @param {U} layerOptions 图层的样式配置项
     * @param {GeoJSON.Geometry} [geometry] 图层的默认几何信息
     * @memberof BaseEditor
     */
    protected abstract initLayer<U extends L.LayerOptions>(layerOptions: U, geometry?: GeoJSON.Geometry | L.LatLng): void;

    /** 绑定地图事件
     *
     *
     * @protected
     * @abstract
     * @memberof BaseEditor
     */
    protected abstract bindMapEvents(map: L.Map): void;

    /** 取消绑定地图事件
     *
     *
     * @protected
     * @abstract
     * @memberof BaseEditor
     */
    protected abstract offMapEvents(map: L.Map): void;

    /** 设置图层的显隐状态
     *
     *
     * @protected
     * @abstract
     * @memberof BaseEditor
     */
    protected abstract setLayerVisibility(visible: boolean): void;

    /** 获取图层的显隐状态
     *
     *
     * @protected
     * @return {*}  {boolean}
     * @memberof BaseEditor
     */
    protected getLayerVisibility(): boolean {
        return this.layerVisble;
    }

    /** 渲染图层
     *
     *
     * @protected
     * @abstract
     * @param {any[]} coords 坐标数组
     * @param {boolean} valid 是否为有效几何坐标
     * @memberof BaseEditor
     */
    protected abstract renderLayer(coords: any[], valid: boolean): void;

    /** 返回图层的空间信息 
     * 
     * 
     * @memberof LeafletEditPolygon
     */
    public getGeoJSON(precision?: number | false) {
        if (this.layer && (this.layer as any).toGeoJSON) {
            return (this.layer as any).toGeoJSON(precision);
        } else {
            throw new Error("未捕获到图层，无法获取到geojson数据");
        }
    }

    /** 返回绘制的图层
     * 
     * 应用场景1： 地图上存在多个图层实例，每个图层的options属性中有其唯一id标识。现在若要删除其中一个图层，就需要先找到这个图层实例的options中存储的id标识，然后调用后台的删除接口。
     * 
     * 应用场景2： 更改图层样式。
     *
     * （简言之： 场景太多，索性直接返回图层对象即可）
     * @return {*} 
     * @memberof LeafletEditPolygon
     */
    public getLayer() {
        return this.layer;
    }

    /** 销毁图层，从地图中移除图层
     *
     *
     * @memberof LeafletPolyLine
     */
    public layerDestroy() {
        if (this.layer) {
            this.map.removeLayer(this.layer);
            this.layer.remove();
            this.layer = null;
        }
        this.clearAllStateListeners();
    }

    /** 地图状态重置
     *
     *
     * @private
     * @memberof LeafletEditRectangle
     */
    public reset() {
        this.map.getContainer().style.cursor = 'grab';
        // 恢复双击地图放大事件（先考虑让用户自己去写，里面不再控制）
        // this.map.doubleClickZoom.enable();
    }

    // #endregion

    // #region 编辑器的[吸附]内容
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
            pane: 'mapPane'  // 过高的pane会影响绘制时双击结束的操作，会导致无法触发双击事件。
        },
        edgeStyle: {
            color: '#00ff00',
            weight: 5,
            dashArray: '4,2',
            pane: 'mapPane'  // 过高的pane会影响绘制时双击结束的操作，会导致无法触发双击事件。
        }
    };

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

    /** 高亮吸附目标[点]
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

    /** 高亮吸附目标[线段]
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
        if (this.snapHighlightLayer) {
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


    /** 是否开启了吸附操作
     *
     *
     * @private
     * @return {*}  {boolean}
     * @memberof LeafletPolygonEditor
     */
    protected IsEnableSnap(): boolean {
        const snapOptions = this.getSnapOptions();
        if (snapOptions && snapOptions.enabled && this.snapController) {
            return true;
        }
        return false;
    }


    /**
     * 快捷方法：动态切换吸附功能
     */
    public toggleSnap(options: SnapOptions): void {
        this.updateSnapOptions(options);
        // 如果正在编辑，需要更新吸附源
        if (this.currentState === EditorState.Editing) {
            if (this.IsEnableSnap()) {
                this.setSnapSources([this.layer!]);
            }
        }
    }

    // #endregion

    // #region 编辑器的[编辑]内容（这个里面包含了：是否启用编辑功能，编辑时的顶点的样式，更新编辑器的配置信息，退出编辑）

    // 编辑时的顶点配置
    protected editOptions: EditOptionsExpends = {
        // 顶点属性信息
        enabled: true,
        vertexsMarkerStyle: {
            icon: buildMarkerIcon(),
            draggable: true,
            pane: 'markerPane'
        },
        // 这里不对下面两种类型设置默认值,之所以写出来又注释掉,主要是想把全部的配置项展示出来.后续也知道编辑配置项的全部属性,
        // // 中点拖动属性信息
        // dragMidMarkerOptions: {
        //     enabled: true,
        //     dragMarkerStyle: {
        //         // 多边形/线共用的默认中点样式
        //         icon: buildMarkerIcon("border-radius: 50%; background: #ffffff80; border: solid 1px #f00;", [14, 14]),
        //         draggable: true,
        //         pane: 'markerPane'
        //     },
        //     positionRatio: 0.3
        // },
        // // 拖动边的marker属性信息
        // dragLineMarkerOptions: {
        //     enabled: true,
        //     dragMarkerStyle: {
        //         // 多边形/线共用的默认边拖动样式
        //         icon: buildMarkerIcon("border-radius: 50%; background: #007bff80; border: solid 1px #007bff;", [14, 14]),
        //         draggable: true,
        //         pane: 'markerPane'
        //     },
        //     positionRatio: 0.6
        // }
    };

    // 编辑历史栈
    protected abstract vertexMarkers: any[]; // 存储顶点标记的数组
    protected abstract midpointMarkers: any[]; // 存储【线中点、拖动线marker】两种标记的数组
    protected abstract historyStack: any[]; // 历史记录，存储快照
    protected abstract redoStack: any[]; // 重做记录，存储快照

    /**
     * 获取是否启用编辑
     */
    public getEditEnabled(): boolean {
        return this.editOptions.enabled;
    }

    /** 启用/禁用编辑
     * 
     * @param enabled 是否启用
     */
    protected enableEdit(enabled: boolean): void {
        const oldEnabled = this.editOptions.enabled;

        if (oldEnabled !== enabled) {
            this.editOptions.enabled = enabled;

            // 如果从启用变为禁用，且正在编辑，强制退出编辑模式
            if (oldEnabled && !enabled && this.currentState === EditorState.Editing) {
                // 退出编辑状态
                this.exitEditMode();
                // 设置当前状态为空闲
                this.updateAndNotifyStateChange(EditorState.Idle);
            }

            // // 如果从禁用变为启用，且当前是空闲状态，可以重新激活（可选）
            // if (!oldEnabled && enabled && this.currentState === EditorState.Idle) {
            //     // 这里可以根据需求决定是否自动进入编辑模式
            //     console.log('编辑功能已启用，双击图形可进入编辑模式');
            // }
        }
    }

    /** 初始化编辑点marker的配置信息
     *
     *
     * @protected
     * @memberof BaseEditor
     */
    protected initEditOptions(options?: EditOptionsExpends): EditOptionsExpends {
        if (options) {
            const userConfig: EditOptionsExpends = {
                enabled: options?.enabled ?? this.editOptions.enabled,
                vertexsMarkerStyle: options?.vertexsMarkerStyle
                    ? { ...this.editOptions.vertexsMarkerStyle, ...options.vertexsMarkerStyle }
                    : this.editOptions.vertexsMarkerStyle,
                // 下面的用户传了才会有
                // 中点
                dragMidMarkerOptions: options?.dragMidMarkerOptions,
                // 拖动线的marker
                dragLineMarkerOptions: options?.dragLineMarkerOptions
            };

            // 
            if (userConfig?.dragMidMarkerOptions?.dragMarkerStyle) {
                // 强制设置可拖动
                userConfig.dragMidMarkerOptions!.dragMarkerStyle!.draggable = true;
            }
            if (userConfig?.dragLineMarkerOptions?.dragMarkerStyle) {
                // 强制设置可拖动
                userConfig.dragLineMarkerOptions!.dragMarkerStyle!.draggable = true;
            }

            // save
            this.editOptions = userConfig;
        }
        return { ...this.editOptions };
    }

    /** 获取编辑配置项
      *
      *
      * @abstract
      * @memberof BaseEditor
      */
    protected getEditOptions(): EditOptionsExpends {
        return this.editOptions;
    }

    /** 更新编辑配置
      *
      *
      * @abstract
      * @memberof BaseEditor
      */
    protected updateEditOptions(options: EditOptionsExpends): void {
        this.editOptions = {
            enabled: options?.enabled ?? this.editOptions.enabled,
            vertexsMarkerStyle: options?.vertexsMarkerStyle ? { ...this.editOptions.vertexsMarkerStyle, ...options?.vertexsMarkerStyle } : this.editOptions.vertexsMarkerStyle,
            // 中点
            dragMidMarkerOptions: options?.dragMidMarkerOptions
                ? { ...this.editOptions.dragMidMarkerOptions, ...options?.dragMidMarkerOptions }
                : this.editOptions.dragMidMarkerOptions,
            // 拖动线的marker
            dragLineMarkerOptions: options?.dragLineMarkerOptions
                ? { ...this.editOptions.dragLineMarkerOptions, ...options?.dragLineMarkerOptions } : this.editOptions.dragLineMarkerOptions,
        }

        // 1：更新中点和拖动线marker在线上的位置：
        const isEnabledMidPointsMarker = this.editOptions?.dragMidMarkerOptions?.enabled;
        const isEnabledEdgeMarker = this.editOptions?.dragLineMarkerOptions?.enabled;
        if (this.editOptions.dragMidMarkerOptions) {
            this.editOptions.dragMidMarkerOptions!.positionRatio = (isEnabledMidPointsMarker && isEnabledEdgeMarker) ? 0.3 : 0.5;
            if (this.editOptions.dragMidMarkerOptions?.dragMarkerStyle) {
                this.editOptions.dragMidMarkerOptions!.dragMarkerStyle!.draggable = true;
            }
        }
        if (this.editOptions.dragLineMarkerOptions) {
            this.editOptions.dragLineMarkerOptions!.positionRatio = (isEnabledMidPointsMarker && isEnabledEdgeMarker) ? 0.6 : 0.5;
            if (this.editOptions.dragLineMarkerOptions?.dragMarkerStyle) {
                this.editOptions.dragLineMarkerOptions!.dragMarkerStyle!.draggable = true;
            }
        }
    };

    /**
     * 检查是否可以进入编辑模式
     * @private
     */
    protected canEnterEditMode(): boolean {
        // 基础检查
        if (!this.editOptions.enabled) return false;
        if (!this.layer) return false;
        if (this.currentState === EditorState.Editing) return false;
        if (!this.layerVisble) return false;

        return true;
    }

    /** 进入编辑模式
     * 1: 更新编辑状态变量 
     * 2: 构建marker点 
     * 3: 给marker添加拖动事件
     *
     * @abstract
     * @memberof BaseEditor
     */
    protected abstract enterEditMode(): void;

    /** 退出编辑模式(注意职责分离,一般我们退出编辑状态,要发消息通知我们设置的监听事件: 比如: "在? 从编辑状态变成空闲状态了. 你爪子?" 但是我希望你不要在这个事件中写状态变更.保持职责分离.)
     * 进入编辑模式时，事件内部绑定了三个事件（drag、dragend、contextmenu），
     * 事件绑定之后是需要解绑的，不过Leaflet 的事件绑定是和对象实例绑定的，
     * 一旦你调用 map.removeLayer(marker)，
     * 这个 marker 就被销毁了，它的事件也随之失效， 
     * 所以你只需要在 exitEditMode() 中清理掉 vertexMarkers，
     * 就可以完成“事件解绑”的效果
     *
     * @abstract
     * @memberof BaseEditor
     */
    protected abstract exitEditMode(): void;

    /** 获取最后的坐标数据并提交保存
     *
     *
     * @protected
     * @abstract
     * @memberof BaseEditor
     */
    protected abstract getCurrentMarkerCoords(): any;

    /** 根据坐标重建 marker 和图形
     *
     *
     * @protected
     * @abstract
     * @param {any[]} coords  latlngs坐标数组
     * @memberof BaseEditor
     */
    protected abstract reBuildMarker(coords: any[]): void;

    /** 实时更新中线点的位置（传参意思：用户正在拖动的避免销毁和重新构建）
     *
     *
     * @protected
     * @abstract
     * @param {L.Marker} [skipMarker]
     * @memberof BaseEditor
     */
    protected abstract updateMidpoints(skipMarker?: L.Marker): void;

    /** 重渲染
     *
     *
     * @protected
     * @abstract
     * @param {any} coordinatesArray 坐标数组
     * @memberof BaseEditor
     */
    protected abstract reBuildMarkerAndRender(coordinatesArray: any): void;

    /** 撤回
     *
     *
     * @protected
     * @memberof BaseEditor
     */
    protected undoEdit(): void {
        if (this.historyStack.length < 2) return;
        const popItem = this.historyStack.pop(); // 弹出当前状态
        if (popItem) this.redoStack.push(popItem); // 用于重做
        const previous = this.historyStack[this.historyStack.length - 1]; // 获取上一个状态
        this.reBuildMarkerAndRender(previous);
    };

    /** 取消撤回
     *
     *
     * @protected
     * @memberof BaseEditor
     */
    protected redoEdit(): void {
        if (!this.redoStack.length) return;
        const next = this.redoStack.pop();
        if (next) {
            this.historyStack.push(next);
            this.reBuildMarkerAndRender(next);
        }
    };

    /** 重置回[编辑前]的状态
     *
     *
     * @protected
     * @memberof BaseEditor
     */
    protected resetToInitial(): void {
        if (!this.historyStack.length) return;
        // 保存当前状态到重做栈，以便用户可以恢复（简言之，将撤销全部的操作也当作一个快照，方便用户后悔）
        const currentState = this.historyStack[this.historyStack.length - 1];
        const initial = this.historyStack[0];
        // 存储快照
        this.redoStack.push(currentState);
        // 渲染初始状态
        this.reBuildMarkerAndRender(initial);
    };

    /** 完成编辑
     *
     *
     * @protected
     * @memberof BaseEditor
     */
    protected commitEdit(): void {
        const current = this.getCurrentMarkerCoords();
        this.historyStack = [current]; // 读取当前状态作为新的初始快照
        this.redoStack = []; // 清空重做栈（如果有）
        this.exitEditMode();
        // 事件监听停止。
        this.deactivate();
        this.updateAndNotifyStateChange(EditorState.Idle);
        this.reset();
    };

    // #endregion

    // #region 编辑器的状态管理，比如当前是否是激活状态，状态的更新改变，以及向外部吐出当前状态等

    // 静态属性 - 所有编辑器实例共享同一个激活状态
    private static currentActiveEditor: BaseEditor<any> | null = null;

    /** 激活当前编辑器实例
     * 
     */
    protected activate(): void {
        // console.log('激活编辑器:', this.constructor.name);

        // 保存之前的激活编辑器
        const previousActiveEditor = BaseEditor.currentActiveEditor;

        // 停用之前激活的编辑器
        if (previousActiveEditor && previousActiveEditor !== this) {
            // console.log('停用之前的编辑器:', previousActiveEditor.constructor.name);
            previousActiveEditor.exitEditMode(); // 强制退出编辑模式
            // 吐出状态
            if (this.currentState === EditorState.Editing) {
                this.updateAndNotifyStateChange(EditorState.Idle);
            }
            previousActiveEditor.deactivate(); // 停用激活状态
        }

        // 设置当前实例为激活状态
        BaseEditor.currentActiveEditor = this;
    }

    /** 停用当前编辑器实例
     * 
     */
    protected deactivate(): void {
        // console.log('停用编辑器:', this.constructor.name);

        if (BaseEditor.currentActiveEditor === this) {
            BaseEditor.currentActiveEditor = null;
        }


    }

    /** 检查当前实例是否激活
     * 
     */
    protected isActive(): boolean {
        return BaseEditor.currentActiveEditor === this && this.layerVisble;
    }

    // #endregion

    // #region 向外吐出绘制结果的事件收集器（发布订阅模式，地图监听事件也是发布订阅模式）

    // 1：我们需要记录当前状态是处于绘制状态--见：currentState变量
    protected currentState: EditorState = EditorState.Idle; // 默认空闲状态
    // 2：我们需要一个数组，存储全部的监听事件，然后在状态改变时，触发所有这些事件的监听回调！
    private stateListeners: ((state: EditorState) => void)[] = [];

    /** 外部监听者添加的回调监听函数，存储到这边，状态改变时，触发这些监听事件的回调
     *
     *
     * @param {(state: EditorState) => void} listener // 监听事件
     * @param {EditorListenerConfigs} [configs={ immediateNotify: false }] // 配置参数
     * @memberof BaseEditor
     */
    public onStateChange(listener: (state: EditorState) => void, configs: EditorListenerConfigs = { immediateNotify: false }): void {
        // 存储回调事件并立刻触发一次
        this.stateListeners.push(listener);
        configs.immediateNotify && listener(this.currentState);
    }

    /** 添加移除单个监听器的方法 
     * 
     */
    public offStateChange(listener: (state: EditorState) => void): void {
        const index = this.stateListeners.indexOf(listener);
        if (index > -1) {
            this.stateListeners.splice(index, 1);
        }
    }

    /** [内部使用] 清空所有状态监听器 
     * 
     */
    private clearAllStateListeners(): void {
        this.stateListeners = [];
    }

    /** 状态改变时，触发存储的所有监听事件的回调
     *
     *
     * @protected
     * @param {PolygonEditorState} status
     * @param {boolean} [immediateNotify] (立即发出消息通知)
     * @return {*}  {void}
     * @memberof BaseEditor
     */
    protected updateAndNotifyStateChange(status: EditorState, immediateNotify: boolean = true): void {
        this.currentState = status;
        if (immediateNotify) {
            this.stateListeners.forEach(fn => fn(this.currentState));
        }
    }

    // #endregion

    // #region 编辑器的几何校验内容

    // 添加校验配置
    protected validationOptions: ValidationOptions = {};

    /** 更新几何校验的内容项
     * 
     *
     * @param {ValidationOptions} rules
     * @memberof LeafletPolyline
     */
    public setValidationOptions(rules: ValidationOptions): void {
        this.validationOptions = { ...this.validationOptions, ...rules };
    }

    /** 获取几何校验的内容项
     * 
     *
     * @param {ValidationOptions} rules
     * @memberof LeafletPolyline
     */
    public getValidationOptions(): ValidationOptions {
        return this.validationOptions;
    }

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

    // #region 其他函数

    /** 销毁图层，从地图中移除图层
     *
     *
     * @memberof LeafletEditPolygon
     */
    public destroy() {
        // #region 1：绘制图层用到的内容
        this.layerDestroy();
        // #endregion

        // #region 2：编辑模式用到的内容
        // 关闭事件监听内容
        this.deactivate();
        // 编辑模式的内容也重置
        this.exitEditMode();
        // #endregion

        // #region 3：吸附用到的内容
        this.cleanupSnapResources();
        // #endregion

        // #region3：地图相关内容处理（关闭事件监听，恢复部分交互功能【缩放、鼠标手势】）
        this.offMapEvents(this.map);
        this.reset();
        // #endregion
        // #region4：清除类自身绑定的相关事件
        this.clearAllStateListeners();
        // 设置为空闲状态，并发出状态通知
        this.updateAndNotifyStateChange(EditorState.Idle);
        // #endregion

    }

    // #endregion

    // 初始化编辑器
    constructor(map: L.Map, options: LeafletEditorOptions) {
        if (!map) throw new Error('传入的地图对象异常，请先确保地图对象已实例完成。');
        // 对于编辑器来说，我是否应该考虑精度问题？我觉得应该考虑，因为无论是吸附、还是topo，都会涉及到精度问题，所以我觉得在编辑器基类中，应该把这个精度问题的配置项做好，后续其他编辑器继承了这个基类，就可以直接使用这个精度配置项了。
        this.map = map;
        if (this.map) {
            // 1、编辑器是否启用吸附功能(初始化吸附控制器，设置吸附模式、吸附范围阈值、吸附高亮配置等)
            if (options?.snap?.enabled) {
                // 初始化吸附控制器 
                this.snapHighlightLayer = L.layerGroup().addTo(map);
                this.initSnap(map, options?.snap);
            }

            // 2、编辑器是否启用编辑功能( 子类可能扩充这个内容，initEditOptions还是放在子类中调用吧)
            if (options.edit?.enabled) {
                this.initEditOptions(options?.edit);
            }

            // 3、编辑器是否启用几何有效性校验功能(初始化校验配置，设置允许、校验失败时的样式等 )
            if (options.validation) {
                // 校验规则
                this.validationOptions = {
                    ...options?.validation
                };
            }
        }

    }

}