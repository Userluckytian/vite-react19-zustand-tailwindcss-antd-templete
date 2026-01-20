import { PolygonEditorState, type EditOptions, type SnapOptions } from "../types";
import { buildMarkerIcon } from "../utils/commonUtils";
import { BaseEditor } from "./BaseEditor";

// BaseRectangleEditor.ts - 矩形基类
export abstract class BaseRectangleEditor extends BaseEditor {

    protected vertexMarkers: L.Marker[] = []; // 存储顶点标记的数组
    protected historyStack: number[][][] = []; // 历史记录，存储快照
    protected redoStack: number[][][] = []; // 重做记录，存储快照

    // 中点配置（在矩形基类中定义）
    protected editOptions: EditOptions = {
        // 顶点属性信息
        enabled: true,
        vertexsMarkerStyle: {
            icon: buildMarkerIcon(),
            draggable: true,
            pane: 'markerPane'
        },
    };

    constructor(map: L.Map, options: { snap?: SnapOptions, edit?: EditOptions }) {
        super(map, { snap: options?.snap });
        // 编辑点marker的配置信息初始化
        this.initEditOptions(options?.edit);
    }

    // #region 编辑点marker的配置信息

    /** 初始化编辑点marker的配置信息
     *
     *
     * @private
     * @param {DragMarkerOptions} [dragMidMarkerOptions] // 中点拖拽标记配置信息
     * @param {DragMarkerOptions} [dragLineMarkerOptions] // 边线拖拽标记配置信息
     * @memberof BasePolygonEditor
     */
    private initEditOptions(edit?: EditOptions): void {
        if (!edit) return;
        const { enabled, vertexsMarkerStyle, dragMidMarkerOptions, dragLineMarkerOptions } = edit;

        const userConfig: EditOptions = {
            enabled: enabled ?? this.editOptions.enabled,
            vertexsMarkerStyle: vertexsMarkerStyle ?? this.editOptions.vertexsMarkerStyle,
        };
        // save
        this.editOptions = userConfig;
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
     * @memberof SimpleBaseEditor
     */
    public commitEdit(): void {
        const current = this.vertexMarkers.map(m => [m.getLatLng().lat, m.getLatLng().lng]);
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

    // #region 编辑行为
    /**
     * 获取当前标记的坐标（辅助方法）
     * @private
     */
    private getCurrentMarkerCoords(): number[][] {
        return this.vertexMarkers.map(marker => [marker.getLatLng().lat, marker.getLatLng().lng]);
    }

    /**
     * 更新编辑配置
     * @param options 编辑配置
     */
    public updateEditOptions(options: EditOptions): void {
        // 深度合并配置
        this.mergeEditOptions(options);

        // 如果正在编辑，需要重新渲染
        if (this.currentState === PolygonEditorState.Editing) {
            const currentCoords = this.getCurrentMarkerCoords();
            this.reBuildMarkerAndRender(currentCoords);
        }
    }

    /**
     * 获取是否启用编辑
     */
    public getEditEnabled(): boolean {
        return this.editOptions.enabled;
    }

    /**
     * 设置是否启用编辑
     * @param enabled 是否启用
     */
    public setEditEnabled(enabled: boolean): void {
        const oldEnabled = this.editOptions.enabled;

        if (oldEnabled !== enabled) {
            this.editOptions.enabled = enabled;

            // 如果从启用变为禁用，且正在编辑，强制退出编辑模式
            if (oldEnabled && !enabled && this.currentState === PolygonEditorState.Editing) {
                this.forceExitEditMode();
            }

            // // 如果从禁用变为启用，且当前是空闲状态，可以重新激活（可选）
            // if (!oldEnabled && enabled && this.currentState === PolygonEditorState.Idle) {
            //     // 这里可以根据需求决定是否自动进入编辑模式
            //     console.log('编辑功能已启用，双击图形可进入编辑模式');
            // }
        }
    }

    /**
     * 深度合并编辑配置
     * @private
     */
    private mergeEditOptions(options: EditOptions): void {
        this.editOptions = {
            enabled: options?.enabled ?? this.editOptions.enabled,
            vertexsMarkerStyle: options?.vertexsMarkerStyle ? { ...this.editOptions.vertexsMarkerStyle, ...options?.vertexsMarkerStyle } : this.editOptions.vertexsMarkerStyle,
        }
    }
    // #endregion

    // #region 渲染行为

    /** 根据坐标重建 marker 和图形 + 重新渲染图层
     *
     *
     * @protected
     * @abstract
     * @param {number[][]} latlngs
     * @memberof SimpleBaseEditor
     */
    protected abstract reBuildMarkerAndRender(latlngs: number[][]): void;

    // #endregion

}