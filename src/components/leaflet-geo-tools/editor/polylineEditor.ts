/*
### 线
顶点拖拽、中点插入、边拖拽、顶点删除、吸附、撤销/重做、校验、状态管理、图层显隐控制、样式配置

**第一轮分析（功能的合理性：从功能的必要性，绘制行为、编辑行为等角度分析）**：

**编辑时考虑到可能是多线的情况**：是需要的 (✅)

**顶点拖拽**：对于编辑行为来说，是需要的。(✅)

**中点插入**：对于编辑行为来说，是需要的。(✅)

**边拖拽**：对于编辑行为来说，是需要的。(✅)

**顶点删除**：对于编辑行为来说，是需要的。(✅)

**吸附**：编辑和绘制时都需要。(✅)

**撤销重做**：编辑时需要，绘制时要支持撤销已经绘制的点，允许重绘。(✅，暂没有增加撤销最后一个点后，再恢复回来)

**校验**：有的，是否允许自相交 ✅

**状态管理**：用户从绘制状态变成完成状态、从编辑状态到完成状态。是必要的，可以做。 ✅

**图层显隐控制**：可做 ✅

**样式配置**：必做 ✅





**第二轮分析(主要分析要不要放到BaseEditor中， 比如：BaseEditor中写抽象接口、方法、子类实现接口、方法。或者不应该放到BaseEditor中，由子类去写)**：
1. 对于顶点： 无论点、线、面都有顶点，对于顶点的编辑行为，应该抽到BaseEditor中。
2. 对于中点、边拖拽：矩形一般是没必要的，圆也没必要。非通用部分抽离到基类（xxxShapeEditor）中。
3. 顶点删除：编辑状态下：对于点来说，至少保留1个点，对于线来说，至少保留2个点，对于面来说，至少保留3个点。（放BaseEditor抽象类中吧）
4. 吸附：编辑和绘制时都需要，放到BaseEditor抽象类中。
5. 撤销重做：编辑时需要，绘制时要支持撤销已经绘制的点，允许重绘（对于一个编辑器来说，应该是必须的，放到BaseEditor抽象类中）。
6. 校验：有的（放到BaseEditor抽象类中，不过每种类型的几何图层的校验规则、数量并不一致，baseEditor中只提供一个校验接口，子类实现校验逻辑）
7. 状态管理：用户从绘制状态变成完成状态、从编辑状态到完成状态。是必要的（放到BaseEditor抽象类中）。
8. 样式配置：baseEditor中提供接口，子类实现。
9. 图层显隐控制：BaseEditor抽象，子类实现（一般都是设置透明度做图层显隐吧？ 是的话，可以写在BaseEditor中实现）

*/
import * as L from 'leaflet';
import { BaseEditor } from "../base/BaseEditor";
import { EditorState, type LeafletEditorOptions, type MidpointPair } from "../types";
import { deduplicateCoordinates, getFractionalPointOnEdge, reversePolyLineLatLngs } from '../utils/commonUtils';
import { polylineHasSelfIntersection } from '../utils/validShapeUtils';
import { point } from '@turf/turf';
import { isPointOnLine } from '../utils/topoUtils';


export default class PolylineEditor extends BaseEditor<L.Polyline> {



    protected historyStack: number[][][][] = [];
    private tempCoords: number[][] = [];  // 绘制的时候存储用户点击的坐标点
    private lastMoveCoord: number[] = []; // 存储鼠标移动的最后一个点的坐标信息
    protected vertexMarkers: L.Marker[][] = []; // 存储顶点标记的数组
    protected redoStack: any[] = [];
    protected midpointMarkers: MidpointPair[][] = []; // 存储【线中点、拖动线marker】两种标记的数组

