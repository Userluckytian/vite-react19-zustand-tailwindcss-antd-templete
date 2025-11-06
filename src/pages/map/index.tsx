
/*
    安装说明:
    1：npm install leaflet webgis-maps @types/leaflet
    2：会发现报错:mapboxgl相关的错误
    3：npm install mapbox-gl@2 @types/mapbox-gl@2  // 安装2.x版本的mapboxgl
*/
import * as L from 'leaflet';
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import './index.scss';
import { GlobalContext } from '@/main'
import { addScaleControl, addZoomControl } from './map-utils';
import { formatNumber, throttle } from '@/utils/utils';
import { App } from 'antd';
import { addLeafletGeoJsonLayer, bingGeojsonLayerEditEvent } from '@/utils/leafletUtils';
import CustomLeafLetDraw from '@/components/custom-leaflet-draw';

interface MapPreviewProps {
    outputMapView?: (map: L.Map) => void;
}
const tdtKey = 'e6372a5333c4bac9b9ef6097453c3cd6';
export default function SampleCheckEditMap({
    outputMapView,
}: MapPreviewProps) {

    const mapStyle: any = {
        attribution: "stamen",
        subdomains: '01234567',
        maxZoom: 18,
        tileSize: 256
    };
    const { message } = App.useApp();
    const globalConfigContext = useContext(GlobalContext);
    const baseMapSetting = globalConfigContext.baseMapSetting;
    const [mapView, setMapView] = useState<L.Map | null>(null);

    const mapRef = useRef(null)
    // 经纬度信息
    const [lnglat, setLngLat] = useState<any>(null);

    const baseLayers = [
        {
            name: '地图',
            positionStyle: {
                backgroundPosition: '-1px -1px',
                transform: 'translateX(180px)',
                width: '0px',
            }
        },
        {
            name: '地球',
            positionStyle: {
                backgroundPosition: '-1px -181px',
                transform: 'translateX(90px)',
                width: '0px',
            }
        },
        {
            name: '地形',
            positionStyle: { backgroundPosition: '-1px -61px', width: '86px' }
        }
    ]

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

        </div>
    )
}
