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

// 可以实例化的工具
type toolsOptions = {
    point?: boolean;  // 实例化点
    line?: boolean; // 实例化线
    polygon?: boolean; // 实例化多边形
    circle?: boolean; // 实例化圆
    rectangle?: boolean; // 实例化矩形
};

// ------------------------------------------------------------------------------------------
// 构建绘制类
export class DrawGeometryService {
    // 常量
    private OVERLAY_PANE_INDEX = 400;
    private POPUP_PANE_INDEX = 700;
    private map: L.Map;
    // 图层初始化时，全部设为不可见
    private drawLayerStyle = {
        color: 'red', // 设置边线颜色
        fillColor: "red", // 设置填充颜色
        fillOpacity: 0.3, // 设置填充透明度
    };
    // 点（marker）图层(不用L.point, 用marker)
    private markerLayerId: string = 'draw-marker-layer';
    private markerIcon = L.divIcon({
        className: 'draw-marker-icon',
        html: '<div style="width: 16px; height: 16px; border-radius: 8px; overflow: hidden; border: solid 1px red; background: #ff000048"></div>'
    });
    // 线图层
    private lineLayerId: string = 'draw-line-layer';
    // 框选、圈选、圆选
    private rectangleLayerId: string = 'draw-rect-layer';
    private CircleLayerId: string = 'draw-circle-layer';
    private polygenLayerId: string = 'draw-poly-layer';
    private drawLayerGroup: L.LayerGroup | null = null;
    // 构造函数
    constructor(map: any, options: toolsOptions = { point: true, line: true, polygon: true, rectangle: true, circle: true }) {
        this.map = map;
        if (this.map) {
            this.init(options);
        }
    }
    private init(options: toolsOptions) {
        // (1) pane 用来定义每个图层的Zindex位置，这个只和每个layer有关系，但是和layerGroup没关系。所以下面又定义了一个layerGroup来收集和管理这些layer。
        let drawsPane = this.map.getPane('drawToolPane');
        let measurePane = this.map.getPane('measureToolPane');
        // 绘制面板
        if (!drawsPane) {
            drawsPane = this.map.createPane('drawToolPane');
            drawsPane.style.zIndex = (this.OVERLAY_PANE_INDEX + 1) + ''; // 要大于overlayPane的层级
        }
        // 测量面板
        if (!measurePane) {
            measurePane = this.map.createPane('measureToolPane');
            measurePane.style.zIndex = (this.POPUP_PANE_INDEX + 1) + ''; // 要大于popup的层级
        }
        // （2）构建一个组，
        if (!this.drawLayerGroup) {
            this.drawLayerGroup = L.layerGroup();
            this.drawLayerGroup.addTo(this.map);
        }
        // （3）  初始化各个图层
        this.initLayers(options);
    }
    // 全部放到左下角
    private initLayers(options: toolsOptions) {
        // marker
        if (options?.point && this.drawLayerGroup && !this.drawLayerGroup.getLayerById(this.markerLayerId)) {
            const markerLayer = L.marker([-90, -180], { pane: 'drawToolPane', icon: this.markerIcon });
            this.drawLayerGroup.addLayerWithId(markerLayer, this.markerLayerId);
        }
        // 线
        if (options?.line && this.drawLayerGroup && !this.drawLayerGroup.getLayerById(this.lineLayerId)) {
            const bboxLayer = L.polyline([[-90, -180], [-90, -180]], { pane: 'drawToolPane', ...this.drawLayerStyle });
            this.drawLayerGroup.addLayerWithId(bboxLayer, this.lineLayerId);
        }
        // 矩形
        if (options?.rectangle && this.drawLayerGroup && !this.drawLayerGroup.getLayerById(this.rectangleLayerId)) {
            const bboxLayer = L.rectangle([[-90, -180], [-90, -180]], { pane: 'drawToolPane',  ...this.drawLayerStyle });
            this.drawLayerGroup.addLayerWithId(bboxLayer, this.rectangleLayerId);
        }
        // 圆形
        if (options?.circle && this.drawLayerGroup && !this.drawLayerGroup.getLayerById(this.CircleLayerId)) {
            const bboxLayer = L.circle([-90, -180], { pane: 'drawToolPane', radius: 0,  ...this.drawLayerStyle});
            this.drawLayerGroup.addLayerWithId(bboxLayer, this.CircleLayerId);
        }
        // 自定义多边形
        if (options?.polygon && this.drawLayerGroup && !this.drawLayerGroup.getLayerById(this.polygenLayerId)) {
            const bboxLayer = L.polygon([[-90, -180], [-90, -180], [-90, -180], [-90, -180]], { pane: 'drawToolPane',  ...this.drawLayerStyle });
            this.drawLayerGroup.addLayerWithId(bboxLayer, this.polygenLayerId);
        }
    }
    // 公共方法：清除所有绘制内容
    public clearAll(): void {
        this.drawLayerGroup!.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                layer.setLatLng(L.latLng(-90, -180));
            } else if (layer instanceof L.Polyline) {
                layer.setLatLngs([[-90, -180], [-90, -180]]);
            } else if (layer instanceof L.Polygon) {
                layer.setLatLngs([[-90, -180], [-90, -180], [-90, -180], [-90, -180]]);
            } else if (layer instanceof L.Circle) {
                const centerLatlng = L.latLng(-90, -180);
                layer.setLatLng(centerLatlng);
                layer.setRadius(0);
            } else if (layer instanceof L.Rectangle) {
                layer.setBounds(L.latLngBounds([-90, -180], [-90, -180]));
            }
        });
    }
    // 根据类型获取图层ID
    public getLayerByType(type: string): L.Layer | null | undefined {
        switch (type) {
            case 'point': return this.drawLayerGroup?.getLayerById(this.markerLayerId);
            case 'line': return this.drawLayerGroup?.getLayerById(this.lineLayerId);
            case 'rectangle': return this.drawLayerGroup?.getLayerById(this.rectangleLayerId);
            case 'circle': return this.drawLayerGroup?.getLayerById(this.CircleLayerId);
            case 'polygon': return this.drawLayerGroup?.getLayerById(this.polygenLayerId);
            default: return null;
        }
    }
}