    constructor(map: L.Map, options: LeafletEditorOptions = {}) {
        super(map, options);
        if (this.map) {
            this.activate();
            const existGeometry = !!options?.defaultGeometry;
            // 初始化时，设置绘制状态为true(双击结束绘制时关闭绘制状态，其生命周期到头，且不再改变)，且发出状态通知
            this.updateAndNotifyStateChange(existGeometry ? EditorState.Idle : EditorState.Drawing);
            // 鼠标手势设置为十字
            this.map.getContainer().style.cursor = existGeometry ? 'grab' : 'crosshair';
            // 构建编辑器的图层内容
            this.initLayer(options?.defaultGeometry);
            // 绑定地图事件
            this.bindMapEvents(this.map);
        }
    }

    // [绘制]: 创建图层 + 绑定/关闭监听事件 + 设置图层显隐 + (缺少的[layerDestroy\getLayer\getGeoJSON\getLayerVisibility\]在基类中已实现)

    protected initLayer(geometry?: GeoJSON.Geometry): void {
        const layerStyle = this.getLayerStyle();
        let coords: number[][][] = [[[181, 181], [182, 182]]]; // 多加入一层是为了统一按照多面的结构进行
        if (geometry) {
            coords = reversePolyLineLatLngs(geometry);
        }
        this.layer = L.polyline(coords as any, layerStyle);
        this.layer.addTo(this.map);
        // 4: 绑定图层自身事件(无)
        // 5: 设置吸附源（排除当前图层） 
        if (this.IsEnableSnap()) {
            this.setSnapSources([this.layer]);
        }
    }

    protected bindMapEvents(map: L.Map): void {
        map.on('click', this.mapClickEvent);
        map.on('dblclick', this.mapDblClickEvent);
        map.on('mousemove', this.mapMouseMoveEvent);
    }

    protected offMapEvents(map: L.Map): void {
        map.off('click', this.mapClickEvent);
        map.off('dblclick', this.mapDblClickEvent);
        map.off('mousemove', this.mapMouseMoveEvent);
    }

    protected setLayerVisibility(visible: boolean): void {
        this.layerVisble = visible;
        if (visible) {
            this.show();
        } else {
            this.hide();
        }
    }

    protected renderLayer(coords: number[][][], valid: boolean = true): void {
        if (this.layer) {
            const layerStyle = this.getLayerStyle(valid);
            this.layer.setStyle(layerStyle);
            this.layer.setLatLngs(coords as any);
        } else {
            throw new Error('图层不存在，无法渲染');
        }
    }

    // [编辑]: 编辑的配置项 + 更新编辑功能 + 进入\退出编辑\编辑时的撤销\重做\重置\完成编辑等功能

    // [吸附]: 全部内容已经写在基类中
    // [状态]: 全部内容已经写在基类中


    // #region 辅助函数

    /** 获取图层的样式信息
     *
     *
     * @private
     * @param {boolean} [valid=true] 获取无效的样式还是有效的样式
     * @memberof PolygonEditor
     */
    private getLayerStyle(valid: boolean = true) {
        // 1: 提供一些默认值, 防止用户构建的图层样式异常
        const defaultLayerStyle = {
            weight: 2,
            color: '#008BFF', // 设置边线颜色
            ...this.options.defaultStyle,
        };
        const allOptions = {
            pane: 'overlayPane',
            layerVisible: true, // 增加了一个自定义属性，用于用户从图层层面获取图层的显隐状态
            defaultStyle: defaultLayerStyle,
            ...defaultLayerStyle,
        }
        const errorLayerStyle = {
            weight: 2,
            color: 'red', // 设置边线颜色
            ...this.options?.validation?.validErrorPolygonStyle
        }
        return valid ? allOptions : errorLayerStyle;
    }
    /**  地图点击事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletPolyLine
     */
    private mapClickEvent = (e: L.LeafletMouseEvent) => {
        if (!this.isActive()) return;
        if (this.currentState === EditorState.Drawing) {
            // 尝试添加新点
            let waitingAddCoord = [e.latlng.lat, e.latlng.lng];
            if (this.IsEnableSnap()) {
                const { snappedLatLng } = this.applySnapWithTarget(e.latlng);
                waitingAddCoord = [snappedLatLng.lat, snappedLatLng.lng];
            }
            const testCoords = [...this.tempCoords, waitingAddCoord];
            // 绘制状态下的校验，允许1个点的情况
            const isValid = this.isValidForDrawing(testCoords);
            // 通过校验，则添加点
            isValid && this.tempCoords.push(waitingAddCoord);
            // 同时记录最后一个点，用于后续撤回操作行为
            this.lastMoveCoord = waitingAddCoord;
            return;
        }
    }

