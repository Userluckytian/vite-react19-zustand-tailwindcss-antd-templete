// 使用字符串字面量类型避免循环依赖

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

export interface EditOptionsExpends extends BaseEditOptions {
    dragLineMarkerOptions?: DragMarkerOptions; // 拖动边的marker的属性信息
    dragMidMarkerOptions?: DragMarkerOptions; // 拖动中点的marker属性信息
    // +++其他新增的建议以类型+“_”为开头+++
    circle_LinkRadiusAndCenterDashLineOptions?: CircleDashLineOptions // 圆形：连接半径和中心点的虚线的样式
    // 我担心用户万一需要拓展新属性。。。
    [key: string]: unknown;
}

export interface LeafletPolylineOptions extends L.PolylineOptions {
    origin?: any; // 可以存放源信息
    [key: string]: unknown
}
export interface LeafletMarkerOptions extends L.MarkerOptions {
    origin?: any; // 可以存放源信息
    [key: string]: unknown
}

export interface LeafletEditorOptions {
    coordPrecision?: number, // 坐标精度
    defaultGeometry?: GeoJSON.Geometry; // 默认几何信息（如果有的话，可以在编辑时直接加载）
    defaultStyle?: LeafletPolylineOptions | LeafletMarkerOptions; // 存放（用户自己想要设置的）图层的默认样式信息
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


// 校验配置属性信息
export type ValidationOptions = {
    allowSelfIntersect?: boolean; // 是否允许自相交
    validErrorPolygonStyle?: L.PolylineOptions; // 校验失败时的样式
    validErrorLineStyle?: L.PolylineOptions; // 校验失败时的样式
    validErrorPointStyle?: L.MarkerOptions; // 校验失败时的样式
}

export type DragMarkerOptions = {
    enabled: boolean; // 是否启用拖拽线功能
    dragMarkerStyle: L.MarkerOptions; // 拖动边的样式
    positionRatio: number; // 中点位置比例（0-1，默认 0.3）
}
export type CircleDashLineOptions = {
    enabled: boolean; // 是否启用这个虚线
    dashLineStyle: L.PolylineOptions // 虚线的样式
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



/* 类型实例类型 - 使用 any 类型避免循环依赖 */
export type drawInstance = any; // CircleEditor | MarkerPointEditor | PolygonEditor | PolylineEditor | RectangleEditor;
export type measureInstance = any; // LeafletArea | LeafletDistance;
export type EditorInstance = drawInstance | measureInstance;


// 中点标记（插入中点标记（红色marker） 和 拖动边的标记（蓝色marker））
export type MidpointPair = {
    insert: L.Marker | null;
    edge: L.Marker | null;
};
// ----------------------------------


/* 拓展leaflet-绘制面、线属性（用于存放用户自定义的属性内容）  */
// #region 拓扑内容
export interface TopoOptions {
    precision?: number // topo操作时，坐标的精度
    circleStep?: number // topo操作时，圆的拟和点的数量
}
/* topo操作执行合并(union)后返回的结果 */
export interface TopoMergeResult {
    mergedLayers: L.GeoJSON[];
    mergedGeom: GeoJSON.Feature | null;
}
// topo操作执行裁剪（clip）后返回的结果
export interface TopoClipResult {
    doClipLayers: L.Layer[]; // 参与裁剪的图层数组
    clipedGeoms: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[];  // 裁剪完毕获取的全部单面
}
// topo操作执行整形要素工具（reshape Feature）后返回的结果
export interface TopoReshapeFeatureResult {
    doReshapeLayers: L.Layer[]; // 参与整形的图层数组
    reshapedGeoms: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon | GeoJSON.LineString>[];  // 整形完毕获取的全部单面
}
// topo操作执行整形要素工具的配置项
export interface ReshapeOptions {
    /**
     * auto: 自动保留 reshape 后周长最大的结果
     * manual: 返回所有候选结果，由调用方决定保留哪一个
     */
    chooseStrategy?: 'auto' | 'manual';
    /**
     * 允许在未选择任何图层的情况下进行整形操作
     * 默认为 false
     */
    AllowReshapingWithoutSelection?: Boolean;
}

// #endregion

