import type LeafletCircle from "./draw/circle";
import type MarkerPoint from "./draw/markerPoint";
import type LeafletPolygon from "./draw/polygon";
import type LeafletPolyline from "./draw/polyline";
import type LeafletRectangle from "./draw/rectangle";
import type LeafletEditPolygon from "./simpleEdit/polygon";
import type LeafletEditRectangle from "./simpleEdit/rectangle";
import type LeafletArea from "./measure/area";
import type LeafletDistance from "./measure/distance";
import type LeafletRectangleEditor from "./edit/rectangle";
import type LeafletPolygonEditor from "./edit/polygon";

// #region  吸附内容 
export type SnapMode = 'vertex' | 'edge';
export type SnapOptions = {
    enabled: boolean; // 是否开启对齐(吸附)功能
    modes: SnapMode[]; // 吸附模式
    tolerance?: number; // 吸附范围阈值
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


export enum PolygonEditorState {
    Idle = 'idle',       // 空闲状态：既不是绘制中，也不是编辑中
    Drawing = 'drawing', // 正在绘制
    Editing = 'editing'  // 正在编辑
}

/* 类型实例类型 */
export type drawInstance = LeafletCircle | MarkerPoint | LeafletPolygon | LeafletPolyline | LeafletRectangle;
export type measureInstance = LeafletArea | LeafletDistance;
export type editorInstance = LeafletEditPolygon | LeafletEditRectangle | LeafletRectangleEditor | LeafletPolygonEditor;
export type leafletGeoEditorInstance = drawInstance | measureInstance | editorInstance;

// 中点标记（插入中点标记（红色marker） 和 拖动边的标记（蓝色marker））
export type MidpointPair = {
    insert: L.Marker;
    edge: L.Marker;
};

/* 拓展leaflet-绘制面、线属性（用于存放用户自定义的属性内容）  */
export interface LeafletPolylineOptionsExpends extends L.PolylineOptions {
    origin?: any; // 可以存放源信息
    defaultStyle?: any; // 存放（用户自己想要设置的）图层的默认样式信息
    snap?: SnapOptions;
    [key: string]: unknown
}


// #region 拓扑内容
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