    /**  地图双击事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletPolyLine
     */
    private mapDblClickEvent = (e: L.LeafletMouseEvent) => {
        // 关键：只有激活的实例才处理事件
        if (!this.canConsume(e)) return;
        if (!this.layer) throw new Error('图层实例化失败，无法完成图层创建，请重试');
        // 情况1： 正在绘制状态时，绘制的逻辑
        if (this.currentState === EditorState.Drawing) {
            const lastCoord = [e.latlng.lat, e.latlng.lng];
            // 渲染图层, 先剔除重复坐标，双击事件实际触发了2次单机事件，所以，需要剔除重复坐标
            const finalCoords = deduplicateCoordinates([...this.tempCoords, lastCoord]);
            if (this.isValidPolyline([finalCoords])) {
                this.finishedDraw([finalCoords]);
            } else {
                // 校验失败，保持绘制状态
                throw new Error('绘制的折线无效，请继续绘制或调整');
                // 不执行 reset()，让用户继续调整
            }
        } else {
            // 情况 2：已绘制完成后的后续双击事件的逻辑均走这个
            const clickedLatLng = e.latlng;
            const polylineGeoJSON = this.layer.toGeoJSON(this.options.coordPrecision);
            // 判断用户是否点击到了面上，是的话，就开始编辑模式
            const turfPoint = point([clickedLatLng.lng, clickedLatLng.lat]);
            const isInside = isPointOnLine(turfPoint, polylineGeoJSON);
            if (isInside && this.currentState !== EditorState.Editing) {
                this.startEdit();
            } else {
                this.commitEdit();
            }
        }
    }

    /** 完成绘制（结束绘制）
     *
     *
     * @private
     * @param {number[][][]} finalCoords 多线结构，如果你是单条线，就再包裹一层
     * @memberof LeafletPolyLine
     */
    private finishedDraw(finalCoords: number[][][]): void {
        this.renderLayer(finalCoords);
        this.reset();
        this.tempCoords = []; // 清空吧，虽然不清空也没事，毕竟后面就不使用了
        // 移除（吸附后）可能存在的高亮
        this.clearSnapHighlights();
        // 设置为空闲状态，并发出状态通知
        this.updateAndNotifyStateChange(EditorState.Idle);
    }

    /**  地图鼠标移动事件，用于设置点的位置
     *
     *
     * @private
     * @param {L.LeafletMouseEvent} e
     * @memberof LeafletPolyLine
     */
    private mapMouseMoveEvent = (e: L.LeafletMouseEvent) => {
        // 关键：只有激活的实例才处理事件
        if (!this.isActive()) return;
        if (this.currentState === EditorState.Drawing) {
            let lastMoveEndPoint: number[] = [e.latlng.lat, e.latlng.lng];
            let tempMovedCoords = this.tempCoords;
            if (this.IsEnableSnap()) {
                const { snappedLatLng } = this.applySnapWithTarget(e.latlng);
                lastMoveEndPoint = [snappedLatLng.lat, snappedLatLng.lng];
            }
            // 1：一个点也没有时，我们移动事件，也什么也不做。
            if (!this.tempCoords.length) return;
            // 实时更新鼠标当前位置，用于撤销时恢复预览线
            this.lastMoveCoord = lastMoveEndPoint;
            // 2：构建临时坐标点数组。
            tempMovedCoords = [...tempMovedCoords, lastMoveEndPoint];
            // 绘制状态下的特殊校验
            const isValid = this.isValidForDrawing(tempMovedCoords);
            // 实时渲染
            this.renderLayer([tempMovedCoords], isValid);
            return;
        }
        if (this.currentState === EditorState.Editing) {
            return;
        }
    }



