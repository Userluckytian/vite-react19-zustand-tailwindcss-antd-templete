import { PolygonEditorState } from "../types";

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

    constructor(map: L.Map) {
        if (!map) throw new Error('传入的地图对象异常，请先确保地图对象已实例完成。');
        this.map = map;
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
     * @private
     * @memberof BaseEditor
     */
    protected updateAndNotifyStateChange(status: PolygonEditorState): void {
        this.currentState = status;
        this.stateListeners.forEach(fn => fn(this.currentState));
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


    // #region 渲染行为

    /** 退出编辑模式
     *
     *
     * @abstract
     * @memberof BaseEditor
     */
    public abstract exitEditMode(): void;

    // #endregion
}