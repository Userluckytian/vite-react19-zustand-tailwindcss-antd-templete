import React, { Activity, Fragment, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import CustomIcon from '../custom-icon';
import { App, Divider } from 'antd';
import * as L from 'leaflet';
import './index.scss';
import MarkerPoint from './draw/markerPoint';
import LeafletPolyline from './draw/polyline';
import LeafletPolygon from './draw/polygon';
import LeafletCircle from './draw/circle';
import LeafletRectangle from './draw/rectangle';
import LeafletDistance from './measure/distance';
import LeafletArea from './measure/area';
import LeafletEditPolygon from './simpleEdit/polygon';
import { PolygonEditorState, type leafletGeoEditorInstance } from './types';
import LeafletEditRectangle from './simpleEdit/rectangle';
import { LeafletTopology } from './topo/topo';
import LeafletRectangleEditor from './edit/rectangle';
import LeafletPolygonEditor from './edit/polygon';
interface CustomLeafLetDrawProps {
    mapInstance: L.Map; // 传入的地图实例
    drawGeoJsonResult?: (result: any) => void; // 绘制结果吐出
    drawStatus?: (status: boolean) => void; // 绘制状态吐出
}
export default function CustomLeafLetDraw(props: CustomLeafLetDrawProps) {
    const { message } = App.useApp();
    const { mapInstance } = props;
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
        // {
        //     id: 'edit_polygon',
        //     title: '可编辑面',
        //     icon: 'icon-huizhiduobianxing1-copy',
        //     type: 'edit_polygon',
        //     desp: '编辑面'
        // },
        // {
        //     id: 'edit_rectangle',
        //     title: '可编辑矩形',
        //     icon: 'icon-juxinghuizhi1-copy',
        //     type: 'edit_rectangle',
        //     desp: '编辑矩形'
        // },
        {
            id: 'polygon_editor',
            title: '可编辑复杂面',
            icon: 'icon-huizhiduobianxing1',
            type: 'polygon_editor',
            desp: '编辑复杂面'
        },
        {
            id: 'rectangle_editor',
            title: '可编辑矩形',
            icon: 'icon-juxinghuizhi1',
            type: 'rectangle_editor',
            desp: '编辑矩形'
        },
        {
            id: 'add',
            title: '添加默认图层',
            type: 'add',
            icon: 'icon-shujudaoru',
            desp: '添加默认图层'
        },
        {
            id: 'delete',
            title: '清空',
            type: 'delete',
            icon: 'icon-shanchu_0',
            desp: '清空绘制和查询内容'
        }
    ]
    ) // 工具栏列表
    const [currSelTool, setCurrSelTool] = useState<string | null>(null); // 当前使用的【绘制条上的绘制工具】
    const [drawLayers, setDrawLayers] = useState<any[]>([]); // 存放绘制的图层
    const [currEditLayer, setCurrEditLayer] = useState<any>(null); // 当前编辑的图层【我们设置的是一次仅可编辑一个图层】
    const [topologyInstance, setTopologyInstance] = useState<any>(null);
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
        // clearAllIfExist(); // 根据需求来，有的时候，我们绘制新内容时，会期望移除上次绘制的结果
        switch (toolId) {
            case 'point':
                const markerPoint = new MarkerPoint(mapInstance);
                saveEditorAndAddListener(markerPoint);
                break;
            case 'line':
                const lineLayer = new LeafletPolyline(mapInstance);
                saveEditorAndAddListener(lineLayer);
                break;
            case 'polygon':
                const polygonLayer = new LeafletPolygon(mapInstance);
                saveEditorAndAddListener(polygonLayer);
                break;
            case 'circle':
                const circleLayer = new LeafletCircle(mapInstance);
                saveEditorAndAddListener(circleLayer);
                break;
            case 'rectangle':
                const rectangleLayer = new LeafletRectangle(mapInstance);
                saveEditorAndAddListener(rectangleLayer);
                break;
            case 'measure_distance':
                const distanceLayer = new LeafletDistance(mapInstance);
                saveEditorAndAddListener(distanceLayer);
                break;
            case 'measure_area':
                const areaLayer = new LeafletArea(mapInstance);
                saveEditorAndAddListener(areaLayer);
                break;
            case 'edit_polygon':
                const editPolygonLayer = new LeafletEditPolygon(mapInstance);
                saveEditorAndAddListener(editPolygonLayer);
                break;
            case 'edit_rectangle':
                const editRectangleLayer = new LeafletEditRectangle(mapInstance);
                saveEditorAndAddListener(editRectangleLayer);
                break;
            case 'polygon_editor':
                const polygonLayerEditor = new LeafletPolygonEditor(mapInstance);
                saveEditorAndAddListener(polygonLayerEditor);
                break;
            case 'rectangle_editor':
                const rectangleLayerEditor = new LeafletRectangleEditor(mapInstance);
                saveEditorAndAddListener(rectangleLayerEditor);
                break;
            case 'add':
                const geometry: any = {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [
                                129.726563,
                                42.032974
                            ],
                            [
                                154.335938,
                                41.574361
                            ],
                            [
                                151.347656,
                                31.503629
                            ],
                            [
                                136.40625,
                                30.600094
                            ],
                            [
                                129.814453,
                                35.675147
                            ],
                            [
                                129.726563,
                                42.032974
                            ]
                        ]
                    ]
                };
                const polygonEditor = new LeafletPolygonEditor(mapInstance!, {}, geometry);
                saveEditorAndAddListener(polygonEditor);
                break;
            case 'delete':
                // 销毁图层
                clearAllIfExist();
                // 关闭工具条
                if (currEditLayer) {
                    setCurrEditLayer(null);
                }
                break;

            default:
                break;
        }
    };

    /** 保存编辑器实例，并添加监听
     *
     *
     * @param {leafletGeoEditorInstance} editor
     */
    const saveEditorAndAddListener = (editor: leafletGeoEditorInstance) => {
        setDrawLayers((pre: any[]) => [...pre, editor]);
        // 添加监听逻辑
        editor.onStateChange((status: PolygonEditorState) => {
            console.log('status', status);
            if (status === PolygonEditorState.Editing) {
                setCurrEditLayer(editor);
            } else {
                if (status === PolygonEditorState.Idle) {
                    setCurrSelTool('');
                }
                setCurrEditLayer(null);
            }
        })
    }

    // #region 绘制工具条事件
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
    // #endregion

    // #region 编辑工具条事件
    const undoEdit = () => {
        currEditLayer && currEditLayer.undoEdit();

    }
    const redoEdit = () => {
        currEditLayer && currEditLayer.redoEdit();
    }
    // 重置到最初状态
    const resetToInitial = () => {
        currEditLayer && currEditLayer.resetToInitial();
    }
    // 完成编辑
    const saveEdit = () => {
        currEditLayer && currEditLayer.commitEdit();
    }
    // #endregion

    // #region 拓扑工具条事件
    // 选择图层
    const pickLayer = () => {
        topologyInstance && topologyInstance.select();
    }
    // 裁切
    const cut = () => {
        topologyInstance && topologyInstance.clipByLine();
    }
    // 合并图层
    const union = () => {
        topologyInstance && topologyInstance.merge();
    }
    // 清除拓扑
    const clearTopo = () => {
        topologyInstance && topologyInstance.cleanAll();
    }
    // #endregion

    // #region 键盘快捷键
    const handleKeyDown = (e: KeyboardEvent) => {
        // 复杂的键盘操作放前面，比如：担心Ctrl + Z先执行
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            redoEdit();
        }
        if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            // 二次确认弹窗
            const confirmed = window.confirm('确定要撤销全部操作吗？这将回到初始状态。');
            if (confirmed) {
                resetToInitial();
            }
        }
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            undoEdit();
        }
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveEdit();
        }
    }
    // #endregion

    // #region 地图点击、双击事件（事件中的变量需要通过ref读取，不然可能拿不到最新的值）
    const mapClickFun = (e: any) => { };
    const mapDblClickFun = (e: any) => { };
    // #endregion 

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        }
    }, [currEditLayer])
    useEffect(() => {
        if (mapInstance) {
            const topology = LeafletTopology.getInstance(mapInstance);
            setTopologyInstance(topology);
        }
        return () => {

        }
    }, [mapInstance])


    return (
        <>
            {/* 绘制工具条 */}
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
                        {currSelTool === tool.id && !['delete', 'add'].includes(currSelTool) && <div className='cancel-btn' onClick={handleCancelDraw}>取消</div>}
                    </div>
                ))}
            </div>
            {/* 编辑工具条 */}
            {currEditLayer
                &&
                <div className="leaflet-edit-toolbar leaflet-bar">
                    <div>编辑工具条：</div>
                    <div className='edit-tool-item item-bar' onClick={() => undoEdit()}>↩️ 后退(Ctrl + Z)</div>
                    <div className='edit-tool-item item-bar' onClick={() => redoEdit()}>↩️ 向前(Ctrl + Shift + Z)</div>
                    <div className='edit-tool-item item-bar' onClick={() => resetToInitial()}>🔄 撤销全部(Ctrl + Alt + Z)()</div>
                    <div className='edit-tool-item item-bar' onClick={() => saveEdit()}>✅ 完成编辑(Ctrl + S)</div>
                </div>
            }
            {/* 拓扑工具条(俩条件：1：地图上存在图层 2：不是编辑模式时。才展示拓扑工具条) */}
            {!currEditLayer
                &&
                <div className="leaflet-topology-toolbar leaflet-bar">
                    <div>拓扑工具条：</div>
                    <div className='topology-tool-item item-bar' onClick={() => pickLayer()}>↩️ 选择</div>
                    <div className='topology-tool-item item-bar' onClick={() => cut()}>↩️ 裁切</div>
                    <div className='topology-tool-item item-bar' onClick={() => union()}>🔄 合并</div>
                    <div className='topology-tool-item item-bar' onClick={() => clearTopo()}>🔄 清除</div>
                </div>
            }
        </>
    );
}