    /** 显示图层
     *
     *
     * @private
     * @memberof PolylineEditor
     */
    private show() {
        if (this.layer) {
            this.layer.setStyle({
                opacity: 1,
                weight: 2,
                color: '#3388ff'
            })
        }
    }

    /** 隐藏图层
     *
     *
     * @private
     * @memberof PolylineEditor
     */
    private hide() {
        if (this.layer) {
            this.layer.setStyle({
                opacity: 0,
                weight: 0,
                color: '#3388ff'
            })
        }
        // ✅ 退出编辑状态（若存在）
        if (this.currentState === EditorState.Editing) {
            this.exitEditMode();
            this.updateAndNotifyStateChange(EditorState.Idle);
        }
    }

    protected exitEditMode(): void {
        // 移除所有顶点 marker
        this.vertexMarkers.flat(1).forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.vertexMarkers = [];

        // 移除所有中点 marker
        this.removeAllMidPointMarkers();
    }

    /**  绘制时,用于撤销最后一个绘制点(一般绑定到快捷键ctrl + Z上)
     *
     *
     * @return {*}  {boolean}
     * @memberof PolylineEditor
     */
    public undoDraw(): boolean {
        if (this.currentState !== EditorState.Drawing)
            return false;

        if (this.tempCoords.length > 0) {
            // 移除最后一个点
            this.tempCoords.pop();

            // 修复：检查是否还有剩余点
            if (this.tempCoords.length > 0) {
                // 使用鼠标当前位置作为预览线的终点
                const finalCoords = [...this.tempCoords, this.lastMoveCoord];
                // 绘制状态下的校验，允许1个点的情况
                const isValid = this.isValidForDrawing(finalCoords);
                this.renderLayer([finalCoords], isValid);
            } else {
                // 没有点了，清空渲染
                this.renderLayer([[]], false); // 空线无效
                this.lastMoveCoord = []; // 清空移动点
            }
            return true;
        }

        return false;
    }

    protected getCurrentMarkerCoords() {
        // 读取当前 marker 坐标，构建完整结构
        const current = this.vertexMarkers.map(singleLineMarker => singleLineMarker.map(pointMarker => [pointMarker.getLatLng().lat, pointMarker.getLatLng().lng]))
        return current;
    }

    /** 进入编辑模式
     *
     * @private
     * @memberof PolylineEditor
     */
    public startEdit(): void {
        if (!this.canEnterEditMode()) return;
        // 1：禁用双击地图放大功能（先考虑让用户自己去写，里面不再控制）
        // this.map.doubleClickZoom.disable();
        // 2：状态变更，并发出状态通知
        this.updateAndNotifyStateChange(EditorState.Editing);
        // 3: 设置当前激活态是本实例，因为事件监听和激活态实例是关联的，只有激活的实例才处理事件
        this.activate()
        // 4: 进入编辑模式
        this.enterEditMode();
    }

    protected enterEditMode(): void {
        if (!this.layer) return;

        const multiline_latlngs = this.layer.getLatLngs() as L.LatLng[][];
        let coords: number[][][] = multiline_latlngs.map(line_latlngs => line_latlngs.map((line_coords) => [line_coords.lat, line_coords.lng]));

        // 记录初始快照
        this.historyStack.push(coords);
        // 清空重做栈
        this.redoStack = [];

        // ✅ 设置吸附源（排除当前图层） 
        if (this.IsEnableSnap()) {
            this.setSnapSources([this.layer]);
        }

        // 渲染每个顶点为可拖动 marker
        this.reBuildMarker(coords)
        // 渲染边的中线点
        this.insertMidpointMarkers();
    }

