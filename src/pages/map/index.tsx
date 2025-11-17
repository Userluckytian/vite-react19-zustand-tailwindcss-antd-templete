/*
  安装说明:
  1：npm install leaflet webgis-maps @types/leaflet
  2：会发现报错:mapboxgl相关的错误
  3：npm install mapbox-gl@2 @types/mapbox-gl@2  // 安装2.x版本的mapboxgl
*/
import * as L from "leaflet";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import "./index.scss";
import { GlobalContext } from "@/main";
import { addScaleControl, addZoomControl } from "./map-utils";
import { formatNumber, throttle } from "@/utils/utils";
import { App } from "antd";
import CustomLeafLetDraw from "@/components/custom-leaflet-draw";
// 类型定义
import FunctionPanel from './opt-description';
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

  /*
      google地图，很清晰，但需要翻墙才能看
  */
  const addGoogleMap = () => {
    const satelliteMap = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    });
    const baseLayers = {
      "谷歌影像": satelliteMap,
    }
    var layerControl = new L.Control.Layers(baseLayers, null);
    layerControl.addTo(mapView);
  }
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
    // 事件2： 添加地图比例尺工具条
    mapScaleControl = addScaleControl(mapView);
    // 事件3： 添加地图Zoom工具条
    mapZoomControl = addZoomControl(mapView, {
      zoomInTitle: "放大",
      zoomOutTitle: "缩小",
    });
    // todo: 事件4：添加zoomout和zoomin事件--设置和显示地图缩放范围

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
      </div>
      {/* 说明信息 */}
      <div className="leaflet-edit-pane">
        <FunctionPanel />
      </div>
    </div>
  );
}
