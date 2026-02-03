import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// 引入leaflet-side-by-side样式
import "leaflet-side-by-side";
import { createRoot } from "react-dom/client";
import { Button } from "antd";

const QualityMapContainer: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [zoom, setZoom] = useState(webConfig.BaseMapSeting.zoom);
  const _leftLayersGroupRef = useRef<L.LayerGroup | null>(null);
  const _rightLayersGroupRef = useRef<L.LayerGroup | null>(null);
  const sideCtrl = useRef<any>(null);
  const updatePaneClipRef = useRef<(() => void) | null>(null);

  const addSplitLayer = (map: L.Map) => {
    map.createPane("leftPane").style.zIndex = "450";
    map.createPane("rightPane").style.zIndex = "450";
    // 添加底图和对比图层
    if (layersConfig.base) {
      const allLayers: any = [];
      // 批量添加左侧图层到LayerGroup
      layersConfig.leftOne.forEach(({ metaId, fromId, geom }) => {
        const tempLayer = L.tileLayer(
          `${webConfig.tileUrl}/tile/service/mergeView?x={x}&y={y}&l={z}&metaId=${metaId}&tk=${webConfig.tk}&fromId=${fromId}`,
          {
            pane: "leftPane",
            maxNativeZoom: 19,
          },
        );
        const geomLayer = L.geoJSON(JSON.parse(geom), {
          style: {
            color: "red",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.5,
          },
          pane: "leftPane",
        });
        allLayers.push(tempLayer);
        allLayers.push(geomLayer);
      });

      const baseLayer = L.tileLayer(layersConfig.base.mapUrl, {
        maxZoom: 18,
        // zIndex: 1,
        pane: "rightPane",
      });
      const leftGroup = L.layerGroup(allLayers).addTo(map);
      _leftLayersGroupRef.current = leftGroup;
      const rightGroup = L.layerGroup([]).addTo(map);
      _rightLayersGroupRef.current = rightGroup;
      // 添加分屏对比控件
      sideCtrl.current = (L.control as any)
        .sideBySide(leftGroup.getLayers(), rightGroup.getLayers())
        .addTo(map);

      // 对 leftPane/rightPane 做裁剪，使左侧内容（含标记）仅在卷帘左侧显示，与 leaflet-side-by-side 库一致：clipX 用图层坐标 nw.x + getPosition()
      const updatePaneClip = () => {
        const ctrl = sideCtrl.current;
        if (!ctrl?._map) return;
        const m = ctrl._map;
        const nw = m.containerPointToLayerPoint([0, 0]);
        const se = m.containerPointToLayerPoint(m.getSize());
        const clipX = nw.x + ctrl.getPosition();
        const clipLeft = `rect(${nw.y}px, ${clipX}px, ${se.y}px, ${nw.x}px)`;
        const clipRight = `rect(${nw.y}px, ${se.x}px, ${se.y}px, ${clipX}px)`;
        const leftPane = m.getPane("leftPane");
        const rightPane = m.getPane("rightPane");
        if (leftPane) leftPane.style.clip = clipLeft;
        if (rightPane) rightPane.style.clip = clipRight;
      };
      updatePaneClipRef.current = updatePaneClip;
      sideCtrl.current.on("dividermove", updatePaneClip);
      map.on("move", updatePaneClip);
      updatePaneClip();
    }
  };

  // 使用useMemo缓存图层配置，避免重复计算
  const layersConfig = useMemo(
    () => ({
      base: webConfig.baseMapList.find((item: any) => item.checked),
      leftOne: [
        {
          metaId: 1867587237834816,
          fromId: 202503,
          geom: '{"type":"Polygon","coordinates":[[[115.796,40.4934],[116.377,40.3945],[116.236,39.9146],[115.659,40.0129],[115.796,40.4934]]]}',
        },
      ],
      leftTwo: [
        {
          metaId: 1867587242922048,
          fromId: 202503,
          geom: '{\"type\":\"Polygon\",\"coordinates\":[[[115.683,40.0986],[116.261,39.9999],[116.121,39.5199],[115.547,39.618],[115.683,40.0986]]]}',
        },
      ],
    }),
    [],
  );

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    // 初始化地图
    const map = L.map(mapRef.current, {
      zoomControl: false,
      doubleClickZoom: false,
      attributionControl: false,
      crs: L.CRS.EPSG4326,
    }).setView(
      webConfig.BaseMapSeting.center as L.LatLngExpression,
      webConfig.BaseMapSeting.zoom,
    );
    map.invalidateSize();
    addSplitLayer(map);
    // 缩放监听
    const handleZoom = () => setZoom(map.getZoom());
    map.on("zoomend", handleZoom);
    L.control.zoom({ position: "topleft" }).addTo(map);
    mapInstanceRef.current = map;
    // 清理函数
    return () => {
      const ctrl = sideCtrl.current;
      const fn = updatePaneClipRef.current;
      if (ctrl && fn) {
        ctrl.off("dividermove", fn);
        map.off("move", fn);
        const leftPane = map.getPane("leftPane");
        const rightPane = map.getPane("rightPane");
        if (leftPane) leftPane.style.clip = "";
        if (rightPane) rightPane.style.clip = "";
      }
      map.off("zoomend", handleZoom);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [layersConfig]); // 依赖稳定的config

  return (
    <div
      ref={mapRef}
      style={{ height: "100%", width: "100%", position: "relative" }}
    >
      <Button
        style={{
          position: "absolute",
          top: "10px",
          left: "60px",
        }}
        onClick={() => {
          layersConfig.leftTwo.forEach(({ metaId, fromId, geom }) => {
            const tempLayer = L.tileLayer(
              `${webConfig.tileUrl}/tile/service/mergeView?x={x}&y={y}&l={z}&metaId=${metaId}&tk=${webConfig.tk}&fromId=${fromId}`,
              {
                pane: "leftPane",
                maxNativeZoom: 19,
              },
            );
            const geomLayer = L.geoJSON(JSON.parse(geom), {
              style: {
                color: "red",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.5,
              },
              pane: "leftPane",
            });
            _leftLayersGroupRef.current?.addLayer(tempLayer);
            _leftLayersGroupRef.current?.addLayer(geomLayer);
          });
        }}
      >
        添加标记点到左侧图层
      </Button>
    </div>
  );
};

export default QualityMapContainer;