    protected reBuildMarker(multi_coords: number[][][]): void {
        // 清除旧的 marker   ---   [[[181, 181], [182, 182]]]
        this.vertexMarkers.forEach(singleLineMarkers => {
            singleLineMarkers.forEach(marker => this.map.removeLayer(marker));
        });
        this.vertexMarkers = [];

        multi_coords.forEach((coords, lineIndex) => {
            const singleLineMarkers: L.Marker[] = []; // 这个用来存放单条线的marker标记。
            coords.forEach((coord, pointIndex) => {

                const latlng = L.latLng(coord[0], coord[1]);

                const marker = L.marker(latlng, this.editOptions.vertexsMarkerStyle).addTo(this.map);

                // 拖动时更新图形
                marker.on('drag', () => {
                    // 先进行吸附处理（确定吸附点）
                    let latlng = marker.getLatLng();
                    if (this.IsEnableSnap()) {
                        const { snappedLatLng } = this.applySnapWithTarget(marker.getLatLng());
                        latlng = snappedLatLng;
                    }
                    marker.setLatLng(latlng);

                    this.renderLayerFromMarkers();
                    this.updateMidpoints();
                });

                // 拖动结束后记录历史
                marker.on('dragend', () => {
                    // 1. 移除可能存在的高亮
                    this.clearSnapHighlights();
                    // 2. 更新历史记录
                    this.pushHistoryFromMarkers();
                });

                // 右键删除点（前提是线段的点数大于2个，因为至少要2个。）
                marker.on('contextmenu', () => {
                    // 获取当前marker所属的线段，检查这个线段的坐标点的数量
                    const waitingEditLineMarkerArr = this.vertexMarkers[lineIndex];
                    if (waitingEditLineMarkerArr.length > 2) {
                        this.map.removeLayer(marker);
                        // 这里应该查找当前 marker 的索引，而不是使用捕获时的 pointIndex
                        const currentIndex = waitingEditLineMarkerArr.findIndex(m => m === marker);
                        if (currentIndex !== -1) {
                            waitingEditLineMarkerArr.splice(currentIndex, 1);
                            this.renderLayerFromMarkers();
                            this.pushHistoryFromMarkers();
                            this.updateMidpoints();
                        }
                    } else {
                        alert('线段至少需要2个顶点');
                    }
                });

                singleLineMarkers.push(marker);
            })
            this.vertexMarkers.push(singleLineMarkers);  // 用于存放多线的marker标记
        });

    }

    /** 插入中间点坐标
     *
     *
     * @private
     * @return {*}  {void}
     * @memberof LeafletEditPolygon
     */
    protected insertMidpointMarkers(skipMarker?: L.Marker): void {
        const isEnabledMidPointsMarker = this.editOptions.dragMidMarkerOptions!.enabled;
        const isEnabledEdgeMarker = this.editOptions.dragLineMarkerOptions!.enabled;
        const disableRenderMarker = (!isEnabledMidPointsMarker && !isEnabledEdgeMarker);
        if (disableRenderMarker || this.currentState !== EditorState.Editing) return;

        // 清除旧的中点标记（若数组中存在）
        this.removeAllMidPointMarkers(skipMarker);

        this.vertexMarkers.forEach((singleLineMarker, singleLineIndex) => {
            const lineMidpoints: MidpointPair[] = [];

            for (let i = 0; i < singleLineMarker.length; i++) {
                const nextIndex = i + 1;
                if (nextIndex >= singleLineMarker.length) {
                    break;
                }
                const p1 = singleLineMarker[i];
                const p2 = singleLineMarker[nextIndex];
                // ✅ 跳过当前边包含 skipMarker 的情况
                if (skipMarker && (skipMarker === p1 || skipMarker === p2 || (skipMarker as any).pairRef === p1 || (skipMarker as any).pairRef === p2)) { continue; }

                const insertMidpoint = isEnabledMidPointsMarker ? this.createInsertMidpointMarker(p1, p2, singleLineIndex, nextIndex, this.editOptions.dragMidMarkerOptions!.positionRatio!) : null
                // 插入边控制点（用于拖动边） 
                const edgeDragMarker = isEnabledEdgeMarker ? this.createEdgeDragMarker(p1, p2, singleLineIndex, this.editOptions.dragLineMarkerOptions!.positionRatio!) : null;

                lineMidpoints.push({ insert: insertMidpoint, edge: edgeDragMarker });
                // 附加：互相引用 （虽然写的晚，但是一般都会在【createInsertMidpointMarker、createEdgeDragMarker】中绑定的dragstart事件之前完成）
                if (insertMidpoint) {
                    (insertMidpoint as any).pairRef = edgeDragMarker;
                }
                if (edgeDragMarker) {
                    (edgeDragMarker as any).pairRef = insertMidpoint;
                }
            }
            this.midpointMarkers.push(lineMidpoints);
        });

    }

