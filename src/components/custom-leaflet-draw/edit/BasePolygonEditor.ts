import * as L from "leaflet";
import { PolygonEditorState, type DragMarkerOptions, type MidPointInitOptions, type MidpointPair, type SnapOptions } from "../types";
import { BaseEditor } from "./BaseEditor";
import { buildMarkerIcon } from "../utils/commonUtils";

// BasePolygonEditor.ts - 多边形基类
export abstract class BasePolygonEditor extends BaseEditor {
    protected vertexMarkers: L.Marker[][][] = []; // 存储顶点标记的数组
    protected midpointMarkers: MidpointPair[][][] = []; // 存储【线中点、拖动线marker】两种标记的数组
    protected historyStack: number[][][][][] = []; // 历史记录，存储快照
    protected redoStack: number[][][][][] = []; // 重做记录，存储快照

    // 中点配置（在多边形基类中定义）
    protected midpointOptions: MidPointInitOptions = {
        midPointEnable: true,
        midPointDefaultMarkerOptions: {
            // 多边形/线共用的默认中点样式
            icon: buildMarkerIcon("border-radius: 50%; background: #ffffff80; border: solid 1px #f00;", [14, 14]),
            // icon: L.divIcon({
            //     className: 'polygon-midpoint-insert',
            //     html: `<div style="border-radius:50%;background:#fff;border:2px solid #f00;width:14px;height:14px"></div>`,
            //     iconSize: [14, 14]
            // }),
            draggable: true,
            pane: 'markerPane'
        },
        midPointPositionRatio: 0.3,
        edgeEnable: true,
        edgeDefaultMarkerOptions: {
            // 多边形/线共用的默认边拖动样式
            icon: buildMarkerIcon("border-radius: 50%; background: #007bff80; border: solid 1px #007bff;", [14, 14]),
            // icon: L.divIcon({
            //     className: 'polygon-midpoint-edge',
            //     html: `<div style="border-radius:50%;background:#007bff;border:2px solid #007bff;width:12px;height:12px;opacity:0.7"></div>`,
            //     iconSize: [12, 12]
            // }),
            draggable: true,
            pane: 'markerPane'
        },
        edgePositionRatio: 0.6,
        showOnHover: true // 这个属性暂时没有使用上
    };

    constructor(map: L.Map, options: { snap?: SnapOptions, dragLineMarkerOptions?: DragMarkerOptions, dragMidMarkerOptions?: DragMarkerOptions }) {
        super(map, { snap: options?.snap });
        // 中点坐标配置信息初始化
        this.initMidpointOptions(options?.dragMidMarkerOptions, options?.dragLineMarkerOptions);
    }

    // #region 中点坐标配置信息

    /** 初始化中点坐标配置信息
     *
     *
     * @private
     * @param {DragMarkerOptions} [dragMidMarkerOptions] // 中点拖拽标记配置信息
     * @param {DragMarkerOptions} [dragLineMarkerOptions] // 边线拖拽标记配置信息
     * @memberof BasePolygonEditor
     */
    private initMidpointOptions(dragMidMarkerOptions?: DragMarkerOptions, dragLineMarkerOptions?: DragMarkerOptions): void {
        const userConfig: MidPointInitOptions = {
            midPointEnable: dragMidMarkerOptions?.enabled ?? this.midpointOptions.midPointEnable,
            edgeEnable: dragLineMarkerOptions?.enabled ?? this.midpointOptions.edgeEnable,
            midPointDefaultMarkerOptions: dragMidMarkerOptions?.dragMarkerStyle ?? this.midpointOptions.midPointDefaultMarkerOptions,
            edgeDefaultMarkerOptions: dragLineMarkerOptions?.dragMarkerStyle ?? this.midpointOptions.edgeDefaultMarkerOptions,
            midPointPositionRatio: (dragMidMarkerOptions?.enabled && dragLineMarkerOptions?.enabled) ? 0.3 : 0.5,
            edgePositionRatio: (dragMidMarkerOptions?.enabled && dragLineMarkerOptions?.enabled) ? 0.6 : 0.5,
            showOnHover: true
        };
        // 强制设置可拖动
        userConfig.midPointDefaultMarkerOptions!.draggable = true;
        userConfig.edgeDefaultMarkerOptions!.draggable = true;
        // save
        this.midpointOptions = userConfig;
    }


