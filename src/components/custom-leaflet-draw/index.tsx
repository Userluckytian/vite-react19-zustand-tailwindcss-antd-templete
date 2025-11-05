import React, { Activity, Fragment, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import CustomIcon from '../custom-icon';
import { App, Divider } from 'antd';
import * as L from 'leaflet';
import './index.scss';
import MarkerPoint from './draw/markerPoint';
import LeafletLine from './draw/polyline';
import LeafletPolygon from './draw/polygon';
import LeafletCircle from './draw/circle';
import LeafletRectangle from './draw/rectangle';
import LeafletDistance from './measure/distance';
import LeafletArea from './measure/area';
import LeafletEditPolygon from './edit/polygon';
import { PolygonEditorState } from './types';
interface CustomLeafLetDrawProps {
    mapInstance: L.Map; // 传入的地图实例
    drawGeoJsonResult?: (result: any) => void; // 绘制结果吐出
    drawStatus?: (status: boolean) => void; // 绘制状态吐出
}
export default function CustomLeafLetDraw(props: CustomLeafLetDrawProps) {
    const { message } = App.useApp();
    const { mapInstance } = props;
    const [currSelTool, setCurrSelTool] = useState<string | null>(null);
    const [drawLayers, setDrawLayers] = useState<any[]>([]);
    const [toolbarList, setToolBarList] = useState<any>([
        {
            id: 'point',
            title: '标点',
            icon: 'icon-biaodian_1',
            type: 'point',
            desp: '标点'
        },
        {
            id: 'line',
            title: '标线',
            icon: 'icon-biaoxian_1',
            type: 'line',
            desp: '标线'
        },
        {
            id: 'polygon',
            title: '标面',
            icon: 'icon-biaomian_0',
            type: 'polygon',
            desp: '标面'
        },
        {
            id: 'circle',
            title: '画圆',
            icon: 'icon-huayuan_0',
            type: 'circle',
            desp: '画圆'
        },
        {
            id: 'rectangle',
            title: '画矩形',
            icon: 'icon-huajuxing_0',
            type: 'rectangle',
            desp: '画矩形'
        },
        {
            id: 'measure_distance',
            title: '测距',
            icon: 'icon-ceju_0',
            type: 'measure_distance',
            desp: '测距'
        },
        {
            id: 'measure_area',
            title: '测面',
            icon: 'icon-cemian_0',
            type: 'measure_area',
            desp: '测面'
        },
        {
            id: 'edit_polygon',
            title: '编辑面：双击打开编辑右键删除点',
            icon: 'icon-huizhiduobianxing1',
            type: 'edit_polygon',
            desp: '编辑面'
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


    // 工具按钮点击
    const handleToolClick = (toolId: string) => {

        // 如果点击的是当前已选中的工具，则取消
        if (currSelTool === toolId) {
            handleCancelDraw();
            return;
        }
        // // 先清理之前的绘制
        // clearCurrentDraw();

        setCurrSelTool(toolId);
        // clearAllIfExist();
        switch (toolId) {
            case 'point':
                const markerPoint = new MarkerPoint(mapInstance);
                setDrawLayers((pre: any[]) => [...pre, markerPoint]);
                // 添加监听逻辑
                markerPoint.onStateChange((status: PolygonEditorState) => {
                    console.log('status', status);
                    if (status === PolygonEditorState.Idle) {
                        setCurrSelTool('');
                    }
                })
                break;
            case 'line':
                const lineLayer = new LeafletLine(mapInstance);
                setDrawLayers((pre: any[]) => [...pre, lineLayer]);
                // 添加监听逻辑
                lineLayer.onStateChange((status: PolygonEditorState) => {
                    console.log('status', status);
                    if (status === PolygonEditorState.Idle) {
                        setCurrSelTool('');
                    }
                })
                break;
            case 'polygon':
                const polygonLayer = new LeafletPolygon(mapInstance);
                setDrawLayers((pre: any[]) => [...pre, polygonLayer]);
                // 添加监听逻辑
                polygonLayer.onStateChange((status: PolygonEditorState) => {
                    console.log('status', status);
                    if (status === PolygonEditorState.Idle) {
                        setCurrSelTool('');
                    }
                })
                break;
            case 'circle':
                const circleLayer = new LeafletCircle(mapInstance);
                setDrawLayers((pre: any[]) => [...pre, circleLayer]);
                // 添加监听逻辑
                circleLayer.onStateChange((status: PolygonEditorState) => {
                    console.log('status', status);
                    if (status === PolygonEditorState.Idle) {
                        setCurrSelTool('');
                    }
                })
                break;
            case 'rectangle':
                const rectangleLayer = new LeafletRectangle(mapInstance);
                setDrawLayers((pre: any[]) => [...pre, rectangleLayer]);
                // 添加监听逻辑
                rectangleLayer.onStateChange((status: PolygonEditorState) => {
                    console.log('status', status);
                    if (status === PolygonEditorState.Idle) {
                        setCurrSelTool('');
                    }
                })
                break;
            case 'measure_distance':
                const distanceLayer = new LeafletDistance(mapInstance);
                setDrawLayers((pre: any[]) => [...pre, distanceLayer]);
                // 添加监听逻辑
                distanceLayer.onStateChange((status: PolygonEditorState) => {
                    console.log('status', status);
                    if (status === PolygonEditorState.Idle) {
                        setCurrSelTool('');
                    }
                })
                break;
            case 'measure_area':
                const areaLayer = new LeafletArea(mapInstance);
                setDrawLayers((pre: any[]) => [...pre, areaLayer]);
                // 添加监听逻辑
                areaLayer.onStateChange((status: PolygonEditorState) => {
                    console.log('status', status);
                    if (status === PolygonEditorState.Idle) {
                        setCurrSelTool('');
                    }
                })
                break;
            case 'edit_polygon':
                const editPolygonLayer = new LeafletEditPolygon(mapInstance);
                setDrawLayers((pre: any[]) => [...pre, editPolygonLayer]);
                // 添加监听逻辑
                editPolygonLayer.onStateChange((status: PolygonEditorState) => {
                    console.log('status', status);
                    if (status === PolygonEditorState.Idle) {
                        setCurrSelTool('');
                    }
                })
                break;
            case 'delete':
                clearAllIfExist();
                break;

            default:
                break;
        }
    };

    // 清理当前绘制（保留之前的）
    const clearCurrentDraw = () => {
        if (drawLayers.length > 0) {
            const lastLayer = drawLayers[drawLayers.length - 1];
            if (lastLayer && lastLayer.destroy) {
                lastLayer.destroy();
            }
            setDrawLayers(prev => prev.slice(0, -1));
        }
    };

    const clearAllIfExist = () => {
        drawLayers.forEach((layer: any) => {
            layer.destroy();
        });
    }
    // 处理取消绘制事件
    const handleCancelDraw = () => {
        clearCurrentDraw()
        setCurrSelTool('');
    }



    return (
        <div className="leaflet-draw-toolbar">
            {toolbarList.map((tool: any, idx: number) => (
                <div className='tool-button-item' key={tool.id}>
                    {/* 图标部分 */}
                    <div
                        className={`tool-button-icon ${currSelTool === tool.id ? 'item-selected' : ''}`}
                        title={tool.desp}
                        onClick={() => handleToolClick(tool.id)}
                    >
                        <CustomIcon type={tool.icon} className={currSelTool === tool.id ? 'activeItem' : 'defaulted'}></CustomIcon>
                        {/* {tool.title && <span>{tool.title}</span>} */}
                    </div>
                    {/* 底部的分割线 */}
                    <Activity mode={idx !== toolbarList.length ? 'visible' : 'hidden'}>
                        <Divider type="horizontal" style={{ margin: '0px' }} />
                    </Activity>
                    {/* 绘制状态时的取消按钮 */}
                    {currSelTool === tool.id && currSelTool !== 'delete' && <div className='cancel-btn' onClick={handleCancelDraw}>取消</div>}

                </div>
            ))}
        </div>
    );
}