    /** 移除所有中点标记（若存在正在拖动的，则跳过）
     *
     *
     * @memberof BasePolygonEditor
     */
    protected removeAllMidPointMarkers(skipMarker?: L.Marker) {
        const newMidpoints: MidpointPair[] = [];
        this.midpointMarkers.flat(1).forEach(pair => {

            const keepInsert = pair.insert && pair.insert === skipMarker;
            const keepEdge = pair.edge && pair.edge === skipMarker;

            if (!keepInsert) {
                if (pair.insert && this.map.hasLayer(pair.insert)) {
                    this.map.removeLayer(pair.insert);
                }
            }

            if (!keepEdge) {
                if (pair.edge && this.map.hasLayer(pair.edge)) {
                    this.map.removeLayer(pair.edge);
                }
            }

            // 如果有任一 marker 被保留，就保留这个 pair
            if (keepInsert || keepEdge) {
                newMidpoints.push(pair);
            }
        });

        // 重新组织为二维数组结构（可选）
        this.midpointMarkers = newMidpoints.length > 0 ? [[...newMidpoints]] : [];
    }

    /** 创建一个中点标记
     *
     *
     * @private
     * @param {L.Marker} p1 起点 marker
     * @param {L.Marker} p2 终点 marker
     * @param {number} lineIndex 单条线的索引
     * @param {number} insertIndex 插入点的位置
     * @param {number} positionRadio 位置比率
     * @return {*}  {L.Marker}
     * @memberof LeafletPolygonEditor
     */
    private createInsertMidpointMarker(
        p1: L.Marker,
        p2: L.Marker,
        lineIndex: number,
        insertIndex: number,
        positionRadio: number
    ): L.Marker {
        const midPoint = getFractionalPointOnEdge(p1.getLatLng(), p2.getLatLng(), positionRadio);

        const marker = L.marker(midPoint, this.editOptions.dragMidMarkerOptions!.dragMarkerStyle).addTo(this.map);

        // 开始拖动时，移除[线拖动的marker],即：edgeDragMarker
        marker.on('dragstart', () => {
            const pair = (marker as any).pairRef as L.Marker;
            if (pair) {
                this.map.removeLayer(pair);
            }
        });

        // 中点被拖动时，图形同步更新
        marker.on('drag', () => {
            // 0：先进行吸附处理（确定吸附点）
            let latlng = marker.getLatLng();
            if (this.IsEnableSnap()) {
                const { snappedLatLng } = this.applySnapWithTarget(marker.getLatLng());
                latlng = snappedLatLng;
            }

            // 1. 拷贝当前顶点坐标
            const coords = this.getCurrentMarkerCoords();

            // 2. 插入中点坐标到对应位置（不修改原 marker 数组）
            const line = coords[lineIndex]; // 找到这条线
            const newLine = [...line];
            newLine.splice(insertIndex, 0, [latlng.lat, latlng.lng]);

            // 3. 构造新的坐标结构
            const newCoords = [...coords];
            newCoords[lineIndex] = newLine;

            // 4. 实时渲染
            const isValid = this.isValidPolyline(newCoords);
            this.renderLayer(newCoords, isValid);
        });
        // 中点拖动结束后，移除此处中点，执行添加新的顶点
        marker.on('dragend', () => {
            // 0：先进行吸附处理（只是用于确定吸附点，不再进行高亮）
            let latlng = marker.getLatLng();
            if (this.IsEnableSnap()) {
                const { snappedLatLng } = this.applySnapWithTarget(marker.getLatLng());
                latlng = snappedLatLng;
            }
            // 移除可能存在的高亮
            this.clearSnapHighlights();

            // 1. 从地图中移除中点 marker
            this.map.removeLayer(marker);

            // 2. 创建新的顶点 marker（这个不再是中点marker，而是顶点marker了）
            const newMarker = L.marker(latlng, this.editOptions.vertexsMarkerStyle).addTo(this.map);

            // 3. 插入到顶点数组
            this.vertexMarkers[lineIndex].splice(insertIndex, 0, newMarker);

            // 4. 绑定事件
            newMarker.on('drag', () => {
                // 先进行吸附处理（确定吸附点）
                let latlng = newMarker.getLatLng();
                if (this.IsEnableSnap()) {
                    const { snappedLatLng } = this.applySnapWithTarget(marker.getLatLng());
                    latlng = snappedLatLng;
                }
                marker.setLatLng(latlng);

                this.renderLayerFromMarkers();
                this.updateMidpoints();
            });

            newMarker.on('dragend', () => {
                // 1. 移除可能存在的高亮
                this.clearSnapHighlights();
                // 2. 更新历史记录
                this.pushHistoryFromMarkers();
            });

            newMarker.on('contextmenu', () => {
                const currentLine = this.vertexMarkers[lineIndex];
                if (currentLine.length > 2) {
                    // 关键：查找当前 marker 的实际索引
                    const currentIndex = currentLine.findIndex(m => m === newMarker);
                    if (currentIndex !== -1) {
                        this.map.removeLayer(newMarker);
                        currentLine.splice(currentIndex, 1);
                        this.renderLayerFromMarkers();
                        this.pushHistoryFromMarkers();
                        this.updateMidpoints();
                    }
                } else {
                    alert('线段至少需要2个顶点');
                }
            });

            // 5. 刷新图层和中点
            this.renderLayerFromMarkers();
            this.pushHistoryFromMarkers();
            this.updateMidpoints();
        });
        return marker;
    }

