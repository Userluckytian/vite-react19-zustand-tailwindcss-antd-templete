import * as L from 'leaflet';
import { bboxPolygon, booleanValid } from '@turf/turf';
import type { BBox } from 'geojson';
import { PolygonEditorState, type BaseEditOptions, type SnapOptions, type ValidationOptions } from "../types";
import { BaseEditor } from "./BaseEditor";

// BaseRectangleEditor.ts - 矩形基类
export abstract class BaseRectangleEditor extends BaseEditor {

    protected vertexMarkers: L.Marker[] = []; // 存储顶点标记的数组
    protected historyStack: number[][][] = []; // 历史记录，存储快照
    protected redoStack: number[][][] = []; // 重做记录，存储快照

    protected rectEditConfig: BaseEditOptions | null = null;

    constructor(map: L.Map, options: { snap?: SnapOptions, edit?: BaseEditOptions, validation?: ValidationOptions }) {
        super(map, { snap: options?.snap, validation: options?.validation });
        // 编辑点marker的配置信息初始化
        this.rectEditConfig = this.initBaseEditOptions(options?.edit);
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
        // 恢复双击地图放大事件（先考虑让用户自己去写，里面不再控制）
        // this.map.doubleClickZoom.enable();
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
    public updateEditOptions(options: BaseEditOptions): void {
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
        return this.rectEditConfig!.enabled;
    }

    /**
     * 设置是否启用编辑
     * @param enabled 是否启用
     */
    public setEditEnabled(enabled: boolean): void {
        const oldEnabled = this.rectEditConfig?.enabled;

        if (oldEnabled !== enabled) {
            this.rectEditConfig!.enabled = enabled;

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
    private mergeEditOptions(options: BaseEditOptions): void {
        this.rectEditConfig = {
            enabled: options?.enabled ?? this.rectEditConfig!.enabled,
            vertexsMarkerStyle: options?.vertexsMarkerStyle ? { ...this.rectEditConfig!.vertexsMarkerStyle, ...options?.vertexsMarkerStyle } : this.rectEditConfig!.vertexsMarkerStyle,
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

    // #region 校验矩形有效性
    /** 使用 turf.booleanValid 校验矩形有效性
     *
     *
     * @private
     * @param {L.LatLng[]} coords
     * @return {*}  {boolean}
     * @memberof LeafletRectangle
     */
    protected isValidRectangle(coords: L.LatLng[]): boolean {
        if (coords.length < 2) return false;

        const point1 = coords[0];
        const point2 = coords[1];

        // 快速检查：距离是否过小
        if (point1.distanceTo(point2) < 0.1) {
            return false;
        }

        try {
            // 使用 turf 进行专业校验
            const bounds = L.latLngBounds(coords);
            const bbox: BBox = [
                bounds.getWest(),
                bounds.getSouth(),
                bounds.getEast(),
                bounds.getNorth()
            ];

            const rectanglePolygon = bboxPolygon(bbox);
            return booleanValid(rectanglePolygon);

        } catch (error) {
            return false;
        }
    }
    // #endregion
}