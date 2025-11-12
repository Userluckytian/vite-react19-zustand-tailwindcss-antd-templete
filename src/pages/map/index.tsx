<<<<<<< HEAD
/*
  安装说明:
  1：npm install leaflet webgis-maps @types/leaflet
  2：会发现报错:mapboxgl相关的错误
  3：npm install mapbox-gl@2 @types/mapbox-gl@2  // 安装2.x版本的mapboxgl
*/
<<<<<<< HEAD
import * as L from "leaflet";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import "./index.scss";
import { GlobalContext } from "@/main";
import { addScaleControl, addZoomControl } from "./map-utils";
import { formatNumber, throttle } from "@/utils/utils";
import { App } from "antd";
import CustomLeafLetDraw from "@/components/custom-leaflet-draw";
// 类型定义
=======
import * as L from 'leaflet';
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import './index.scss';
import { GlobalContext } from '@/main'
import { addScaleControl, addZoomControl } from './map-utils';
import { formatNumber, throttle } from '@/utils/utils';
import { App } from 'antd';
import { addLeafletGeoJsonLayer, bingGeojsonLayerEditEvent } from '@/utils/leafletUtils';
import CustomLeafLetDraw from '@/components/custom-leaflet-draw';
import FunctionPanel from './opt-description';

>>>>>>> c67fb13955e0a3b5f68c917b5447a71360ae1473
interface MapPreviewProps {
  outputMapView?: (map: L.Map) => void;
}
interface BaseLayerConfig {
  name: "地图" | "地球" | "地形";
  option: string;
  baseUrl: string;
  zhujiUrl: string;
  positionStyle: React.CSSProperties;
}
interface ShowVerorLayers {
  mapOne: boolean;
  mapTwo: boolean;
  mapThree: boolean;
}