    /** 实时更新中线点的位置（传参意思：用户正在拖动的避免销毁和重新构建）
     *
     *
     * @private
     * @memberof PolylineEditor
     */
    protected updateMidpoints(skipMarker?: L.Marker): void {
        const isEnabledMidPointsMarker = this.editOptions.dragMidMarkerOptions!.enabled;
        const isEnabledEdgeMarker = this.editOptions.dragLineMarkerOptions!.enabled;
        const disableRenderMarker = (!isEnabledMidPointsMarker && !isEnabledEdgeMarker);
        // 新增：检查是否启用中点功能
        if (disableRenderMarker) {
            // 如果已存在中点，需要清理
            if (this.midpointMarkers.length > 0) {
                this.removeAllMidPointMarkers();
                this.midpointMarkers = [];
            }
            return;
        }

        // 清除旧的中点
        this.removeAllMidPointMarkers(skipMarker);

        // 重新插入
        this.insertMidpointMarkers(skipMarker);
    }

    /** 创建一个可拖动的边控制点，用于拖动整条边
     * 
     * @private
     * @param p1 起点 marker
     * @param p2 终点 marker
     * @param lineIndex 线索引
     * @param {number} positionRadio 位置比率
     * @returns L.Marker
     */
    private createEdgeDragMarker(
        p1: L.Marker,
        p2: L.Marker,
        lineIndex: number,
        positionRadio: number
    ): L.Marker {
        const midDragPoint = getFractionalPointOnEdge(p1.getLatLng(), p2.getLatLng(), positionRadio);
        const marker = L.marker(midDragPoint, this.editOptions.dragLineMarkerOptions!.dragMarkerStyle).addTo(this.map);
        let lastLatLng: L.LatLng | null = null;

        marker.on('dragstart', () => {
            lastLatLng = marker.getLatLng();

            // 移除配对中点
            const pair = (marker as any).pairRef as L.Marker;
            if (pair && this.map.hasLayer(pair)) {
                this.map.removeLayer(pair);
            }
        });

        marker.on('drag', () => {
            if (!lastLatLng) return;

            const { snappedLatLng: current } = this.applySnapWithTarget(marker.getLatLng());
            const deltaLat = current.lat - lastLatLng.lat;
            const deltaLng = current.lng - lastLatLng.lng;

            const latlng1 = p1.getLatLng();
            const latlng2 = p2.getLatLng();

            p1.setLatLng([latlng1.lat + deltaLat, latlng1.lng + deltaLng]);
            p2.setLatLng([latlng2.lat + deltaLat, latlng2.lng + deltaLng]);

            this.renderLayerFromMarkers();
            this.updateMidpoints(marker); // ✅ 传入当前 marker，避免被销毁
            lastLatLng = current;
        });

        marker.on('dragend', () => {
            // 1. 移除可能存在的高亮
            this.clearSnapHighlights();
            // 2. 重新渲染更新中点 marker
            this.updateMidpoints();
            this.pushHistoryFromMarkers();
        });


        return marker;
    }


