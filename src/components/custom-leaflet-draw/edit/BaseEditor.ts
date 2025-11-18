/* 本组件，设计初衷是整理编辑会用到的内容，其他类来继承本组件实现编辑相关的功能。
 * 比如绘制面、绘制矩形、绘制线【继承】本组件，就可以使用编辑相关的功能了。
 * */

import * as L from 'leaflet';
import { PolygonEditorState } from '../types';
import { modeManager } from '../interaction/InteractionModeManager';

// 抽象类里面的抽象函数，需要外部继承类自己实现
export abstract class BaseEditor {

    protected map: L.Map; // 地图对象
    protected currentState: PolygonEditorState = PolygonEditorState.Idle; // 当前状态
    protected vertexMarkers: L.Marker[] = []; // 存储顶点标记的数组
    protected midpointMarkers: L.CircleMarker[] = []; // 存储【线中点】标记的数组
    protected historyStack: number[][][] = []; // 历史记录，存储快照
    protected redoStack: number[][][] = []; // 重做记录，存储快照
    protected stateListeners: ((state: PolygonEditorState) => void)[] = []; // 状态监听器存储数组，比如来了多个监听函数，触发的时候，要遍历全部监听函数。
    protected isDraggingPolygon = false; // 是否是拖动多边形
    protected dragStartLatLng: L.LatLng | null = null; // 拖动多边形时，用户鼠标按下（mousedown）那一刻的坐标点，然后鼠标移动（mousemove）时，遍历全部的marker，做坐标偏移计算。

    constructor(map: L.Map) {
        if (!map) throw new Error('传入的地图对象异常，请先确保地图对象已实例完成。');
        this.map = map;
    }

    // #region 事件回调
    /** 状态改变时，触发存储的所有监听事件的回调
     *
     *
     * @private
     * @memberof BaseEditor
     */
    protected updateAndNotifyStateChange(status: PolygonEditorState): void {
        this.currentState = status;
        this.stateListeners.forEach(fn => fn(this.currentState));
        // ✅ 同步设置交互模式
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
     * @param {(state: PolygonEditorState) => void} listener
     * @memberof BaseEditor
     */
    public onStateChange(listener: (state: PolygonEditorState) => void): void {
        // 存储回调事件并立刻触发一次
        this.stateListeners.push(listener);
        listener(this.currentState);
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
    public clearAllStateListeners(): void {
        this.stateListeners = [];
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
        const current = this.vertexMarkers.map(m => [m.getLatLng().lat, m.getLatLng().lng]);
        this.historyStack = [current]; // 读取当前状态作为新的初始快照
        this.redoStack = []; // 清空重做栈（如果有）
        this.exitEditMode();
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
    protected abstract reBuildMarkerAndRender(latlngs: number[][]): void;

    /** 退出编辑模式
     *
     *
     * @abstract
     * @memberof BaseEditor
     */
    public abstract exitEditMode(): void;

    // #endregion
}