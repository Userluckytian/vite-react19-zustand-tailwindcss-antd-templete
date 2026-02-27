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

/* 类型实例类型 */
// export type drawInstance = LeafletCircle | MarkerPoint | LeafletPolygon | LeafletPolyline | LeafletRectangle;
// export type measureInstance = LeafletArea | LeafletDistance;
export type editInstance = CircleEditor | MarkerPointEditor | PolygonEditor | PolylineEditor | RectangleEditor;
export type EditorInstance = editInstance;
