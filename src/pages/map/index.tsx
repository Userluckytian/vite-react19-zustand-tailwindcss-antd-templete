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
import CesiumEarth from "@/components/simple-earth/CesiumEarth";

interface MapPreviewProps {
  outputMapView?: (map: L.Map) => void;
}
const tdtKey = "e6372a5333c4bac9b9ef6097453c3cd6";
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
  // 在组件内部添加状态
  const [currentMapMode, setCurrentMapMode] = useState<"2d" | "3d">("2d");
  const mapRef = useRef(null);
  // 保存图层引用
  const vLayerRef = useRef<any>(null);
  const vLabelLayerRef = useRef<any>(null);
  const vEarthLabelRef = useRef<any>(null);
  // 经纬度信息
  const [lnglat, setLngLat] = useState<any>(null);
  // 存储从3D地球传来的位置信息
  const [earthPosition, setEarthPosition] = useState<{
    lng: number;
    lat: number;
    zoom: number;
  } | null>(null);
  // 保存当前选中的底图类型
  const [selectedBaseLayer, setSelectedBaseLayer] = useState<string>("地图");
  const baseLayers = [
    {
      name: "地形",
      type: "2d" as const,
      positionStyle: {
        backgroundPosition: "-1px -1px",
        transform: "translateX(180px)",
        width: "0px", // 修改宽度
      },
    },
    {
      name: "地球",
      type: "3d" as const,
      positionStyle: {
        backgroundPosition: "-1px -181px",
        transform: "translateX(90px)",
        width: "0px",
      },
    },
    {
      name: "地图",
      type: "2d" as const,
      positionStyle: { backgroundPosition: "-1px -61px", width: "86px" },
    },
  ];

  function mouseMoveFun(e: any) {
    setLngLat(e.latlng);
  }

  // 清除绘制信息和所选择的行政区划信息
  function clearDrawAndDistrict() {}

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
      maxZoom: 18,
      attributionControl: false,
      zoomControl: true, // 默认情况下，是否将 zoom 缩放控件添加到地图中。
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
    if (mapView) {
      // 获取到地图后，触发事件：
      // 事件1: 添加地图比例尺工具条
      mapScaleControl = addScaleControl(mapView);

      // 事件2：添加mousemove事件
      mapView.on("mousemove", throttle(mouseMoveFun, 500));
    }
    return () => {
      mapScaleControl && mapScaleControl.remove();
      // 清理图层
      if (mapView) {
        if (vLayerRef.current) mapView.removeLayer(vLayerRef.current);
        if (vLabelLayerRef.current) mapView.removeLayer(vLabelLayerRef.current);
        if (vEarthLabelRef.current) mapView.removeLayer(vEarthLabelRef.current);
      }
    };
  }, [mapView]);

  // 根据当前地图模式切换图层
  useEffect(() => {
    if (!mapView) return;

    // 地形渲染
    // leaflet API:
    // 天地图地址： http://t0.tianditu.gov.cn/ter_w/wmts?tk=您的密钥
    const imageURL3 = `https://t1.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=9d3512a6ad161b05ac68a7fecf05b119`;

    // 移除所有图层
    if (vLayerRef.current) {
      mapView.removeLayer(vLayerRef.current);
      vLayerRef.current = null;
    }
    if (vEarthLabelRef.current) {
      mapView.removeLayer(vEarthLabelRef.current);
      vEarthLabelRef.current = null;
    }
    if (vLabelLayerRef.current) {
      mapView.removeLayer(vLabelLayerRef.current);
      vLabelLayerRef.current = null;
    }

    // 根据选中的底图类型加载相应图层
    if (selectedBaseLayer === "地图") {
      // 加载矢量底图
      const imageURL2 = `https://t1.tianditu.gov.cn/DataServer?T=ibo_w&x={x}&y={y}&l={z}&tk=9d3512a6ad161b05ac68a7fecf05b119`;
      vLayerRef.current = L.tileLayer(imageURL2, mapStyle);
      vLayerRef.current.addTo(mapView);

      // 加载矢量注记
      const vLabelUrl = `https://t1.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=9d3512a6ad161b05ac68a7fecf05b119`;
      vLabelLayerRef.current = L.tileLayer(vLabelUrl, mapStyle);
      vLabelLayerRef.current.addTo(mapView);
    } else if (selectedBaseLayer === "地形") {
      // 加载地形图层
      vEarthLabelRef.current = L.tileLayer(imageURL3, mapStyle);
      vEarthLabelRef.current.addTo(mapView);

      // 加载矢量注记
      const vLabelUrl = `https://t1.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=9d3512a6ad161b05ac68a7fecf05b119`;
      vLabelLayerRef.current = L.tileLayer(vLabelUrl, mapStyle);
      vLabelLayerRef.current.addTo(mapView);
    }
  }, [selectedBaseLayer, mapView]);

  // 处理3D地球位置变化
  const handleEarthViewChange = (position: {
    lng: number;
    lat: number;
    zoom: number;
  }) => {
    setEarthPosition(position);
  };

  // 当模式切换到2D并且有地球位置信息时，立即应用位置
  useEffect(() => {
    if (currentMapMode === "2d" && earthPosition && mapView) {
      mapView.setView(
        [earthPosition.lat, earthPosition.lng],
        earthPosition.zoom
      );
    }
  }, [currentMapMode, earthPosition, mapView]);

  const handleMapModeChange = (mode: "2d" | "3d", layerName?: string) => {
    setCurrentMapMode(mode);
    if (layerName) {
      setSelectedBaseLayer(layerName);
    }
  };
  // 实时打印当前地图的zoom和center
  useEffect(() => {
    if (!mapView) return;
    mapView.on("moveend", () => {
      console.log("zoom:", mapView.getZoom());
      console.log("center:", mapView.getCenter());
    });
  }, [mapView]);
  return (
    <div className="map-container">
      {/* 待加入内容：
                1: 地图底图、以及底图切换
                2: 放大缩小工具条、绘制点、线、矩形、圆、多边
                3: 面积测量
             */}
      <div
        className="sample-check-edit-map"
        ref={mapRef}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#eee",
          display: currentMapMode === "2d" ? "block" : "none",
        }}
      ></div>
      {/* 工具条1: 底图切换 */}
      <div className="layerList">
        {baseLayers.map((layer: any, idx: number) => {
          return (
            <div
              className={`layerItem ${
                selectedBaseLayer === layer.name ? "active" : ""
              }`}
              key={`baselayer_${idx}`}
              style={layer.positionStyle}
              onClick={() => handleMapModeChange(layer.type, layer.name)}
            >
              <div className="layerName">{layer.name}</div>
            </div>
          );
        })}
      </div>
      <CesiumEarth
        enabled={currentMapMode === "3d"}
        leafletMap={mapView}
        onViewChange={handleEarthViewChange}
      />
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
