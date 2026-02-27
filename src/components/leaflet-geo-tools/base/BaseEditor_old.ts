import { buildMarkerIcon } from "@/components/custom-leaflet-draw/utils/commonUtils";
import { EditorState, type BaseEditOptions, type EditorListenerConfigs } from "../types";

/** 作为编辑器基类-提供通用部分
 *  1：图层管理
 * */
export abstract class BaseEditor<T extends L.Layer> {
    // 静态属性 - 所有编辑器实例共享同一个激活状态
    private static currentActiveEditor: BaseEditor<any> | null = null;
    protected isDraggingPolygon = false; // 是否是拖动多边形
    protected dragStartLatLng: L.LatLng | null = null; // 拖动多边形时，用户鼠标按下（mousedown）那一刻的坐标点，然后鼠标移动（mousemove）时，遍历全部的marker，做坐标偏移计算。
    protected isVisible = true; // 图层可见性
    // 编辑时的顶点配置
    protected baseEditOptions: BaseEditOptions = {
        // 顶点属性信息
        enabled: true,
        vertexsMarkerStyle: {
            icon: buildMarkerIcon(),
            draggable: true,
            pane: 'markerPane'
        },
    };

    // #region 绘制图层需要的全部内容

    // 定义图层（先设置protected，后续需要再放开）
    protected layer: T;

    // 当前状态
    protected currentState: EditorState = EditorState.Idle;
    // 状态监听器存储数组，比如来了多个监听函数，触发的时候，要遍历全部监听函数。
    protected stateListeners: ((state: EditorState) => void)[] = [];

    constructor() { }

    /** 创建图层对象
     * 
     * */
    protected abstract createLayer<U extends L.LayerOptions>(layerOptions: U, geometry?: L.LatLng | L.LatLng[]): void;

    /** 绑定地图事件(任何几何图层，绘制时，都需要关联地图事件)
     * 
     * */
    protected abstract bindMapEvents(): void;

    /** 关闭地图事件(任何几何图层，绘制时，都需要关联地图事件)
     * 
     * */
    protected abstract offMapEvents(): void;

    /** 
     * 图层显隐控制 
     */
    protected abstract setLayerVisibility(visible: boolean): void;

    /** 
     * 获取图层的geometry信息 
     */
    protected abstract getGeoJson(): GeoJSON.Feature;

    /** 
     * 获取绘制的图层本身
     */
    protected getLayer(): L.Layer {
        return this.layer;
    }

    /** 销毁图层
     * 
     */
    protected layerDestroy(): void { // 销毁图层（起这个名字是为了规避编辑器的销毁事件。）
        if (this.layer) {
            this.layer.remove();
            this.layer = null;
        }
    }

    // #endregion

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
        if (this.currentState === EditorState.Editing) {
            this.updateAndNotifyStateChange(EditorState.Idle);
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
     * @param {EditorState} status
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

    /** 设置编辑器当前的状态，
     *
     *
     * @param {EditorState} status
     * @memberof BaseEditor
     */
    public setCurrentState(status: EditorState): void {
        this.currentState = status;
    }
    /** 返回编辑器当前的状态，
     *
     *
     * @param {EditorState} status
     * @memberof BaseEditor
     */
    public getCurrentState(): EditorState {
        return this.currentState;
    }

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

    /** 移除监听器的方法
     *
     *
     * @param {(state: EditorState) => void} listener
     * @memberof BaseEditor
     */
    public offStateChange(listener: (state: EditorState) => void): void {
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

    // #region 编辑行为

    /** 初始化编辑点marker的配置信息
     *
     *
     * @protected
     * @memberof BaseEditor
     */
    protected initBaseEditOptions(options?: BaseEditOptions): BaseEditOptions {
        if (options) {
            const userConfig: BaseEditOptions = {
                enabled: options?.enabled ?? this.baseEditOptions.enabled,
                vertexsMarkerStyle: options?.vertexsMarkerStyle
                    ? { ...this.baseEditOptions.vertexsMarkerStyle, ...options.vertexsMarkerStyle }
                    : this.baseEditOptions.vertexsMarkerStyle
            };
            // save
            this.baseEditOptions = userConfig;
        }
        return { ...this.baseEditOptions };
    }

    /** 更新编辑配置
      *
      *
      * @abstract
      * @memberof BaseEditor
      */
    public abstract updateEditOptions(options: BaseEditOptions): void;

    /** 退出编辑模式
     *
     *
     * @abstract
     * @memberof BaseEditor
     */
    public abstract exitEditMode(): void;

    // #endregion


    /** 销毁编辑器
     * 
     */
    protected destroy(): void {
        // 第一步：关闭事件
        this.offMapEvents();
        // 第二步：销毁图层
        this.layerDestroy();
        // 第三步：销毁状态等
    }



}