    private renderLayerFromMarkers() {
        const coords = this.getCurrentMarkerCoords()
        const isValid = this.isValidPolyline(coords);
        this.renderLayer(coords, isValid);
    }

    private pushHistoryFromMarkers() {
        const coords = this.getCurrentMarkerCoords()
        this.historyStack.push(coords);
    }

    /** 根据坐标重建 marker 和图形 + 重新渲染图层(在基类中使用的)
     * 
     * @param latlngs 坐标数组
     */
    protected reBuildMarkerAndRender(latlngs: number[][][]): void {
        const isValid = this.isValidPolyline(latlngs);
        this.renderLayer(latlngs, isValid);
        this.reBuildMarker(latlngs);
        this.updateMidpoints();
    }

    /** 校验线图层的有效性
     *
     *
     * @private
     * @param {number[][][]} multiLine_coords 多线坐标
     * @return {*}  {boolean}
     * @memberof PolylineEditor
     */
    private isValidPolyline(multiLine_coords: number[][][]): boolean {
        // 检查每条线的有效性
        for (const singleLine of multiLine_coords) {
            if (singleLine.length < 2) {
                return false; // 线至少需要2个点
            }

            // 1. 检查自相交（根据配置）
            if (this.validationOptions.allowSelfIntersect === false) {
                if (polylineHasSelfIntersection(singleLine)) {
                    return false;
                }
            }
        }

        // 2. 其他校验规则可以在这里添加...

        return true;
    }

    /** 绘制状态下的校验，允许只有1个点的情况
     *
     *
     * @private
     * @param {number[][]} coords 单条线的坐标
     * @return {*}  {boolean}
     * @memberof PolylineEditor
     */
    private isValidForDrawing(coords: number[][]): boolean {
        // 绘制状态下，允许1个点的情况
        if (coords.length < 2) {
            return true; // 绘制时允许1个点
        }

        // 对于2个点及以上的情况，使用完整的校验
        return this.isValidPolyline([coords]);
    }

    // #endregion
}