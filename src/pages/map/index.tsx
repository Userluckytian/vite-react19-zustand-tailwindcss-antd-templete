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
import {
  addLeafletGeoJsonLayer,
  bingGeojsonLayerEditEvent,
} from "@/utils/leafletUtils";
import CustomLeafLetDraw from "@/components/custom-leaflet-draw";
interface MapPreviewProps {
  outputMapView?: (map: L.Map) => void;
}
let Cesium: any = (window as any).Cesium;
const tdtKey = "e6372a5333c4bac9b9ef6097453c3cd6";
const tdtUrl = "https://t{s}.tianditu.gov.cn/";
const subdomains = ["0", "1", "2", "3", "4", "5", "6", "7"];
export default function SampleCheckEditMap({ outputMapView }: MapPreviewProps) {
  const mapStyle: any = {
    attribution: "stamen",
    subdomains: "01234567",
    maxZoom: 18,
    tileSize: 256,
  };
  const zhujimapStyle: any = {
    attribution: "stamen",
    subdomains: "01234567",
    name: "注记",
    maxZoom: 18,
    tileSize: 256,
  };
  const { message } = App.useApp();
  const globalConfigContext = useContext(GlobalContext);
  const baseMapSetting = globalConfigContext.baseMapSetting;
  const [mapView, setMapView] = useState<L.Map | null>(null);
  const mapRef = useRef(null);
  // 记录当前底图图层，便于切换时移除
  const currentBaseLayersRef = useRef<{
    type: string | null;
    layers: L.TileLayer[];
  }>({
    type: null,
    layers: [],
  });
  const verorLayersRef = useRef<{
    mapOne: boolean;
    mapTwo: boolean;
    mapThree: boolean;
  }>({
    mapOne: true,
    mapTwo: true,
    mapThree: true,
  });
  // 经纬度信息
  const [lnglat, setLngLat] = useState<any>(null);
  const baseLayers = [
    {
      name: "地图",
      option: "开启注记",
      baseUrl: `http://t{s}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${tdtKey}&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}`,
      zhujiUrl: `http://t{s}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${tdtKey}&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}`,
      positionStyle: {
        backgroundPosition: "-1px -1px",
        transform: "translateX(180px)",
        width: "0px",
      },
    },
    {
      name: "地球",
      option: "开启路网",
      baseUrl: `http://t0.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tdtKey}`,
      zhujiUrl: `http://t{s}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${tdtKey}&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}`,
      positionStyle: {
        backgroundPosition: "-1px -181px",
        transform: "translateX(90px)",
        width: "0px",
      },
    },
    {
      name: "地形",
      option: "开启注记",
      baseUrl: `http://t{s}.tianditu.gov.cn/ter_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ter&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${tdtKey}&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}`,
      zhujiUrl: `http://t{s}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${tdtKey}&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}`,
      positionStyle: { backgroundPosition: "-1px -61px", width: "86px" },
    },
  ];
  function mouseMoveFun(e: any) {
    setLngLat(e.latlng);
  }
  // 按照类别添加注记图层
  const handleAddLabel = (checked, cvaUrl) => {
    const style = zhujimapStyle;
    let newLayers: L.TileLayer[] = [];
    if (checked) {
      const label = L.tileLayer(cvaUrl, style);
      newLayers = [label, ...currentBaseLayersRef.current.layers];
      if (mapView) {
        newLayers.forEach((lyr) => lyr.addTo(mapView));
      }
      currentBaseLayersRef.current = { type: "地图", layers: newLayers };
    } else {
      currentBaseLayersRef.current.layers.forEach((lyr) => {
        const name = (lyr.options as any)?.name;
        if (name == "注记") {
          lyr.remove();
        }
      });
      currentBaseLayersRef.current = {
        type: "地图",
        layers: [],
      };
    }
  };
  // 切换底图：地图(矢量)、地球(三维)、地形
  function setBaseMap(type: "地图" | "地球" | "地形", layer) {
    const mapConfig = {
      地图: verorLayersRef.current.mapOne,
      地球: verorLayersRef.current.mapTwo,
      地形: verorLayersRef.current.mapThree,
    };
    if (!mapView) return;
    // 如果类型相同则不处理
    if (currentBaseLayersRef.current.type === type) return;
    // 1) 移除旧图层
    currentBaseLayersRef.current.layers.forEach((lyr) => {
      try {
        mapView.removeLayer(lyr);
      } catch {}
    });
    currentBaseLayersRef.current.layers = [];
    // 2) 根据类型创建并添加新图层
    const style = mapStyle;
    let newLayers: L.TileLayer[] = [];
    const baseUrl = layer.baseUrl;
    const base = L.tileLayer(baseUrl, style);
    const zhujiUrl = layer.zhujiUrl;
    const zhuji = L.tileLayer(zhujiUrl, zhujimapStyle);
    const targetMap = mapConfig[type];
    if (targetMap) {
      newLayers = [base, zhuji];
    } else {
      newLayers = [base];
    }
    if (mapView) {
      newLayers.forEach((lyr) => lyr.addTo(mapView));
    }
    currentBaseLayersRef.current = { type, layers: newLayers };
  }
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
      // 默认加载矢量底图
      setBaseMap("地图", baseLayers[0]);

      // 事件2： 添加地图比例尺工具条
      mapScaleControl = addScaleControl(mapView);
      // 事件3： 添加地图Zoom工具条
      mapZoomControl = addZoomControl(mapView, {
        zoomInTitle: "放大",
        zoomOutTitle: "缩小",
      });
      // todo: 事件4：添加zoomout和zoomin事件--设置和显示地图缩放范围

      // 事件5：添加mousemove事件--设置经纬度信息
      mapView.on("mousemove", throttle(mouseMoveFun, 100));
    }
    return () => {
      mapScaleControl && mapScaleControl.remove();
      mapZoomControl && mapZoomControl.remove();
    };
  }, [mapView]);
  const handleCheck = (e: any, layer) => {
    const { checked } = e.target;
    const { name } = layer;
    if (name == "地图") {
      const params = {
        mapOne: checked,
        mapTwo: verorLayersRef.current.mapTwo,
        mapThree: verorLayersRef.current.mapThree,
      };
      verorLayersRef.current = params;
    } else if (name == "地球") {
      const params = {
        mapTwo: checked,
        mapOne: verorLayersRef.current.mapOne,
        mapThree: verorLayersRef.current.mapThree,
      };
      verorLayersRef.current = params;
    } else if (name == "地形") {
      const params = {
        mapOne: verorLayersRef.current.mapOne,
        mapTwo: verorLayersRef.current.mapTwo,
        mapThree: checked,
      };
      verorLayersRef.current = params;
    }
    handleAddLabel(checked, layer.zhujiUrl);
  };
  return (
    <div className="map-container">
      {/* 待加入内容：
                1: 地图底图、以及底图切换
                2: 放大缩小工具条、绘制点、线、矩形、圆、多边
                3: 面积测量
             */}
      <div
        className="sample-check-edit-map"
        id="sample-check-edit-map"
        ref={mapRef}
        style={{ display: "block" }}
      ></div>
      {/* 工具条1: 底图切换 */}
      <div className="layerList">
        {baseLayers.map((layer: any, idx: number) => {
          return (
            <div
              className="layerItem"
              key={`baselayer_${idx}`}
              style={layer.positionStyle}
              onClick={(e) => {
                setBaseMap(layer.name as any, layer);
              }}
            >
              {" "}
              {layer.option && (
                <div className="layerOption">
                  <div>
                    <input
                      type="checkbox"
                      defaultChecked={true}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheck(e, layer);
                      }}
                    ></input>
                  </div>
                  <div>{layer.option}</div>
                </div>
              )}
              <div className="layerName">{layer.name}</div>
            </div>
          );
        })}
      </div>

      {/* 工具条2: 绘制工具 */}
      <div className="draw-tools">
        <CustomLeafLetDraw mapInstance={mapView}></CustomLeafLetDraw>
      </div>
      {/* 工具条3: 绘制面积 */}
      <div className="area-info"></div>
      {/* 工具条3: 删除绘制内容的按钮 */}

      {/* 工具条4: 显示经纬度信息 */}
      <div className="lnglat">
        <span>经度：</span>
        <span className="text-blue-600 font-bold">
          {(lnglat && formatNumber(lnglat.lng, 3)) || 0}
        </span>
        <span>纬度：</span>
        <span className="text-blue-600 font-bold">
          {(lnglat && formatNumber(lnglat.lat, 3)) || 0}
        </span>
        <span> 中科天启</span>
      </div>
    </div>
  );
}