    /** 插入中间点坐标
     *
     *
     * @private
     * @return {*}  {void}
     * @memberof LeafletEditPolygon
     */
    protected insertMidpointMarkers(skipMarker?: L.Marker): void {
        const isEnabledMidPointsMarker = this.midpointOptions.midPointEnable;
        const isEnabledEdgeMarker = this.midpointOptions.edgeEnable;
        const disableRenderMarker = (!isEnabledMidPointsMarker && !isEnabledEdgeMarker);
        if (disableRenderMarker || this.currentState !== PolygonEditorState.Editing) return;

        // 清除旧的中点标记（若数组中存在）
        this.removeAllMidPointMarkers(skipMarker);

        this.vertexMarkers.forEach((polygon, polygonIndex) => {
            const polygonMidpoints: MidpointPair[][] = [];

            polygon.forEach((ring, ringIndex) => {
                const ringMidpoints: MidpointPair[] = [];

                for (let i = 0; i < ring.length; i++) {
                    const nextIndex = (i + 1) % ring.length;
                    const p1 = ring[i];
                    const p2 = ring[nextIndex];
                    // ✅ 跳过当前边包含 skipMarker 的情况
                    if (skipMarker && (skipMarker === p1 || skipMarker === p2 || (skipMarker as any).pairRef === p1 || (skipMarker as any).pairRef === p2)) { continue; }

                    const insertMidpoint = isEnabledMidPointsMarker ? this.createInsertMidpointMarker(p1, p2, polygonIndex, ringIndex, nextIndex, this.midpointOptions.midPointPositionRatio!) : null
                    // 插入边控制点（用于拖动边） 
                    const edgeDragMarker = isEnabledEdgeMarker ? this.createEdgeDragMarker(p1, p2, polygonIndex, ringIndex, this.midpointOptions.edgePositionRatio!) : null;

                    ringMidpoints.push({ insert: insertMidpoint, edge: edgeDragMarker });
                    // 附加：互相引用 （虽然写的晚，但是一般都会在【createInsertMidpointMarker、createEdgeDragMarker】中绑定的dragstart事件之前完成）
                    if (insertMidpoint) {
                        (insertMidpoint as any).pairRef = edgeDragMarker;
                    }
                    if (edgeDragMarker) {
                        (edgeDragMarker as any).pairRef = insertMidpoint;
                    }
                }

                polygonMidpoints.push(ringMidpoints);
            });

            this.midpointMarkers.push(polygonMidpoints);
        });
    }

    /** 实时更新中线点的位置（传参意思：用户正在拖动的避免销毁和重新构建）
     *
     *
     * @private
     * @memberof LeafletEditPolygon
     */
    protected updateMidpoints(skipMarker?: L.Marker): void {
        const isEnabledMidPointsMarker = this.midpointOptions.midPointEnable;
        const isEnabledEdgeMarker = this.midpointOptions.edgeEnable;
        const disableRenderMarker = (!isEnabledMidPointsMarker && !isEnabledEdgeMarker);
        // 新增：检查是否启用中点功能
        if (disableRenderMarker) {
            // 如果已存在中点，需要清理
            if (this.midpointMarkers.length > 0) {
                this.removeAllMidPointMarkers();
                this.midpointMarkers = [];
            }
            return;
        }

        // 清除旧的中点
        this.removeAllMidPointMarkers(skipMarker);

        // 重新插入
        this.insertMidpointMarkers(skipMarker);
    }

    /** 更新【中点插入marker】坐标渲染属性信息
     *
     *
     * @public
     * @param {MidPointInitOptions} options
     * @memberof BasePolygonEditor
     */
    public updateDragMidMarkerOptions(options: DragMarkerOptions): void {
        this.midpointOptions = {
            ...this.midpointOptions,
            midPointEnable: options.enabled,
            midPointDefaultMarkerOptions: options?.dragMarkerStyle ?? this.midpointOptions.midPointDefaultMarkerOptions,
        };
        this.midpointOptions.midPointPositionRatio = (options.enabled && this.midpointOptions.edgeEnable) ? 0.3 : 0.5;
        this.midpointOptions.edgePositionRatio = (options.enabled && this.midpointOptions.edgeEnable) ? 0.6 : 0.5;
        this.updateMidpoints();
    }

    /** 更新【中点线marker】坐标渲染属性信息
     *
     *
     * @public
     * @param {MidPointInitOptions} options
     * @memberof BasePolygonEditor
     */
    public updateDragLineMarkerOptions(options: DragMarkerOptions): void {
        this.midpointOptions = {
            ...this.midpointOptions,
            edgeEnable: options.enabled,
            edgeDefaultMarkerOptions: options?.dragMarkerStyle ?? this.midpointOptions.edgeDefaultMarkerOptions,
        };
        this.midpointOptions.midPointPositionRatio = (options.enabled && this.midpointOptions.midPointEnable) ? 0.3 : 0.5;
        this.midpointOptions.edgePositionRatio = (options.enabled && this.midpointOptions.midPointEnable) ? 0.6 : 0.5;
        this.updateMidpoints();
    }

    // 抽象方法，子类实现具体的中点创建逻辑
    protected abstract createInsertMidpointMarker(
        p1: L.Marker,
        p2: L.Marker,
        polygonIndex: number,
        ringIndex: number,
        insertIndex: number,
        positionRadio: number
    ): L.Marker | null;

