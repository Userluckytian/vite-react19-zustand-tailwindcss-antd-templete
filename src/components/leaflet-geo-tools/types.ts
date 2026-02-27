import type CircleEditor from "./editor/circleEditor";
import type MarkerPointEditor from "./editor/markerPointEditor";
import type PolygonEditor from "./editor/polygonEditor";
import type PolylineEditor from "./editor/polylineEditor";
import type RectangleEditor from "./editor/rectangleEditor";

/* 编辑器状态 */
export enum EditorState {
    Idle = 'idle',       // 空闲状态：既不是绘制中，也不是编辑中
    Drawing = 'drawing', // 正在绘制
    Editing = 'editing'  // 正在编辑
}

/* 定义编辑器监听事件---的配置属性信息  */
export interface EditorListenerConfigs {
    immediateNotify?: boolean; // 是否立即触发状态监听
}

// 编辑配置属性信息(规则，如果启用编辑，必然渲染顶点！但是中间点和拖动边的marker不一定渲染)
// 基础编辑配置（所有编辑器都有的）
export interface BaseEditOptions {
    enabled: boolean; // 是否启用编辑
    vertexsMarkerStyle?: L.MarkerOptions; // 顶点样式渲染
}

export interface LeafletPolylineOptions extends L.PolylineOptions {
    origin?: any; // 可以存放源信息
    [key: string]: unknown
}

export interface LeafletEditorOptions {
    defaultStyle?: LeafletPolylineOptions; // 存放（用户自己想要设置的）图层的默认样式信息
    snap?: SnapOptions;  // 吸附配置信息
    edit?: EditOptionsExpends; // 编辑信息
    validation?: ValidationOptions;   // 几何有效性校验（之前考虑放到topo里。但是topo一般是自身和其他几何的相互关系。而自相交是和自身，所以我考虑区分开）
}

// #region  吸附内容 
export type SnapMode = 'vertex' | 'edge';
export type SnapOptions = {
    enabled: boolean; // 是否开启对齐(吸附)功能
    modes: SnapMode[]; // 吸附模式
    tolerance?: number; // 吸附范围阈值
    highlight?: SnapHighlightLayerOptions; // 吸附高亮配置
};

// 吸附高亮图层配置
export interface SnapHighlightLayerOptions {
    enabled?: boolean;           // 是否显示高亮
    pointStyle?: L.CircleMarkerOptions;
    edgeStyle?: L.PolylineOptions;
}

// 编辑配置属性信息(规则，如果启用编辑，必然渲染顶点！但是中间点和拖动边的marker不一定渲染)
// 基础编辑配置（所有编辑器都有的）
export interface BaseEditOptions {
    enabled: boolean;
    vertexsMarkerStyle?: L.MarkerOptions;
}

export interface EditOptionsExpends extends BaseEditOptions {
    dragLineMarkerOptions?: DragMarkerOptions; // 拖动边的marker的属性信息
    dragMidMarkerOptions?: DragMarkerOptions; // 拖动中点的marker属性信息
}
// 校验配置属性信息
export type ValidationOptions = {
    allowSelfIntersect?: boolean; // 是否允许自相交
    validErrorPolygonStyle?: L.PolylineOptions; // 校验失败时的样式
    validErrorLineStyle?: L.PolylineOptions; // 校验失败时的样式
    validErrorPointStyle?: L.MarkerOptions; // 校验失败时的样式
}

export type DragMarkerOptions = {
    enabled: boolean; // 是否启用拖拽线功能
    dragMarkerStyle?: L.MarkerOptions; // 拖动边的样式
    positionRatio?: number; // 中点位置比例（0-1，默认 0.3）
}

// 吸附结果
export interface SnapResult {
    snappedLatLng: L.LatLng;                                                            // 吸附后的位置
    snapped: boolean;                                                                   // 是否发生吸附
    type?: 'vertex' | 'edge';                                                           // 吸附类型
    target?: L.LatLng | { start: L.LatLng; end: L.LatLng } | undefined | null;          // 吸附目标
}

// 空间索引，为处理吸附时，线和面这种类型的对象提供索引
export interface GeometryIndex {
    type: 'polygon' | 'polyline';
    vertices: L.LatLng[];
    edges: { start: L.LatLng; end: L.LatLng }[];
    bounds: L.LatLngBounds;
    geometry: GeoJSON.Geometry;
}

// #endregion 



/* 类型实例类型 */
// export type drawInstance = LeafletCircle | MarkerPoint | LeafletPolygon | LeafletPolyline | LeafletRectangle;
// export type measureInstance = LeafletArea | LeafletDistance;
export type editInstance = CircleEditor | MarkerPointEditor | PolygonEditor | PolylineEditor | RectangleEditor;
export type EditorInstance = editInstance;