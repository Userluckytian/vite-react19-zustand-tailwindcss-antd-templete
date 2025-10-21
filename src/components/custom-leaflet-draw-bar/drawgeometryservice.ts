import * as L from 'leaflet';
// 扩展 LayerGroup 类型声明
declare module 'leaflet' {
    interface LayerGroup {
        addLayerWithId(layer: L.Layer, id: string): this;
        getLayerById(id: string): L.Layer | null;
        removeLayerById(id: string): this;
        hasLayerId(id: string): boolean;
    }
}
// 实现 LayerGroup 扩展方法
L.LayerGroup.include({
    addLayerWithId: function (layer: L.Layer, id: string) {
        if (this.hasLayerId(id)) {
            console.warn(`Layer with ID "${id}" already exists in this group`);
            return this;
        }
        (layer as any).customLayerId = id;
        return this.addLayer(layer);
    },
    getLayerById: function (id: string): L.Layer | null {
        let foundLayer: L.Layer | null = null;
        this.eachLayer(function (layer: any) {
            if (layer.customLayerId === id) {
                foundLayer = layer;
            }
        });
        return foundLayer;
    },
    removeLayerById: function (id: string) {
        const layer = this.getLayerById(id);
        if (layer) {
            delete (layer as any).customLayerId;
            this.removeLayer(layer);
        }
        return this;
    },
    hasLayerId: function (id: string): boolean {
        return this.getLayerById(id) !== null;
    }
});
// ------------------------------------------------------------------------------------------
// 构建绘制类
export class DrawGeometryService {
    // 常量
    private OVERLAY_PANE_INDEX = 400;
    private SHADOW_PANE_INDEX = 500;
    private map: L.Map;
    // 外边线图层
    private lineLayerId: string = 'out-line-layer';
    // 框选、圈选、圆选
    private bboxShapeId: string = 'draw-bbox-layer';
    private CircleLayerId: string = 'draw-circle-layer';
    private polygenLayerId: string = 'draw-poly-layer';
    private drawLayerGroup: L.LayerGroup | null = null;
    // 构造函数
    constructor(map: any) {
        this.map = map;
        if (this.map) {
            this.mapInit();
        }
    }
    private mapInit() {
        // (1) pane 用来定义每个图层的Zindex位置，这个只和每个layer有关系，但是和layerGroup没关系。所以下面又定义了一个layerGroup来收集和管理这些layer。
        let pane = this.map.getPane('drawToolPane');
        if (!pane) {
            pane = this.map.createPane('drawToolPane');
            pane.style.zIndex = (this.OVERLAY_PANE_INDEX + 1) + ''; // 要大于overlayPane的层级
        }
        // （2）构建一个组，
        if (!this.drawLayerGroup) {
            this.drawLayerGroup = L.layerGroup();
            this.drawLayerGroup.addTo(this.map);
        }
        // （3）  初始化各个图层
        this.initLayers();
    }
    private initLayers() {
        // 矩形
        if (this.drawLayerGroup && !this.drawLayerGroup.getLayerById(this.bboxShapeId)) {
            const bboxLayer = L.rectangle([[0, 0], [0, 0]], { pane: 'drawToolPane', fillOpacity: 0.3 });
            this.drawLayerGroup.addLayerWithId(bboxLayer, this.bboxShapeId);
        }
        // 圆形
        if (this.drawLayerGroup && !this.drawLayerGroup.getLayerById(this.CircleLayerId)) {
            const bboxLayer = L.circle([0, 0], { pane: 'drawToolPane', radius: 0, fillOpacity: 0.3 });
            this.drawLayerGroup.addLayerWithId(bboxLayer, this.CircleLayerId);
        }
        // 自定义多边形
        if (this.drawLayerGroup && !this.drawLayerGroup.getLayerById(this.polygenLayerId)) {
            const bboxLayer = L.polygon([[0, 0], [0, 0], [0, 0], [0, 0]], { pane: 'drawToolPane', fillOpacity: 0.3 });
            this.drawLayerGroup.addLayerWithId(bboxLayer, this.polygenLayerId);
        }
    }
    // 公共方法：清除所有绘制内容
    public clearAll(): void {
        this.drawLayerGroup!.eachLayer(layer => {
            if (layer instanceof L.Polyline) {
                (layer as L.Polyline).setLatLngs([]);
            } else if (layer instanceof L.Polygon) {
                (layer as L.Polygon).setLatLngs([]);
            } else if (layer instanceof L.Circle) {
                const centerLatlng = L.latLng(0, 0);
                (layer as L.Circle).setLatLng(centerLatlng);
                (layer as L.Circle).setRadius(0);
            } else if (layer instanceof L.Rectangle) {
                (layer as L.Rectangle).setBounds(L.latLngBounds([0, 0], [0, 0]));
            }
        });
    }
    // 根据类型获取图层ID
    public getLayerByType(type: string): L.Layer | null | undefined {
        switch (type) {
            // case 'line': return this.LINE_LAYER_ID;
            case 'bbox': return this.drawLayerGroup?.getLayerById(this.bboxShapeId);
            case 'circle': return this.drawLayerGroup?.getLayerById(this.CircleLayerId);
            case 'polygon': return this.drawLayerGroup?.getLayerById(this.polygenLayerId);
            default: return null;
        }
    }
}