    protected abstract createEdgeDragMarker(
        p1: L.Marker,
        p2: L.Marker,
        polygonIndex: number,
        ringIndex: number,
        positionRadio: number
    ): L.Marker | null;

    /**
     * 获取边上某个比例位置的点（例如 1/3、2/3）
     * @param p1 起点
     * @param p2 终点
     * @param ratio 比例（0~1），例如 1/3 = 0.333
     * @returns L.LatLng
     */
    protected getFractionalPointOnEdge(p1: L.LatLng, p2: L.LatLng, ratio: number): L.LatLng {
        const lat = p1.lat + (p2.lat - p1.lat) * ratio;
        const lng = p1.lng + (p2.lng - p1.lng) * ratio;
        return L.latLng(lat, lng);
    }

    /** 移除所有中点标记（若存在正在拖动的，则跳过）
     *
     *
     * @memberof BasePolygonEditor
     */
    protected removeAllMidPointMarkers(skipMarker?: L.Marker) {
        const newMidpoints: MidpointPair[] = [];

        this.midpointMarkers.flat(2).forEach(pair => {

            const keepInsert = pair.insert && pair.insert === skipMarker;
            const keepEdge = pair.edge && pair.edge === skipMarker;

            if (!keepInsert) {
                if (pair.insert && this.map.hasLayer(pair.insert)) {
                    this.map.removeLayer(pair.insert);
                }
            }

            if (!keepEdge) {
                if (pair.edge && this.map.hasLayer(pair.edge)) {
                    this.map.removeLayer(pair.edge);
                }
            }

            // 如果有任一 marker 被保留，就保留这个 pair
            if (keepInsert || keepEdge) {
                newMidpoints.push(pair);
            }
        });

        // 重新组织为二维结构（可选）
        this.midpointMarkers = newMidpoints.length > 0 ? [[[...newMidpoints]]] : [];
    }

    // #endregion

    // #region 操作行为

    /** 撤回到上一步
     *
     *
     * @return {*}  {void}
     * @memberof BaseEditor
     */
    public undoEdit(): void {
        if (this.historyStack.length < 2) return;
        const popItem = this.historyStack.pop(); // 弹出当前状态
        if (popItem) this.redoStack.push(popItem); // 用于重做
        const previous = this.historyStack[this.historyStack.length - 1]; // 获取上一个状态
        this.reBuildMarkerAndRender(previous);
    }
    /** 前进到刚才测回的一步
     *
     *
     * @return {*}  {void}
     * @memberof BaseEditor
     */
    public redoEdit(): void {
        if (!this.redoStack.length) return;
        const next = this.redoStack.pop();
        if (next) {
            this.historyStack.push(next);
            this.reBuildMarkerAndRender(next);
        }
    }

    /** 全部撤回（建议写到二次确认的弹窗后触发）
     *
     *
     * @return {*}  {void}
     * @memberof BaseEditor
     */
    public resetToInitial(): void {
        if (!this.historyStack.length) return;
        // 保存当前状态到重做栈，以便用户可以恢复（简言之，将撤销全部的操作也当作一个快照，方便用户后悔）
        const currentState = this.historyStack[this.historyStack.length - 1];
        const initial = this.historyStack[0];
        // 存储快照
        this.redoStack.push(currentState);
        // 渲染初始状态
        this.reBuildMarkerAndRender(initial);
    }

    /** 完成编辑行为
     *
     *
     * @memberof BaseEditor
     */
    public commitEdit(): void {
        // 读取当前 marker 坐标，构建完整结构 [面][环][点][latlng]
        const current = this.vertexMarkers.map(polygon =>
            polygon.map(ring =>
                ring.map(marker => [marker.getLatLng().lat, marker.getLatLng().lng])
            )
        );
        this.historyStack = [current]; // 读取当前状态作为新的初始快照
        this.redoStack = []; // 清空重做栈（如果有）
        this.exitEditMode();
        // 事件监听停止。
        this.deactivate();
        this.updateAndNotifyStateChange(PolygonEditorState.Idle);
        this.reset();
    }

    /** 地图状态重置
     *
     *
     * @private
     * @memberof LeafletEditRectangle
     */
    public reset() {
        this.map.getContainer().style.cursor = 'grab';
        // 恢复双击地图放大事件
        this.map.doubleClickZoom.enable();
    }

    // #endregion

    // #region 渲染行为

    /** 根据坐标重建 marker 和图形 + 重新渲染图层
     *
     *
     * @protected
     * @abstract
     * @param {number[][]} latlngs
     * @memberof BaseEditor
     */
    protected abstract reBuildMarkerAndRender(latlngs: number[][][][]): void;

    // #endregion


}
