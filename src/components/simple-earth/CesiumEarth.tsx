// components/CesiumEarth.tsx
import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import * as L from "leaflet";
interface CesiumEarthProps {
  enabled: boolean;
  leafletMap: L.Map | null;
  onViewChange?: (position: { lng: number; lat: number; zoom: number }) => void;
}
// 确保Cesium的静态文件可以被正确加载
(window as any).CESIUM_BASE_URL = "/node_modules/cesium/Build/Cesium/";
const CesiumEarth: React.FC<CesiumEarthProps> = ({
  enabled,
  leafletMap,
  onViewChange,
}) => {
  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const pointsRef = useRef<Cesium.Entity[]>([]);
  const BASE_MAPS = [
    {
      name: "天地图影像层",
      url: "https://t1.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=9d3512a6ad161b05ac68a7fecf05b119",
      url_4326:
        "https://t1.tianditu.gov.cn/DataServer?T=img_c&x={x}&y={y}&l={z}&tk=9d3512a6ad161b05ac68a7fecf05b119",
      zoomOffset: 1,
      minZoom: 1, // 最小层级
      maxZoom: 22,
      zIndex: -2,
      visible: true,
    },
    {
      name: "天地图行政区划",
      url: "https://t1.tianditu.gov.cn/DataServer?T=ibo_w&x={x}&y={y}&l={z}&tk=9d3512a6ad161b05ac68a7fecf05b119",
      url_4326:
        "https://t1.tianditu.gov.cn/DataServer?T=ibo_c&x={x}&y={y}&l={z}&tk=9d3512a6ad161b05ac68a7fecf05b119",
      zoomOffset: 1,
      minZoom: 1, // 最小层级
      maxZoom: 22,
      zIndex: 2,
      visible: true,
    },
    {
      name: "天地图影像注记",
      url: "https://t1.tianditu.gov.cn/DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=9d3512a6ad161b05ac68a7fecf05b119",
      url_4326:
        "https://t1.tianditu.gov.cn/DataServer?T=cia_c&x={x}&y={y}&l={z}&tk=9d3512a6ad161b05ac68a7fecf05b119",
      zoomOffset: 1,
      minZoom: 1, // 最小层级
      maxZoom: 22,
      zIndex: 3,
      visible: true,
    },
  ];
  function addBaseMap(viewer: Cesium.Viewer) {
    BASE_MAPS.forEach((item: any, idx: number) => {
      if (item && item.url) {
        const imageProvider = new Cesium.UrlTemplateImageryProvider({
          url: item.url,
          minimumLevel: item.minZoom,
          maximumLevel: item.maxZoom,
        });
        let imagery = viewer.imageryLayers.addImageryProvider(imageProvider);
        if (idx === 0) {
          // imagery.hue = 3;
          // imagery.contrast = 2.2;
        }
      }
    });
  }
  // 生成固定的大量测试点（只生成一次）
  const generateAllPoints = () => {
    const points = [];
    const pointCount = 200; // 生成200个点

    for (let i = 0; i < pointCount; i++) {
      points.push({
        id: `point-${i}`,
        lon: 116.3 + Math.random() * 0.5, // 北京周边
        lat: 39.8 + Math.random() * 0.4,
      });
    }
    return points;
  };

  // 使用useRef保存所有点数据，避免重复生成
  const allPointsRef = useRef(generateAllPoints());

  // 根据距离聚合点
  const clusterPointsByDistance = (points: any[], distance: number) => {
    const clusteredPoints = [];

    if (distance < 5000) {
      // 近距离：不聚合，显示所有点
      return points;
    } else if (distance < 20000) {
      // 中距离：每2个点聚合为1个
      for (let i = 0; i < points.length; i += 2) {
        if (i + 1 < points.length) {
          // 取两个点的中心位置
          const centerLon = (points[i].lon + points[i + 1].lon) / 2;
          const centerLat = (points[i].lat + points[i + 1].lat) / 2;
          clusteredPoints.push({
            ...points[i],
            lon: centerLon,
            lat: centerLat,
            clusterCount: 2, // 标记聚合了多少个点
          });
        } else {
          clusteredPoints.push(points[i]);
        }
      }
      return clusteredPoints;
    } else if (distance < 50000) {
      // 中远距离：每5个点聚合为1个
      for (let i = 0; i < points.length; i += 5) {
        if (i + 4 < points.length) {
          let totalLon = 0,
            totalLat = 0;
          for (let j = 0; j < 5; j++) {
            totalLon += points[i + j].lon;
            totalLat += points[i + j].lat;
          }
          clusteredPoints.push({
            ...points[i],
            lon: totalLon / 5,
            lat: totalLat / 5,
            clusterCount: 5,
          });
        }
      }
      return clusteredPoints;
    } else {
      // 远距离：每10个点聚合为1个
      for (let i = 0; i < points.length; i += 10) {
        if (i + 9 < points.length) {
          let totalLon = 0,
            totalLat = 0;
          for (let j = 0; j < 10; j++) {
            totalLon += points[i + j].lon;
            totalLat += points[i + j].lat;
          }
          clusteredPoints.push({
            ...points[i],
            lon: totalLon / 10,
            lat: totalLat / 10,
            clusterCount: 10,
          });
        }
      }
      return clusteredPoints;
    }
  };

  // 清除所有点
  const clearAllPoints = () => {
    if (!viewerRef.current) return;
    pointsRef.current.forEach((point) => {
      viewerRef.current!.entities.remove(point);
    });
    pointsRef.current = [];
  };
  // 根据距离显示不同数量的点
  const updatePointsByDistance = (distance: number) => {
    if (!viewerRef.current) return;

    clearAllPoints();

    const allPoints = allPointsRef.current;
    const clusteredPoints = clusterPointsByDistance(allPoints, distance);

    let iconSize = 32;

    // 根据聚合程度调整图标大小
    if (distance < 5000) {
      iconSize = 20; // 近距离：小图标，显示详细
    } else if (distance < 20000) {
      iconSize = 30; // 中距离：中等图标
    } else if (distance < 50000) {
      iconSize = 40; // 中远距离：大图标
    } else {
      iconSize = 50; // 远距离：最大图标
    }

    // 添加聚合点到地图
    clusteredPoints.forEach((point) => {
      const entity = viewerRef.current!.entities.add({
        position: Cesium.Cartesian3.fromDegrees(point.lon, point.lat),
        billboard: {
          image: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
          width: iconSize,
          height: iconSize,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        },
        // 添加标签显示聚合数量（如果是聚合点）
        label:
          point.clusterCount > 1
            ? {
                text: point.clusterCount.toString(),
                font: "14px sans-serif",
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                pixelOffset: new Cesium.Cartesian2(0, 0),
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                showBackground: true,
                backgroundColor: Cesium.Color.fromCssColorString("#FF4444"),
                backgroundPadding: new Cesium.Cartesian2(6, 6),
                verticalOrigin: Cesium.VerticalOrigin.CENTER,
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                scale: 0.8,
              }
            : undefined,
      });
      pointsRef.current.push(entity);
    });

    console.log(
      `距离: ${Math.round(distance)}米, 显示点: ${clusteredPoints.length}/${
        allPoints.length
      }`
    );
  };
  useEffect(() => {
    if (!enabled || !cesiumContainerRef.current) return;

    // 初始化 Cesium  Viewer
    const viewer = new Cesium.Viewer(cesiumContainerRef.current, {
      // terrain: Terrain.fromWorldTerrain(),
      infoBox: false, //启用信息框
      sceneModePicker: false, // 隐藏视图模式选择器
      timeline: false, // 隐藏时间线
      navigationHelpButton: false, // 隐藏帮助按钮
      selectionIndicator: false, // 隐藏选择指示器
      scene3DOnly: false, // 仅使用 3D 模式
      animation: false,
      baseLayerPicker: false,
      homeButton: false, // 隐藏主页按钮
      geocoder: false, // 隐藏地名查询框
      fullscreenButton: false, // 隐藏全屏按钮
      creditContainer: document.createElement("div"), // 创建一个空的DIV来替代版权信息,
    });

    // 启用深度检测，让地球更真实
    viewer.scene.globe.depthTestAgainstTerrain = true;

    viewerRef.current = viewer;
    // 添加天地图影像层和行政区划层
    addBaseMap(viewer);

    // 同步 Leaflet 地图的视图到 Cesium
    if (leafletMap) {
      const center = leafletMap.getCenter();
      const zoom = leafletMap.getZoom();

      // 将 Leaflet 的缩放级别转换为 Cesium 的高度
      const height = 13000000 / Math.pow(2, zoom - 4);

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          center.lng,
          center.lat,
          height
        ),
        orientation: {
          heading: 0.0,
          pitch: -Math.PI / 2, // 从上往下看
          roll: 0.0,
        },
      });
    }
    // 监听相机移动，更新点显示
    viewerRef.current.camera.moveEnd.addEventListener(() => {
      const camera = viewerRef.current!.camera;
      const height = camera.positionCartographic.height; // 相机高度
      updatePointsByDistance(height);
    });

    // 初始显示
    setTimeout(() => {
      const initialHeight =
        viewerRef.current!.camera.positionCartographic.height;
      updatePointsByDistance(initialHeight);
    }, 1000);
    return () => {
      // 当从3D切换回2D时，获取当前地球位置并传递给父组件
      if (viewerRef.current && onViewChange) {
        const camera = viewerRef.current.camera;
        const position = camera.positionCartographic;
        if (Cesium.defined(position)) {
          // 计算对应的zoom级别（反向转换高度到zoom）
          const height = Cesium.Cartographic.fromCartesian(
            camera.position
          ).height;
          const zoom = 4 + Math.log2(13000000 / height);

          onViewChange({
            lng: Cesium.Math.toDegrees(position.longitude),
            lat: Cesium.Math.toDegrees(position.latitude),
            zoom: Math.round(zoom),
          });
        }
      }

      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [enabled, leafletMap]);

  useEffect(() => {
    if (!enabled || !leafletMap || !viewerRef.current) return;

    // 同步 Leaflet 地图变化到 Cesium
    const syncToCesium = () => {
      const center = leafletMap.getCenter();
      const zoom = leafletMap.getZoom();
      const height = 13000000 / Math.pow(2, zoom - 4);

      viewerRef.current!.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          center.lng,
          center.lat,
          height
        ),
        orientation: {
          heading: 0.0,
          pitch: -Math.PI / 2,
          roll: 0.0,
        },
      });
    };

    leafletMap.on("move", syncToCesium);
    leafletMap.on("zoom", syncToCesium);

    return () => {
      leafletMap.off("move", syncToCesium);
      leafletMap.off("zoom", syncToCesium);
    };
  }, [enabled, leafletMap]);

  if (!enabled) return null;

  return (
    <div
      ref={cesiumContainerRef}
      className="cesium-earth"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 500,
      }}
    />
  );
};

export default CesiumEarth;
