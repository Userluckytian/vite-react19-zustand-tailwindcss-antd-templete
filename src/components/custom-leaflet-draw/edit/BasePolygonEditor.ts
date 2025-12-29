import { PolygonEditorState } from "../types";
import { BaseEditor } from "./BaseEditor";

// BasePolygonEditor.ts - 多边形基类
export abstract class BasePolygonEditor extends BaseEditor {
    protected vertexMarkers: L.Marker[][][] = []; // 存储顶点标记的数组
    protected midpointMarkers: L.CircleMarker[][][] = []; // 存储【线中点】标记的数组
    protected historyStack: number[][][][][] = []; // 历史记录，存储快照
    protected redoStack: number[][][][][] = []; // 重做记录，存储快照

    constructor(map: L.Map) {
        super(map);
    }

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
