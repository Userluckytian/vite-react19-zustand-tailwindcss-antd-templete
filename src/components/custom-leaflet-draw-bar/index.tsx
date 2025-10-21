import React, { Activity, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import CustomIcon from '../custom-icon';
import { App, Divider } from 'antd';
import { circle } from '@turf/turf';
import * as L from 'leaflet';
import { DrawGeometryService } from './drawgeometryservice';
import './index.scss';
interface CustomLeafLetDrawBarProps {
    mapInstance: L.Map; // 传入的地图实例
    drawGeoJsonResult?: (result: any) => void; // 绘制结果吐出
    drawStatus?: (status: boolean) => void; // 绘制状态吐出
}
function CustomLeafLetDrawBar(props: CustomLeafLetDrawBarProps, ref: any) {
    const { message } = App.useApp();
    const { mapInstance, drawGeoJsonResult, drawStatus } = props;
    // 优化： 是否有必要定义成 state 变量？
    const [toolbarList, setToolBarList] = useState<any>([
        {
            id: 'polygon', // draw_polygon
            title: '标点',
            icon: 'icon-biaodian_1',
            type: 'polygon',
            desp: '标点'
        },
        {
            id: 'polygon', // draw_polygon
            title: '标线',
            icon: 'icon-biaoxian_1',
            type: 'polygon',
            desp: '标线'
        },
        {
            id: 'polygon', // draw_polygon
            title: '标面',
            icon: 'icon-biaomian_0',
            type: 'polygon',
            desp: '标面'
        },
        {
            id: 'circle', // drag_circle
            title: '画圆',
            icon: 'icon-huayuan_0',
            type: 'circle',
            desp: '画圆'
        },
        {
            id: 'bbox', // draw_rectangle
            title: '画矩形',
            icon: 'icon-huajuxing_0',
            type: 'bbox',
            desp: '画矩形'
        },
        {
            id: 'measure_distance', // drag_circle
            title: '测距',
            icon: 'icon-ceju_0',
            type: 'circle',
            desp: '测距'
        },
        {
            id: 'measure_area', // draw_rectangle
            title: '测面',
            icon: 'icon-cemian_0',
            type: 'bbox',
            desp: '测面'
        },
        {
            id: 'delete',
            title: '清空',
            type: 'delete',
            icon: 'icon-shanchu_0',
            desp: '清空绘制和查询内容'
        }
    ]
    )
    const [currSelTool, setCurrSelTool] = useState<string | null>(null);
    const currSelToolId = useRef<string | null>(currSelTool);
    const drawServiceObj = useRef<DrawGeometryService | null>(null);
    const [tempCoords, setTempCoords] = useState<L.LatLng[]>([]);
    const tempCoordinates = useRef<L.LatLng[]>(tempCoords);
    const [startDraw, setStartDraw] = useState<boolean>(false);
    const isDrawing = useRef<boolean>(startDraw);
    const lastMouseMoveTime = useRef<number>(0);
    const mouseMoveThrottle = 50; // 毫秒!
    const km_value = 1000; // 1千米 = 1000米
    useEffect(() => {
        isDrawing.current = startDraw;
        // 吐出绘制状态信息
        drawStatus && drawStatus(startDraw);
    }, [startDraw])
    useEffect(() => {
        currSelToolId.current = currSelTool;
    }, [currSelTool])
    useEffect(() => {
        tempCoordinates.current = tempCoords;
    }, [tempCoords])
    // 地图点击事件
    const handleMapClick = (e: L.LeafletMouseEvent) => {
        // 如果不是绘制行为，地图不做任何处理。
        if (!currSelToolId.current || currSelToolId.current === 'delete') {
            return;
        }
        // 开始绘制
        if (isDrawing.current) {
            // 存储
            setTempCoords((prev) => {
                const newCoords = [...prev, e.latlng];
                tempCoordinates.current = newCoords;  // 手动同步，主要是不想执行页面渲染是吗?
                return newCoords;
            })
            // console.log('坐标，当前激活按钮', tempCoordinates.current, currSelToolId.current);
            // 开始校验
            if (currSelToolId.current === 'bbox' || currSelToolId.current === 'circle') {
                if (tempCoordinates.current.length === 2) {
                    // 关闭绘制功能 + 渲染最终图层 + 清空存储的坐标信息(可不做)
                    setStartDraw(false);
                    renderLayerByType(currSelToolId.current);
                }
            }
            // 多边形绘制时，继续添加点（这里什么也不需要做）
            if (currSelToolId.current === 'polygon') { }
        }
    };
    // 地图双击事件
    const handleMapDoubleClick = (e: L.LeafletMouseEvent) => {
        // 双击一定关闭绘制状态
        setStartDraw(false);
        // 开始处理绘制样式
        if (!isDrawing.current || currSelToolId.current === 'delete') {
            // 重置绘制状态
            return;
        }
        renderLayerByType(currSelToolId.current!);
    };
    const renderLayerByType = (type: string) => {
        // 检查是否有足够的点
        switch (type) {
            case 'bbox':
                const rectIsValid = tempCoordinates.current.length >= 2;
                const rectLayer = drawServiceObj.current!.getLayerByType(type);
                if (rectIsValid && rectLayer) {
                    const bounds = L.latLngBounds(tempCoordinates.current);
                    (rectLayer as any).setBounds(bounds);
                    // 发出消息
                    const geoJSON = (rectLayer as any).toGeoJSON();
                    drawGeoJsonResult && drawGeoJsonResult(geoJSON);
                } else {
                    message.error('没有找到矩图层或者点位数量不足，不足以绘制图层。');
                }
                break;
            case 'circle':
                const circleIsValid = tempCoordinates.current.length >= 2;
                const circleLayer = drawServiceObj.current!.getLayerByType(type);
                if (circleIsValid && circleLayer) {
                    const center = tempCoordinates.current[0];
                    const radius = center.distanceTo(tempCoordinates.current[1]);
                    (circleLayer as any).setLatLng(center);
                    (circleLayer as any).setRadius(radius);
                    // 发出消息(圆需要自己定制吐出的结构)
                    const lnglat = [center.lng, center.lat];
                    const options: any = { steps: 64, units: 'kilometers', properties: { type: 'circle' } };
                    const geojson = circle(lnglat, radius / km_value, options); // 获取图形！
                    drawGeoJsonResult && drawGeoJsonResult(geojson);
                } else {
                    message.error('没有找到圆图层或者点位数量不足，不足以绘制图层。');
                }
                break;
            case 'polygon':
                const polygonIsValid = tempCoordinates.current.length >= 3;
                const polygonLayer = drawServiceObj.current!.getLayerByType(type);
                if (polygonIsValid && polygonLayer) {
                    (polygonLayer as any).setLatLngs(tempCoordinates.current);
                    // 发出消息
                    const geoJSON = (polygonLayer as any).toGeoJSON();
                    drawGeoJsonResult && drawGeoJsonResult(geoJSON);
                } else {
                    message.error('没有找到面图层或者点位数量不足，不足以绘制图层。');
                }
                break;
        }
        mapInstance.getContainer().style.cursor = 'grab';
    }
    // 鼠标移动事件（带节流）
    const handleMouseMove = (e: L.LeafletMouseEvent) => {
        if (!isDrawing.current || !currSelToolId.current || currSelToolId.current === 'delete') return;
        const now = Date.now();
        if (now - lastMouseMoveTime.current < mouseMoveThrottle) return;
        lastMouseMoveTime.current = now;
        // 更新临时坐标
        const coordsLength = tempCoordinates.current.length;
        if (coordsLength > 0) {
            // 对于矩形和圆形，只需要两个点
            const bboxCircleEnter = ['bbox', 'circle'].includes(currSelToolId.current);
            if (bboxCircleEnter) {
                tempCoordinates.current[1] = e.latlng;
            }
            if (['polygon'].includes(currSelToolId.current)) {
                setTempCoords((prev: any[]) => {
                    if (prev.length > 1) {
                        prev.splice(coordsLength - 1, 1);
                    }
                    const newCoords = [...prev, e.latlng];
                    return [...newCoords];
                })
            }
            updateTempLayer();
        }
    };
    // 更新临时图层
    const updateTempLayer = () => {
        if (tempCoordinates.current.length < 1) return;
        const layer = drawServiceObj.current!.getLayerByType(currSelToolId.current!);
        switch (currSelToolId.current!) {
            case 'bbox':
                if (tempCoordinates.current.length >= 2) {
                    const bounds = L.latLngBounds(tempCoordinates.current);
                    if (layer) (layer as any).setBounds(bounds);
                }
                break;
            case 'circle':
                if (tempCoordinates.current.length >= 2) {
                    const center = tempCoordinates.current[0];
                    const radius = center.distanceTo(tempCoordinates.current[1]);
                    if (layer) {
                        (layer as any).setLatLng(center);
                        (layer as any).setRadius(radius);
                    }
                }
                break;
            case 'polygon':
                if (layer) {
                    const polygonCoords = [...tempCoordinates.current, tempCoordinates.current[0]];
                    (layer as any).setLatLngs(polygonCoords);
                }
                break;
        }
    };
    // 工具按钮点击
    const handleToolClick = (toolId: string) => {
        const newSelected = currSelToolId.current === toolId ? null : toolId;
        // 清除当前绘制内容（如果有）
        drawServiceObj.current!.clearAll();
        // 之前存储的坐标也清空
        setTempCoords([]);
        // 切换工具 并激活绘制状态
        if (!newSelected || newSelected === 'delete') {
            setStartDraw(false);
            setCurrSelTool(null);
            drawGeoJsonResult && drawGeoJsonResult(null);
            return;
        }
        // 继续绘制的事情呗
        setStartDraw(newSelected ? true : false);
        mapInstance.getContainer().style.cursor = 'crosshair';
        setCurrSelTool(newSelected);
    };
    const clearAllIfExist = () => {
        // 清除当前绘制内容（如果有）
        if (drawServiceObj.current) {
            drawServiceObj.current.clearAll();
        }
        setTempCoords([]);
        setStartDraw(false);
        setCurrSelTool(null);
    }
    const destory = () => {
        clearAllIfExist();
        // 组件卸载时清理事件
        if (mapInstance) {
            mapInstance.off('click', handleMapClick);
            mapInstance.off('dblclick', handleMapDoubleClick);
            mapInstance.off('mousemove', handleMouseMove);
            // 认清组件定义，我是组件，我管这些？当然是不管啦！
            // mapInstance.remove(); 
        }
    }
    // 把子组件方法暴露出去  一定注意要把组件的第二个参数ref传递进来
    useImperativeHandle(ref, () => ({
        destory
    }));
    // 初始化绘制服务
    useEffect(() => {
        if (mapInstance) {
            drawServiceObj.current = new DrawGeometryService(mapInstance);
            mapInstance.on('click', handleMapClick);
            mapInstance.on('dblclick', handleMapDoubleClick);
            mapInstance.on('mousemove', handleMouseMove);
        }
        return () => {
            /*
                组件销毁必然走这里啊，你怪谁呢？
                【标样中心-样本查询】查询触发后，显示查询结果内容，但是你的【查询条件面板】被销毁了呀！我必然进来！
                疑问： 但为啥框选和多边不被销毁？
                答复：已排查，那是因为没有查询到结果的话，【查询条件面板】不会直接跳到【查询结果面板】，此时组件还没销毁， 你要不试试查询出来结果呢，保证分分钟干死你！;
            */
            destory();
        };
    }, [mapInstance]);
    return (
        <div className="leaflet-draw-toolbar">
            {toolbarList.map((tool: any, idx: number) => (
                <>
                    <div
                        key={tool.id}
                        className={`tool-button ${currSelTool === tool.id ? 'selected' : ''}`}
                        title={tool.desp}
                        onClick={() => handleToolClick(tool.id)}
                    >
                        <CustomIcon type={tool.icon} className={currSelTool === tool.id ? 'activeItem' : 'defaulted'}></CustomIcon>
                        {/* {tool.title && <span>{tool.title}</span>} */}
                    </div>
                    <Activity mode={idx !== toolbarList.length ? 'visible' : 'hidden'}>
                        <Divider type="horizontal" style={{ margin: '0px' }} />
                    </Activity>
                </>
            ))}
        </div>
    );
}
// 一定要用forwardRef包裹
export default React.forwardRef(CustomLeafLetDrawBar)