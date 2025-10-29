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
        setCurrSelTool(toolId);
        switch (toolId) {
            case 'point':
                const markerPoint = new MarkerPoint(mapInstance);
                setDrawLayers([...drawLayers, markerPoint]);
                break;
            case 'line':
                const lineLayer = new LeafletLine(mapInstance);
                setDrawLayers([...drawLayers, lineLayer]);
                break;
            case 'polygon':
                const polygonLayer = new LeafletPolygon(mapInstance);
                setDrawLayers([...drawLayers, polygonLayer]);
                break;
            case 'circle':
                const circleLayer = new LeafletCircle(mapInstance);
                setDrawLayers([...drawLayers, circleLayer]);
                break;
            case 'rectangle':
                const rectangleLayer = new LeafletRectangle(mapInstance);
                setDrawLayers([...drawLayers, rectangleLayer]);
                break;
            case 'delete':
                clearAllIfExist();
                break;

            default:
                break;
        }
    };
    const clearAllIfExist = () => {
        drawLayers.forEach((layer: any) => {
            layer.destory();
        });
    }



    return (
        <div className="leaflet-draw-toolbar">
            {toolbarList.map((tool: any, idx: number) => (
                <Fragment key={tool.id}>
                    <div
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
                </Fragment>
            ))}
        </div>
    );
}