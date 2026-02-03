/**
 * 1：吸附源是谁? 
 * 假设图上有abc三个几何图形，然后你此刻在编辑C几何图层，那么吸附源就是除去C几何图层外的其他两个图层A和B。比如A和B均是多边形，我要先收集A和B的全部顶点。以拖动C几何中的一个顶点p1为例，我就要把P1和AB图层的所有顶点进行比较，来判断吸附到谁身上。综上: 吸附源是【A和B的全部顶点】。
 * 2: 后续我想在页面放置按钮：1：开启吸附、关闭吸附 2：吸附方式: 顶点吸附、线吸附。针对2我不确定应该是自动判断还是让用户选择(根据用户拖动的内容来自动选择吸附模式，留个口子，可能只要线吸附或者顶点吸附)
 * 3:对于数据格式，我们可以提前整理出一个处理好的拆分数据结构，比如：
 * const draggedGeometry = {
 *   type: 'polygon', // 或 'polyline'
 *   vertices: [p1, p2, p3, p4], // 所有顶点
 *   edges: [         // 所有边（线段）
 *     {start: p1, end: p2},
 *     {start: p2, end: p3},
 *     // ...
 *   ],
 *   bounds: {minX, minY, maxX, maxY}, // 包围盒(这个是否需要),
 *   geometry: {...}
 * };
 * 4:地图编辑中可能有大量几何元素，需要优化, 只在拖动点周围查询
 * 5: 对于顶点吸附：以拖动C几何中的一个顶点p1为例，我就要把从周围获取的顶点都进行比较，来判断吸附到谁身上
 * 6：对于线吸附：采用平行边投影吸附 
 *     6.1：我拖动的是一条边 E = [P₁, P₂]。
 *     6.2：吸附源是其他周围的边集合 E' = {[A₁, A₂], [B₁, B₂], ...}。
 *     6.3. 判断E与E'中每条边是否近似平行（允许小误差）,（注意这里，如果E和E'是交叉的，只要角度小于某个阈值，则仍旧认为平行），平行则继续
 *     6.4 计算P1到E'中平行线的距离d1，P2到E'线的距离d2
 *     6.5. 计算平均距离 d_avg = (d1 + d2) / 2
 *     6.6. 如果 d_avg < 阈值 → 吸附
 *     6.7. 吸附时：将E整条边平行移动到E'对应的平行边上
 * 
 */
import * as L from 'leaflet'
import type { GeometryIndex, SnapMode } from "../types";

export class SnapController {

    private map: L.Map;
    private tolerance: number = 8; // px
    private modes: SnapMode[] = ['vertex'];

    private vertexSources: L.LatLng[] = []; // 顶点吸附源
    private edgeSources: { start: L.LatLng; end: L.LatLng }[] = []; // 边缘吸附源

    constructor(map: L.Map) {
        this.map = map;
    }

    /** 获取阈值
     *
     * @memberof SnapController
     */
    public getTolerance() {
       return this.tolerance;
    }

    /** 获取吸附模式
     *
     *
     * @memberof SnapController
     */
    public getModes() {
       return this.modes;
    }
    
    /** 设置阈值
     *
     *
     * @param {number} tolerance
     * @memberof SnapController
     */
    public setTolerance(tolerance: number) {
        this.tolerance = tolerance;
    }

    /** 设置吸附模式
     *
     *
     * @param {SnapMode[]} modes
     * @memberof SnapController
     */
    public setModes(modes: SnapMode[]) {
        this.modes = modes;
    }


    /** 设置吸附源
     *
     *
     * @param {L.LatLng[]} points
     * @memberof SnapController
     */
    public setGeometrySources(indices: GeometryIndex[]) {
        this.vertexSources = indices.flatMap(i => i.vertices);
        this.edgeSources = indices.flatMap(i => i.edges);
        console.log('吸附源：', this.vertexSources, this.edgeSources);
    }


    /** 顶点吸附
     *
     *
     * @param {L.LatLng} input
     * @return {*}  {(L.LatLng | null)}
     * @memberof SnapController
     */
    public snapVertex(input: L.LatLng): L.LatLng | null {
        if (!this.modes.includes('vertex')) return null;
        const inputPx = this.map.latLngToLayerPoint(input);
        let closest: { point: L.LatLng; dist: number } | null = null;
        for (const p of this.vertexSources) {
            const pPx = this.map.latLngToLayerPoint(p);
            const dist = inputPx.distanceTo(pPx);
            if (dist < this.tolerance && (!closest || dist < closest.dist)) {
                closest = { point: p, dist };
            }
        }
        return closest?.point ?? null;
    }


    /** 返回输入点即将吸附的目标边线
     *
     *
     * @param {L.LatLng} input
     * @return {*}  {({ start: L.LatLng; end: L.LatLng } | null)}
     * @memberof SnapController
     */
    public getClosestEdge(input: L.LatLng): { start: L.LatLng; end: L.LatLng } | null {
        let closest: { start: L.LatLng; end: L.LatLng } | null = null;
        let minDistance = Infinity;
        const inputPx = this.map.latLngToLayerPoint(input);
        for (const edge of this.edgeSources) {
            const projected = this.projectPointToSegment(input, edge.start, edge.end);
            const projectedPx = this.map.latLngToContainerPoint(projected);
            // 像素距离计算
            const distance = inputPx.distanceTo(projectedPx);
            if (distance < minDistance && distance <= this.tolerance) {
                minDistance = distance;
                closest = edge;
            }
        }

        return closest;
    }



    /** 边线吸附
     *
     *
     * @protected
     * @param {L.LatLng} latlng
     * @return {*}  {(L.LatLng | null)}
     * @memberof BaseEditor
     */
    public snapEdge(latlng: L.LatLng): L.LatLng | null {
        if (!this.edgeSources.length) return null;
        const latlngPx = this.map.latLngToContainerPoint(latlng);
        let closestPoint: L.LatLng | null = null;
        let minDistance = Infinity;

        for (const { start, end } of this.edgeSources) {
            const projected = this.projectPointToSegment(latlng, start, end);

            // 使用像素坐标计算距离
            const projectedPx = this.map.latLngToContainerPoint(projected);
            const distancePx = latlngPx.distanceTo(projectedPx);
            if (distancePx < minDistance && distancePx <= this.tolerance) {
                minDistance = distancePx;
                closestPoint = projected;
            }
        }

        return closestPoint;
    }


    /** 将一个点 p 投影到一条线段 ab 上，返回投影点的位置。
     *
     *
     * @private
     * @param {L.LatLng} p
     * @param {L.LatLng} a
     * @param {L.LatLng} b
     * @return {*}  {L.LatLng}
     * @memberof SnapController
     */
    private projectPointToSegment(p: L.LatLng, a: L.LatLng, b: L.LatLng): L.LatLng {
        const ax = a.lng, ay = a.lat;
        const bx = b.lng, by = b.lat;
        const px = p.lng, py = p.lat;

        const dx = bx - ax;
        const dy = by - ay;

        if (dx === 0 && dy === 0) return a;

        const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
        const clampedT = Math.max(0, Math.min(1, t));

        return L.latLng(ay + clampedT * dy, ax + clampedT * dx);
    }



}