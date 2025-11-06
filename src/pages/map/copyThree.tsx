import { useContext, useEffect, useRef, useState } from "react";
import "./index.scss";
import { GlobalContext } from "@/main";
import { formatNumber, throttle } from "@/utils/utils";
import { App, Checkbox } from "antd";
import { Map, NavigationControl } from "react-bmapgl";
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
  const { message } = App.useApp();
  const drawingManagerRef = useRef<any>(null);
  const globalConfigContext = useContext(GlobalContext);
  const baseMapSetting = globalConfigContext.baseMapSetting;
  const mapRef = useRef<any>(null);
  // 在组件顶部添加路网图层引用
  const roadNetLayerRef = useRef<any>(null);
  const [mapView, setMapView] = useState<any>(null);
  const [lnglat, setLngLat] = useState<any>(null);
  const [currentMapType, setCurrentMapType] = useState<MapType>("normal");
  const [currentDrawingType, setCurrentDrawingType] =
    useState<DrawingType>(null);
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
  // 初始化路网图层
  const initRoadNetLayer = (map: any) => {
    // 创建路网图层
    const roadNetLayer = new (window as any).BMapGL.TrafficLayer({
      predictDate: {
        hour: 12,
        minute: 0,
      },
    });
    roadNetLayerRef.current = roadNetLayer;
    return roadNetLayer;
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
      const map = mapRef.current.map;
      map.setZoom(map.getZoom() + 1);
    }
  };
  const zoomOut = () => {
    if (mapRef.current) {
      const map = mapRef.current.map;
      map.setZoom(map.getZoom() - 1);
    }
  };
  // 切换地图类型
  const switchMapType = (mapType: MapType) => {
    if (!mapView) return;
    setCurrentMapType(mapType);
    // 获取百度地图实例
    const map = mapRef.current.map;
    try {
      switch (mapType) {
        case "normal":
          // 普通地图 - 使用数字常量
          map.setMapType((window as any).BMAP_NORMAL_MAP || 1);
          map.setTilt(0); // 重置为2D视角
          break;
        case "earth":
          // 地球模式 - 使用数字常量
          map.setMapType((window as any).BMAP_EARTH_MAP || 2);
          map.setTilt(60); // 设置3D视角
          // 启用3D建筑（如果可用）
          if (map.enable3DBuilding) {
            map.enable3DBuilding();
          }
          break;
        case "satellite":
          // 卫星地图 - 使用数字常量
          map.setMapType((window as any).BMAP_SATELLITE_MAP || 3);
          map.setTilt(0); // 重置为2D视角
          break;
        case "panorama":
          // 添加全景图层
          map.addTileLayer(new (window as any).BMapGL.PanoramaCoverageLayer());
          // 添加全景控件
          const stCtrl = new (window as any).BMapGL.PanoramaControl();
          stCtrl.setOffset(new (window as any).BMapGL.Size(0, 0));
          map.addControl(stCtrl);
          // 可选：设置到有全景数据的位置
          map.centerAndZoom(
            new (window as any).BMapGL.Point(116.40385, 39.913795),
            18
          );
          break;
      }

      message.success(
        `已切换到${mapTypes.find((m) => m.key === mapType)?.name}`
      );
    } catch (error) {
      console.error("切换地图类型失败:", error);
      message.error("地图切换失败");
    }
  };
  // 使用数字常量直接设置地图类型（备选方案）
  const switchMapTypeWithNumbers = (mapType: MapType) => {
    if (!mapView) return;
    setCurrentMapType(mapType);
    const map = mapRef.current.map;
    // 百度地图类型常量对应的数字值
    const mapTypeConstants = {
      normal: 1, // BMAP_NORMAL_MAP
      earth: 2, // BMAP_EARTH_MAP
      //   satellite: 3, // BMAP_SATELLITE_MAP
      traffic: 3, // BMAP_PERSPECTIVE_MAP
    };
    try {
      map.setMapType(mapTypeConstants[mapType]);
      // 特殊处理地球模式
      if (mapType === "earth") {
        map.setTilt(60);
        if (map.enable3DBuilding) {
          map.enable3DBuilding();
        }
      } else {
        map.setTilt(0);
      }
      message.success(
        `已切换到${mapTypes.find((m) => m.key === mapType)?.name}`
      );
    } catch (error) {
      console.error("切换地图类型失败:", error);
      message.error("地图切换失败");
    }
  };
  // 百度地图的鼠标移动事件 - 获取当前鼠标位置的经纬度
  const handleMapMove = throttle((e: any) => {
    if (!mapRef.current) return;
    const map = mapRef.current.map;
    // 方法1: 通过地图中心点获取经纬度
    const center = map.getCenter();
    setLngLat({
      lng: center.lng,
      lat: center.lat,
    });
  }, 500);
  const handleCheck = (e: any, mapType: MapType) => {
    if (!mapRef.current || !roadNetLayerRef.current) return;
    //   首选如果当前地图类型和悬浮的底图类型相同就直接叠加或者移除路网
    if (mapType === currentMapType) {
      const map = mapRef.current.map;
      const roadNetLayer = roadNetLayerRef.current;
      // 判断当前按钮是否选中
      if (e.target.checked) {
        //   如果选中就叠加路网
        map.addTileLayer(roadNetLayer);
      } else {
        // 取消选中就移除路网
        // 移除路网
        map.removeTileLayer(roadNetLayer);
      }
    }
  };
  // 初始化百度地图
  useEffect(() => {
    if (mapRef.current && !mapView) {
      const map = mapRef.current.map;
      setMapView(map);
      outputMapView?.(map);
      // 初始化绘制工具
      initDrawingManager(map);
      // 初始化路网图层
      initRoadNetLayer(map);
      // 添加百度地图事件监听
      map.addEventListener("movestart", handleMapMove);
      map.addEventListener("moveend", handleMapMove);
      // 等待地图加载完成后设置初始地图类型
      setTimeout(() => {
        switchMapTypeWithNumbers("normal");
      }, 1000);
      return () => {
        if (mapView) {
          mapView.removeEventListener("movestart", handleMapMove);
          mapView.removeEventListener("moveend", handleMapMove);
        }
      };
    }
  }, [mapRef.current]);

  return (
    <div className="map-container">
      {/* 百度地图 - 通过外部控制地图类型 */}
      <Map
        ref={mapRef}
        center={{ lng: 116.402544, lat: 39.928216 }}
        zoom={11}
        style={{
          height: "calc(100vh - 80px)",
          width: "100vw",
        }}
        enableScrollWheelZoom={true} // 确保这个属性为 true
        // 设置鼠标可以拖动地图
        enableDragging={true}
      ></Map>
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
      <div className="drawing-control">
        <div className="control-header">
          <span className="title">绘制工具</span>
          {currentDrawingType && (
            <button className="stop-drawing-btn" onClick={stopDrawing}>
              退出绘制
            </button>
          )}
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
      </div>
      {/* 自定义缩放控件 */}
      <div className="custom-zoom-control">
        <button onClick={zoomIn} title="放大" className="custom-zoom-btn">
          +
        </button>
        <button onClick={zoomOut} title="缩小" className="custom-zoom-btn">
          -
        </button>
      </div>
    </div>
  );
}
