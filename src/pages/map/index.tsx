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
  //   设置一个变量来判断是否添加矢量注记
  const [isAddVectorLabel, setIsAddVectorLabel] = useState(false);
  // 3D 地球（Cesium）相关
  const [isCesium, setIsCesium] = useState(false);
  const cesiumContainerRef = useRef<HTMLDivElement | null>(null);
  const cesiumViewerRef = useRef<any>(null);
  //  创建一个矢量注记图层
  const vectorLabelLayerRef = useRef<L.TileLayer | null>(null);
  // 经纬度信息
  const [lnglat, setLngLat] = useState<any>(null);
  const baseLayers = [
    {
      name: "地图",
      positionStyle: {
        backgroundPosition: "-1px -1px",
        transform: "translateX(180px)",
        width: "0px",
      },
    },
    {
      name: "地球",
      option: "开启路网",
      positionStyle: {
        backgroundPosition: "-1px -181px",
        transform: "translateX(90px)",
        width: "0px",
      },
    },
    {
      name: "地形",
      positionStyle: { backgroundPosition: "-1px -61px", width: "86px" },
    },
  ];

  function mouseMoveFun(e: any) {
    setLngLat(e.latlng);
  }
  // 清除绘制信息和所选择的行政区划信息
  function clearDrawAndDistrict() {}
  // 创建3d地球
  function createCesiumViewer(type) {
    setIsCesium(true);
    if (!Cesium) {
      message.error("Cesium 未加载，无法显示三维地球");
    } else {
      if (!cesiumViewerRef.current && cesiumContainerRef.current) {
        // 初始化 Cesium Viewer（关闭不需要的 UI）
        cesiumViewerRef.current = new Cesium.Viewer(
          cesiumContainerRef.current,
          {
            animation: false,
            baseLayerPicker: false,
            fullscreenButton: false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            sceneModePicker: false,
            timeline: false,
            navigationHelpButton: false,
            selectionIndicator: false,
            shadows: false,
            imageryProvider: false, // 禁用默认底图，避免访问 Ion
            terrainProvider: new Cesium.EllipsoidTerrainProvider(), // 禁用 Ion 地形
          }
        );
        // 影像底图
        const tdtUrl = "https://t{s}.tianditu.gov.cn/";
        const subdomains = ["0", "1", "2", "3", "4", "5", "6", "7"];
        const imgProvider = new Cesium.UrlTemplateImageryProvider({
          url: `${tdtUrl}DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${tdtKey}`,
          subdomains,
          tilingScheme: new Cesium.WebMercatorTilingScheme(),
          maximumLevel: 18,
        });
        cesiumViewerRef.current.imageryLayers.addImageryProvider(imgProvider);
        // 矢量注记
        if (isAddVectorLabel) {
          const ciaProvider = new Cesium.UrlTemplateImageryProvider({
            url: `${tdtUrl}DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=${tdtKey}`,
            subdomains,
            tilingScheme: new Cesium.WebMercatorTilingScheme(),
            maximumLevel: 18,
          });
          vectorLabelLayerRef.current =
            cesiumViewerRef.current.imageryLayers.addImageryProvider(
              ciaProvider
            );
        }
        // 初始飞到中国
        cesiumViewerRef.current.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(103.84, 31.15, 17850000),
        });
      }
    }
    // 切换到三维地球时，移除 Leaflet 的图层
    currentBaseLayersRef.current = { type, layers: [] };
  }
  // 切换底图：地图(矢量)、地球(三维)、地形
  function setBaseMap(type: "地图" | "地球" | "地形") {
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
    if (type === "地图") {
      setIsCesium(false);
      // 关闭并销毁已有的 Cesium 实例
      if (cesiumViewerRef.current) {
        try {
          cesiumViewerRef.current.destroy();
        } catch {}
        cesiumViewerRef.current = null;
        vectorLabelLayerRef.current = null;
      }
      const vecUrl = `http://t{s}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${tdtKey}&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}`;
      const cvaUrl = `http://t{s}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${tdtKey}&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}`;
      const base = L.tileLayer(vecUrl, style);
      const label = L.tileLayer(cvaUrl, style);
      newLayers = [base, label];
    } else if (type === "地球") {
      createCesiumViewer(type);
      return; // 不向 Leaflet 添加任何图层
    } else if (type === "地形") {
      setIsCesium(false);
      // 关闭并销毁已有的 Cesium 实例
      if (cesiumViewerRef.current) {
        try {
          cesiumViewerRef.current.destroy();
        } catch {}
        cesiumViewerRef.current = null;
        vectorLabelLayerRef.current = null;
      }
      // 地形底图 + 地形注记
      const terUrl = `http://t{s}.tianditu.gov.cn/ter_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ter&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${tdtKey}&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}`;
      const ctaUrl = `http://t{s}.tianditu.gov.cn/cta_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cta&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${tdtKey}&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}`;
      const base = L.tileLayer(terUrl, style);
      const label = L.tileLayer(ctaUrl, style);
      newLayers = [base, label];
    }
    if (mapView) {
      newLayers.forEach((lyr) => lyr.addTo(mapView));
    }
    currentBaseLayersRef.current = { type, layers: newLayers };
  }

  // 绘制多边形
  function drawPolygon(value: { geometry: any }) {
    console.log("value", value);
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
      setBaseMap("地图");

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
  const handleCheck = (e: any) => {
    const { checked } = e.target;
    setIsAddVectorLabel(checked);
  };
  useEffect(() => {
    // 仅在三维地球且 viewer 存在时响应
    if (!isCesium || !cesiumViewerRef.current) return;
    if (isAddVectorLabel) {
      if (!vectorLabelLayerRef.current) {
        const ciaProvider = new Cesium.UrlTemplateImageryProvider({
          url: `${tdtUrl}DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=${tdtKey}`,
          subdomains,
          tilingScheme: new Cesium.WebMercatorTilingScheme(),
          maximumLevel: 18,
        });
        vectorLabelLayerRef.current =
          cesiumViewerRef.current.imageryLayers.addImageryProvider(ciaProvider);
      }
    } else {
      if (vectorLabelLayerRef.current) {
        cesiumViewerRef.current.imageryLayers.remove(
          vectorLabelLayerRef.current
        );
        vectorLabelLayerRef.current = null;
      }
    }
  }, [isAddVectorLabel, isCesium]);
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
        style={{ display: isCesium ? "none" : "block" }}
      ></div>
      {/* Cesium 三维容器 */}
      <div
        id="cesiumContainer"
        ref={cesiumContainerRef}
        style={{
          display: isCesium ? "block" : "none",
          width: "100%",
          height: "100%",
        }}
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
                setBaseMap(layer.name as any);
              }}
            >
              {" "}
              {layer.option && (
                <div className="layerOption">
                  <div>
                    <input
                      type="checkbox"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheck(e);
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