interface CurrentBaseLayers {
  type: string | null;
  layers: L.TileLayer[];
}
// 常量配置
const TDT_KEY = "e6372a5333c4bac9b9ef6097453c3cd6";
const TDT_URL = "https://t{s}.tianditu.gov.cn/";
const SUBDOMAINS = ["0", "1", "2", "3", "4", "5", "6", "7"];
const MAP_STYLE = {
  attribution: "stamen",
  subdomains: "01234567",
  maxZoom: 18,
  tileSize: 256,
};
const ZHUJI_MAP_STYLE = {
  attribution: "stamen",
  subdomains: "01234567",
  name: "注记",
  maxZoom: 18,
  tileSize: 256,
};
const BASE_LAYERS: BaseLayerConfig[] = [
  {
    name: "地图",
    option: "开启注记",
    baseUrl: `http://t{s}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${TDT_KEY}&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}`,
    zhujiUrl: `http://t{s}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${TDT_KEY}&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}`,
    positionStyle: {
      backgroundPosition: "-1px -1px",
      transform: "translateX(180px)",
      width: "0px",
    },
  },
  {
    name: "地球",
    option: "开启路网",
    baseUrl: `http://t0.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TDT_KEY}`,
    zhujiUrl: `http://t{s}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${TDT_KEY}&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}`,
    positionStyle: {
      backgroundPosition: "-1px -181px",
      transform: "translateX(90px)",
      width: "0px",
    },
  },
  {
    name: "地形",
    option: "开启注记",
    baseUrl: `http://t{s}.tianditu.gov.cn/ter_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ter&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${TDT_KEY}&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}`,
    zhujiUrl: `http://t{s}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${TDT_KEY}&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}`,
    positionStyle: { backgroundPosition: "-1px -61px", width: "86px" },
  },
];
const LAYER_MAPPING: Record<string, keyof ShowVerorLayers> = {
  地图: "mapOne",
  地球: "mapTwo",
  地形: "mapThree",
};
export default function SampleCheckEditMap({ outputMapView }: MapPreviewProps) {
  const { message } = App.useApp();
  const globalConfigContext = useContext(GlobalContext);
  const baseMapSetting = globalConfigContext.baseMapSetting;
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapView, setMapView] = useState<L.Map | null>(null);
  const [lnglat, setLngLat] = useState<L.LatLng | null>(null);
  const currentBaseLayersRef = useRef<CurrentBaseLayers>({
    type: null,
    layers: [],
  });
  const [showVerorLayers, setShowVerorLayers] = useState<ShowVerorLayers>({
    mapOne: true,
    mapTwo: true,
    mapThree: true,
  });
  // 鼠标移动事件处理
  const handleMouseMove = throttle((e: L.LeafletMouseEvent) => {
    setLngLat(e.latlng);
  }, 100);
  // 添加注记图层
  const handleAddLabel = (checked: boolean, layer: BaseLayerConfig) => {
    const { zhujiUrl, name } = layer;
    if (checked) {
      const labelLayer = L.tileLayer(zhujiUrl, ZHUJI_MAP_STYLE);
      const newLayers = [labelLayer, ...currentBaseLayersRef.current.layers];
      newLayers.forEach((lyr) => mapView?.addLayer(lyr));
      currentBaseLayersRef.current = { type: name, layers: newLayers };
    } else {
      // 移除注记图层
      currentBaseLayersRef.current.layers.forEach((lyr) => {
        if ((lyr.options as any)?.name === "注记") {
          lyr.remove();
        }
      });
      currentBaseLayersRef.current.layers =
        currentBaseLayersRef.current.layers.filter(
          (lyr) => (lyr.options as any)?.name !== "注记"
        );
    }
  };
  // 切换底图
  const setBaseMap = (
    type: "地图" | "地球" | "地形",
    layer: BaseLayerConfig
  ) => {
    if (!mapView || currentBaseLayersRef.current.type === type) return;
    // 移除旧图层
    currentBaseLayersRef.current.layers.forEach((lyr) => {
      try {
        mapView.removeLayer(lyr);
      } catch (error) {
        console.warn("移除图层失败:", error);
      }
    });
    // 创建新图层
    const baseLayer = L.tileLayer(layer.baseUrl, MAP_STYLE);
    const newLayers = [baseLayer];
    // 如果需要显示注记，添加注记图层
    if (showVerorLayers[LAYER_MAPPING[type]]) {
      const zhujiLayer = L.tileLayer(layer.zhujiUrl, ZHUJI_MAP_STYLE);
      newLayers.push(zhujiLayer);
    }
    // 添加新图层到地图
    newLayers.forEach((lyr) => mapView.addLayer(lyr));
    currentBaseLayersRef.current = { type, layers: newLayers };
  };
  // 复选框处理
  const handleCheck = (
    e: React.MouseEvent<HTMLInputElement>,
    layer: BaseLayerConfig
  ) => {
    e.stopPropagation();
    const { checked } = e.target as HTMLInputElement;
    const { name } = layer;
    const layerKey = LAYER_MAPPING[name];
    if (!layerKey) return;
    // 更新状态
    setShowVerorLayers((prev) => ({
      ...prev,
      [layerKey]: checked,
    }));
    // 如果当前显示的是该底图，立即更新注记显示
    if (currentBaseLayersRef.current.type === name) {
      handleAddLabel(checked, layer);
    }
  };
  // 初始化地图
  useEffect(() => {
    if (!mapRef.current) return;
    const defaultCenter: L.LatLngExpression = [35.5, 109.1];
    const defaultZoom = 4;
    const localMapView = new L.Map(mapRef.current, {
      zoom: baseMapSetting?.zoom || defaultZoom,
      center: (baseMapSetting?.center as L.LatLngExpression) || defaultCenter,
      maxZoom: 18,
      minZoom: 4,
      attributionControl: false,
      zoomControl: false,
    });
    // 设置地图边界
    if (baseMapSetting?.maxBounds) {
      const maxBounds = L.latLngBounds(
        baseMapSetting.maxBounds as L.LatLngBoundsLiteral
      );
      localMapView.setMaxBounds(maxBounds);
    }
    setMapView(localMapView);
    outputMapView?.(localMapView);
    return () => {
      setMapView(null);
      localMapView.remove();
    };
  }, []);
  // 地图初始化后的设置
  useEffect(() => {
    if (!mapView) return;
    let mapScaleControl: L.Control | null = null;
    let mapZoomControl: L.Control | null = null;
    // 设置默认底图
    setBaseMap("地图", BASE_LAYERS[0]);
    // 添加控件
    mapScaleControl = addScaleControl(mapView);
    mapZoomControl = addZoomControl(mapView, {
      zoomInTitle: "放大",
      zoomOutTitle: "缩小",
    });
    // 添加事件监听
    mapView.on("mousemove", handleMouseMove);
    return () => {
      mapScaleControl?.remove();
      mapZoomControl?.remove();
      mapView.off("mousemove", handleMouseMove);
    };
  }, [mapView]);
  return (
    <div className="map-container">
      <div
        className="sample-check-edit-map"
        id="sample-check-edit-map"
        ref={mapRef}
        style={{ display: "block" }}
      ></div>

      {/* 底图切换工具条 */}
      <div className="layerList">
        {BASE_LAYERS.map((layer, idx) => (
          <div
            className="layerItem"
            key={`baselayer_${idx}`}
            style={layer.positionStyle}
            onClick={() => setBaseMap(layer.name, layer)}
          >
            {layer.option && (
              <div className="layerOption">
                <div>
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    onClick={(e) => handleCheck(e, layer)}
                  />
                </div>
                <div>{layer.option}</div>
              </div>
            )}
            <div className="layerName">{layer.name}</div>
          </div>
        ))}
      </div>

      {/* 绘制工具 */}
      <div className="draw-tools">
        <CustomLeafLetDraw mapInstance={mapView} />
      </div>

      {/* 经纬度信息 */}
      <div className="lnglat">
        <span>经度：</span>
        <span className="text-blue-600 font-bold">
          {lnglat ? formatNumber(lnglat.lng, 3) : 0}
        </span>
        <span>纬度：</span>
        <span className="text-blue-600 font-bold">
          {lnglat ? formatNumber(lnglat.lat, 3) : 0}
        </span>
        <span> 中科天启</span>
=======
import { useContext, useEffect, useRef, useState } from "react";
import "./index.scss";
import { GlobalContext } from "@/main";
import { throttle } from "@/utils/utils";
import { App } from "antd";
interface MapPreviewProps {
  outputMapView?: (map: any) => void;
}
// 地图类型定义
type MapType = "normal" | "earth" | "satellite" | "traffic" | "panorama";
// 绘制类型定义
type DrawingType =
  | "marker"
  | "polyline"
  | "rectangle"
  | "polygon"
  | "circle"
  | null;
export default function SampleCheckEditMap({ outputMapView }: MapPreviewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { message } = App.useApp();
  const drawingManagerRef = useRef<any>(null);
  // 在组件顶部添加状态
  const [hasEarthInitialized, setHasEarthInitialized] = useState(false);
  const [userMapSettings, setUserMapSettings] = useState(true);
  const mapRef = useRef<any>(null);
  // 创建全景图层
  const panoramaLayerRef = useRef<any>(null);
  const [mapView, setMapView] = useState<any>(null);
  const [lnglat, setLngLat] = useState<any>(null);
  const [currentMapType, setCurrentMapType] = useState<MapType>("normal");
  const [currentDrawingType, setCurrentDrawingType] =
    useState<DrawingType>(null);
  // 单一全景管理器引用
  const panoramaManagerRef = useRef<{
    layer: any;
    control: any;
    contextMenu: any;
    isActive: boolean;
  }>({
    layer: null,
    control: null,
    contextMenu: null,
    isActive: false,
  });
  // 切换到非全景地图时，移除全景图层
  useEffect(() => {
    console.log("切换地图类型", currentMapType);
  }, [currentMapType]);
  // 地图类型配置
  const mapTypes = [
    {
      key: "normal" as MapType,
      name: "常规地图",
      icon: "🗺️",
      description: "标准矢量地图",
      positionStyle: {
        backgroundPosition: "-1px -1px",
        transform: "translateX(180px)",
        width: "0px",
      },
    },
    {
      key: "earth" as MapType,
      name: "地球模式",
      icon: "🌍",
      description: "3D地球视图",
      positionStyle: {
        backgroundPosition: "-1px -181px",
        transform: "translateX(90px)",
        width: "0px",
      },
      option: "开启路网",
    },
    {
      key: "panorama" as MapType,
      name: "全景地图",
      icon: "🏙️",
      description: "街景全景视图",
      positionStyle: {
        backgroundPosition: "-1px -121px", // 根据你的样式调整
        width: "86px",
      },
    },
  ];
  // 绘制工具配置
  const drawingTools = [
    { key: "marker" as DrawingType, name: "点", icon: "📍" },
    { key: "polyline" as DrawingType, name: "线", icon: "📏" },
    { key: "rectangle" as DrawingType, name: "矩形", icon: "⬜" },
    { key: "polygon" as DrawingType, name: "多边形", icon: "🔺" },
    { key: "circle" as DrawingType, name: "圆", icon: "⭕" },
  ];
  // 简化的添加全景方法
  const addPanoramaLayer = (map: any) => {
    removePanoramaLayer(map); // 先清理
    const { BMapGL } = window as any;
    panoramaManagerRef.current.layer = new BMapGL.PanoramaCoverageLayer();
    map.addTileLayer(panoramaManagerRef.current.layer);
    // 添加右键菜单并保存引用
    panoramaManagerRef.current.contextMenu = addContextMenu(map);
    panoramaManagerRef.current.control = new BMapGL.PanoramaControl();
    panoramaManagerRef.current.control.setOffset(new BMapGL.Size(20, 5));
    map.addControl(panoramaManagerRef.current.control);
    panoramaManagerRef.current.isActive = true;
  };
  // 简化的移除全景方法
  const removePanoramaLayer = (map: any) => {
    if (map && panoramaManagerRef.current.isActive) {
      const { layer, control, contextMenu } = panoramaManagerRef.current;
      if (layer) map.removeTileLayer(layer);
      if (control) map.removeControl(control);
      if (contextMenu) map.removeContextMenu(contextMenu);
      // 4. 关键：禁用全景覆盖层（这会移除蓝色的全景图钉）
      panoramaManagerRef.current = {
        layer: null,
        control: null,
        contextMenu: null,
        isActive: false,
      };
    }
  };
  // 初始化绘制工具
  const initDrawingManager = (map: any) => {
    const styleOptions = {
      strokeColor: "#5E87DB",
      fillColor: "#5E87DB",
      strokeWeight: 2,
      strokeOpacity: 1,
      fillOpacity: 0.2,
    };

    const labelOptions = {
      borderRadius: "2px",
      background: "#FFFBCC",
      border: "1px solid #E1E1E1",
      color: "#703A04",
      fontSize: "12px",
      letterSpacing: "0",
      padding: "5px",
    };

    // 实例化鼠标绘制工具
    const drawingManager = new (window as any).BMapGLLib.DrawingManager(map, {
      enableCalculate: false,
      enableSorption: true,
      sorptiondistance: 20,
      circleOptions: styleOptions,
      polylineOptions: styleOptions,
      polygonOptions: styleOptions,
      rectangleOptions: styleOptions,
      labelOptions: labelOptions,
    });

    // 监听绘制完成事件
    drawingManager.addEventListener("overlaycomplete", (e: any) => {
      console.log("绘制完成:", e);
      message.success(
        `绘制完成: ${
          drawingTools.find((t) => t.key === currentDrawingType)?.name
        }`
      );

      // 这里可以处理绘制完成的图形
      // 例如保存图形数据、显示属性等
    });

    drawingManagerRef.current = drawingManager;
    return drawingManager;
  };
  // 开始绘制
  const startDrawing = (drawingType: DrawingType) => {
    if (!mapView || !drawingManagerRef.current) return;
    // 如果点击的是当前已激活的工具，则关闭绘制
    if (currentDrawingType === drawingType) {
      stopDrawing();
      return;
    }
    setCurrentDrawingType(drawingType);
    // 映射绘制类型常量
    const drawingTypeConstants: Record<string, any> = {
      marker: (window as any).BMAP_DRAWING_MARKER,
      polyline: (window as any).BMAP_DRAWING_POLYLINE,
      rectangle: (window as any).BMAP_DRAWING_RECTANGLE,
      polygon: (window as any).BMAP_DRAWING_POLYGON,
      circle: (window as any).BMAP_DRAWING_CIRCLE,
    };
    const drawingMode = drawingTypeConstants[drawingType];
    if (drawingMode) {
      drawingManagerRef.current.setDrawingMode(drawingMode);
      drawingManagerRef.current.open();
      message.info(
        `开始绘制${drawingTools.find((t) => t.key === drawingType)?.name}`
      );
    }
  };
  // 停止绘制
  const stopDrawing = () => {
    if (drawingManagerRef.current) {
      drawingManagerRef.current.close();
      setCurrentDrawingType(null);
      message.info("已退出绘制模式");
    }
  };
  // 清除所有绘制图形
  const clearAllDrawings = () => {
    console.log("清除所有绘制图形", drawingManagerRef.current);
    if (drawingManagerRef.current) {
      // 清除所有绘制图形
      drawingManagerRef.current.clear();
      message.success("已清除所有绘制图形");
    }
  };
  // 百度地图的缩放控制
  const zoomIn = () => {
    if (mapRef.current) {
      mapRef.current.setZoom(mapRef.current.getZoom() + 1);
    }
  };
  const zoomOut = () => {
    if (mapRef.current) {
      mapRef.current.setZoom(mapRef.current.getZoom() - 1);
    }
  };
  // 百度地图的鼠标移动事件
  const handleMapMove = throttle((e: any) => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    setLngLat({
      lng: center.lng,
      lat: center.lat,
    });
  }, 500);
  const handleCheck = (e: any, mapType: MapType) => {
    if (!mapRef.current) return;
    if (mapType === currentMapType) {
      if (e.target.checked) {
        setUserMapSettings(true);
        showRoadNet(mapContainerRef.current);
      } else {
        hideRoadNet(mapContainerRef.current);
        setUserMapSettings(false);
      }
    }
  };
  // 切换地图类型
  const switchMapType = (mapType: MapType) => {
    if (!mapContainerRef.current) return;
    setCurrentMapType(mapType);
    // 如果已经有地图，只切换类型，不重新创建
    if (mapRef.current) {
      try {
        const map = mapRef.current;
        switch (mapType) {
          case "normal":
            removePanoramaLayer(map);
            map.setMapType((window as any).BMAP_NORMAL_MAP);
            map.setTilt(0);
            break;
          case "earth":
            removePanoramaLayer(map);
            map.setMapType((window as any).BMAP_EARTH_MAP);
            map.setTilt(60);
            // 地球模式特殊处理
            if (!hasEarthInitialized) {
              // 首次切换到地球模式：强制隐藏路网和POI
              hideRoadNet(map);
              setHasEarthInitialized(true);
            } else {
              if (!userMapSettings) {
                hideRoadNet(map);
              }
            }
            if (map.enable3DBuilding) {
              map.enable3DBuilding();
            }
            break;
          case "panorama":
            map.setMapType((window as any).BMAP_SATELLITE_MAP);
            addPanoramaLayer(map);
            break;
        }

        message.success(
          `已切换到${mapTypes.find((m) => m.key === mapType)?.name}`
        );
        return; // 直接返回，不重新创建地图
      } catch (error) {
        console.error("切换地图类型失败:", error);
        // 如果切换失败，继续执行下面的创建逻辑
      }
    }
    // 创建新的地图实例
    const newMap = new (window as any).BMapGL.Map(mapContainerRef.current);
    // 手动启用滚轮缩放（重要！）
    newMap.enableScrollWheelZoom(true);
    // 如果需要更精细的控制，可以使用
    newMap.enableContinuousZoom(true); // 启用连续缩放
    newMap.enableInertialDragging(true); // 启用惯性拖拽
    // 将全景图层添加到地图中
    newMap.addTileLayer(panoramaLayerRef.current);
    // 设置中心点和缩放
    newMap.centerAndZoom(
      new (window as any).BMapGL.Point(116.402544, 39.928216),
      1
    );
    // 监听鼠标右键事件
    newMap.addEventListener("rightclick", function (e) {
      // 判断是否已经存在菜单
      if (panoramaManagerRef.current.contextMenu) {
        removePanoramaLayer(newMap);
      }
    });
    try {
      switch (mapType) {
        case "normal":
          newMap.setMapType((window as any).BMAP_NORMAL_MAP);
          newMap.setTilt(0);
          break;
        case "earth":
          newMap.setMapType((window as any).BMAP_EARTH_MAP);
          hideRoadNet(newMap);
          newMap.setTilt(60);
          if (newMap.enable3DBuilding) {
            newMap.enable3DBuilding();
          }
          break;
        case "panorama":
          // 全景模式下添加全景图层和控件
          newMap.addTileLayer(
            new (window as any).BMapGL.PanoramaCoverageLayer()
          );
          const stCtrl = new (window as any).BMapGL.PanoramaControl();
          stCtrl.setOffset(new (window as any).BMapGL.Size(0, 0));
          newMap.addControl(stCtrl);
          newMap.centerAndZoom(
            new (window as any).BMapGL.Point(116.40385, 39.913795),
            4
          );
          break;
      }

      // 更新引用
      mapRef.current = newMap;
      setMapView(newMap);
      outputMapView?.(newMap);
      // 初始化工具
      initDrawingManager(newMap);
      // 添加事件监听
      newMap.addEventListener("movestart", handleMapMove);
      newMap.addEventListener("moveend", handleMapMove);

      message.success(
        `已切换到${mapTypes.find((m) => m.key === mapType)?.name}`
      );
    } catch (error) {
      console.error("创建地图失败:", error);
      message.error("地图创建失败");
    }
    mapContainerRef.current = newMap;

    // 不再强制重新渲染容器，避免地图实例被卸载
  };
  function showRoadNet(map) {
    map.setDisplayOptions({
      street: true, //是否显示路网（只对卫星图和地球模式有效）
      poi: true,
    });
  }
  function hideRoadNet(map) {
    map.setDisplayOptions({
      street: false, //是否显示路网（只对卫星图和地球模式有效）
      poi: false,
    });
  }
  // 鼠标右键添加菜单
  function addContextMenu(map) {
    const contextMenu = new (window as any).BMapGL.ContextMenu();
    var txtMenuItem = [
      {
        text: "放大一级",
        callback: function () {
          map.zoomIn();
        },
      },
      {
        text: "缩小一级",
        callback: function () {
          map.zoomOut();
        },
      },
      {
        text: "全景预览",
        callback: function () {
          // 关闭全景
          removePanoramaLayer(map);
        },
      },
    ];
    for (const k in txtMenuItem) {
      contextMenu.addItem(
        new (window as any).BMapGL.MenuItem(
          txtMenuItem[k].text,
          txtMenuItem[k].callback,
          100
        )
      );
    }
    // 关键：将菜单添加到地图
    map.addContextMenu(contextMenu);
    return contextMenu; // 返回菜单引用以便后续管理
  }
  // 初始化百度地图
  useEffect(() => {
    // 使用 setTimeout 确保 DOM 已渲染
    const timer = setTimeout(() => {
      if (mapContainerRef.current) {
        switchMapType("normal");
      }
    }, 1000);

<<<<<<< HEAD
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="map-container">
      {/* 百度地图 - 通过外部控制地图类型 */}
      <div
        ref={mapContainerRef}
        style={{
          height: "calc(100vh - 80px)",
          width: "100vw",
        }}
      />
      <div className="layerList">
        {mapTypes.map((mapType: any, idx: number) => {
          return (
            <div
              className="layerItem"
              key={`baselayer_${idx}`}
              style={mapType.positionStyle}
              onClick={() => switchMapType(mapType.key)}
            >
              {mapType.option && (
                <div className="layerOption">
                  <div>
                    <input
                      type="checkbox"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheck(e, mapType.key);
                      }}
                    ></input>
                  </div>
                  <div>{mapType.option}</div>
                </div>
              )}
              <div className="layerName">{mapType.name}</div>
            </div>
          );
        })}
      </div>
      {/* 绘制工具控件 */}
      {/* <div className="drawing-control">
        <div className="control-header">
          <span className="title">绘制工具</span>
          {currentDrawingType && (
            <button className="stop-drawing-btn" onClick={stopDrawing}>
              退出绘制
            </button>
          )}
=======
    function mouseMoveFun(e: any) {
        setLngLat(e.latlng);
    };

    // 清除绘制信息和所选择的行政区划信息
    function clearDrawAndDistrict() { };


    // 绘制多边形
    function drawPolygon(value: { geometry: any }) {
        console.log('value', value);
        // const geoLayerOption = {
        //     style: {
        //         color: "#000dff",
        //         weight: 3,
        //         opacity: 0.8,
        //         fill: true, // 设置false的话，就只能点击边才能触发了！
        //         id: 'xxx'
        //     },
        // };
        // const geoJsonLayer = addLeafletGeoJsonLayer(mapView!, value.geometry, 'layerGeoJsonPane', 3, geoLayerOption);
        // bingGeojsonLayerEditEvent(geoJsonLayer, mapView!);
        // drawLayerGroup.current?.addLayer(geoJsonLayer).addTo(mapView!);
    };


    useEffect(() => {
        if (!mapRef.current) return;
        // 初始化地图
        const localMapView = new L.Map(mapRef.current, {
            zoom: baseMapSetting?.zoom || 4,
            center: (baseMapSetting?.center as L.LatLngExpression) || [35.5, 109.1],
            // maxZoom: baseMapSetting?.defaultMaxZoom || 18,
            maxZoom: 18,
            minZoom: 4,
            attributionControl: false, // 默认情况下，是否将 attribution 版权控件添加到地图中。
            zoomControl: false, // 默认情况下，是否将 zoom 缩放控件添加到地图中。
        });
        if (baseMapSetting?.maxBounds) {
            const maxBounds = L.latLngBounds(
                baseMapSetting.maxBounds as L.LatLngBoundsLiteral
            );
            localMapView.setMaxBounds(maxBounds);
        }


        setMapView && setMapView(localMapView);
        return () => {
            setMapView && setMapView(null);
            localMapView.remove();
        };
    }, []);

    useEffect(() => {
        let mapScaleControl: any = null;
        let mapZoomControl: any = null;
        if (mapView) {
            // 获取到地图后，触发事件： 
            // 事件1: 添加底图
            /*
                google地图，很清晰，不过估计需要翻墙才能看
            */
            // const satelliteMap = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            //     subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            // });
            // const baseLayers = {
            //     "谷歌影像": satelliteMap,
            // }
            // var layerControl = new L.Control.Layers(baseLayers, null);
            // layerControl.addTo(mapView);
            /*
                矢量底图
                leaflet API: 
                天地图地址： http://t0.tianditu.gov.cn/vec_w/wmts?tk=您的密钥
            */
            const imageURL2 = `http://t{s}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${tdtKey}&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}`
            const vLayer = L.tileLayer(imageURL2, mapStyle);
            vLayer.addTo(mapView);
            // /*
            //     地形渲染
            //     leaflet API: 
            //     天地图地址： http://t0.tianditu.gov.cn/ter_w/wmts?tk=您的密钥
            // */
            // const imageURL3 = `http://t{s}.tianditu.gov.cn/ter_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ter&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${tdtKey}&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}`
            // var vEarthLabel = L.tileLayer(imageURL3, mapStyle);
            // vEarthLabel.addTo(mapView);

            /*
                矢量注记
                leaflet API: 
                天地图地址： http://t0.tianditu.gov.cn/cva_w/wmts?tk=您的密钥
            */
            const vLabelUrl = `http://t{s}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${tdtKey}&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}`
            const vLabelLayer = L.tileLayer(vLabelUrl, mapStyle);
            vLabelLayer.addTo(mapView);

            // 事件2： 添加地图比例尺工具条
            mapScaleControl = addScaleControl(mapView);
            // 事件3： 添加地图Zoom工具条
            mapZoomControl = addZoomControl(mapView, { zoomInTitle: '放大', zoomOutTitle: '缩小' });
            // todo: 事件4：添加zoomout和zoomin事件--设置和显示地图缩放范围

            // 事件5：添加mousemove事件--设置经纬度信息
            mapView.on('mousemove', throttle(mouseMoveFun, 100))
        }
        return () => {
            mapScaleControl && mapScaleControl.remove();
            mapZoomControl && mapZoomControl.remove();
        }
    }, [mapView])




    return (
        <div className='map-container'>
            {/* 待加入内容：
                1: 地图底图、以及底图切换
                2: 放大缩小工具条、绘制点、线、矩形、圆、多边
                3: 面积测量
             */}
            <div className="sample-check-edit-map" id="sample-check-edit-map" ref={mapRef}></div>
            {/* 工具条1: 底图切换 */}
            <div className='layerList'>
                {
                    baseLayers.map((layer: any, idx: number) => {
                        return <div className='layerItem' key={`baselayer_${idx}`} style={layer.positionStyle}>
                            <div className='layerName'>{layer.name}</div>
                        </div>
                    })
                }
            </div>

            {/* 工具条2: 绘制工具 */}
            <div className="draw-tools">
                <CustomLeafLetDraw mapInstance={mapView}></CustomLeafLetDraw>
            </div>
            {/* 工具条3: 绘制面积 */}
            <div className='area-info'></div>
            {/* 工具条3: 删除绘制内容的按钮 */}

            {/* 工具条4: 显示经纬度信息 */}
            <div className='lnglat'>
                <span>经度：</span>
                <span className='text-blue-600 font-bold'>{lnglat && formatNumber(lnglat.lng, 3) || 0}</span>
                <span>纬度：</span>
                <span className='text-blue-600 font-bold'>{lnglat && formatNumber(lnglat.lat, 3) || 0}</span>
                <span> 中科天启</span>
            </div>
            {/* 说明信息 */}
            <div className="leaflet-edit-pane">
                <FunctionPanel />
            </div>

>>>>>>> c67fb13955e0a3b5f68c917b5447a71360ae1473
        </div>
        <div className="drawing-buttons">
          {drawingTools.map((tool) => (
            <button
              key={tool.key}
              className={`drawing-button ${
                currentDrawingType === tool.key ? "active" : ""
              }`}
              onClick={() => startDrawing(tool.key)}
              title={tool.name}
            >
              <span className="icon">{tool.icon}</span>
              <span className="name">{tool.name}</span>
            </button>
          ))}
          <button
            className="drawing-button clear-btn"
            onClick={clearAllDrawings}
            title="清除所有图形"
          >
            <span className="icon">🗑️</span>
            <span className="name" onClick={clearAllDrawings}>
              清除
            </span>
          </button>
        </div>
      </div> */}
      {/* 自定义缩放控件 */}
      <div className="custom-zoom-control">
        <button onClick={zoomIn} title="放大" className="custom-zoom-btn">
          +
        </button>
        <button onClick={zoomOut} title="缩小" className="custom-zoom-btn">
          -
        </button>
>>>>>>> upstream/dev_zhangm
      </div>
    </div>
  );
}
