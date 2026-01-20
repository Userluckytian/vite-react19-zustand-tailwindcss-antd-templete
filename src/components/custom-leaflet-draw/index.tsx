import React, { Activity, Fragment, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import CustomIcon from '../custom-icon';
import { App, Divider, Switch } from 'antd';
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
import { PolygonEditorState, type DragMarkerOptions, type EditOptions, type leafletGeoEditorInstance, type ReshapeOptions, type SnapOptions, type TopoClipResult, type TopoMergeResult, type TopoReshapeFeatureResult } from './types';
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
            id: 'add_hole',
            title: '添加挖孔图层',
            type: 'add_hole',
            icon: 'icon-shujudaoru',
            desp: '添加挖孔图层'
        },
        {
            id: 'add_hole_multi',
            title: '添加挖孔多面图层',
            type: 'add_hole_multi',
            icon: 'icon-shujudaoru',
            desp: '添加挖孔多面图层'
        },
        {
            id: 'magic',
            title: 'magic-bar',
            type: 'magic',
            icon: 'icon-magic-copy',
            desp: '魔术棒工具'
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
    const currSelToolRef = useRef<string | null>(null); // 使用 ref 存储最新的工具类型
    const [currSelTool, setCurrSelTool] = useState<string | null>(null); // 当前使用的【绘制条上的绘制工具】
    const [drawLayers, setDrawLayers] = useState<any[]>([]); // 存放绘制的图层
    const [currEditor, setCurrEditor] = useState<any>(null); // 当前编辑的图层【我们设置的是一次仅可编辑一个图层】
    const [topologyInstance, setTopologyInstance] = useState<any>(null);

    const [reshapeBar, setReshapeBar] = useState<any[]>([
        // {
        //     id: 'enableEdit',
        //     label: '重新打开编辑功能',
        //     visible: false
        // },
        {
            id: 'allowNoChoise',
            label: '允许无选择重塑',
            visible: false
        },
        {
            id: 'manual',
            label: '完成后，由用户来选择要保留的部分（仅支持面行为，结果在控制台，用户来渲染）',
            visible: false
        }
    ]);
    const [editConfigBar, setEditConfigBar] = useState<any[]>([
        {
            id: 'edit',
            label: '编辑',
            enable: true
        },
        {
            id: 'snap',
            label: '吸附',
            enable: true
        },
        {
            id: 'midPoint',
            label: '渲染中点marker',
            enable: true
        },
        {
            id: 'edgeMarker',
            label: '渲染拖动线marker',
            enable: true
        },
    ]);

    const polygonEditorRef = useRef<LeafletPolygonEditor | LeafletRectangleEditor | null>(null);

    // 改变reshapeBar的选项
    const changeReshapeBarOptions = (item: any, checked: boolean) => {
        item.visible = !item.visible;
        setReshapeBar((pre: any) => {
            const tempData = JSON.parse(JSON.stringify(pre));
            const itemIdx = reshapeBar.findIndex((it: any) => it.id === item.id);
            itemIdx > -1 && (tempData[itemIdx] = item);
            return tempData;
        })
        switch (item.id) {
            case 'enableEdit':
                polygonEditorRef.current.setEditEnabled(checked);
                break;
            case 'allowNoChoise':
                break;
            case 'manual':
                break;

            default:
                break;
        }

    }
    // 改变EditConfigBar的选项
    const changeEditConfigBarOptions = (item: any, checked: boolean) => {
        item.enable = !item.enable;
        setEditConfigBar((pre: any) => {
            const tempData = JSON.parse(JSON.stringify(pre));
            const itemIdx = editConfigBar.findIndex((it: any) => it.id === item.id);
            itemIdx > -1 && (tempData[itemIdx] = item);
            return tempData;
        })
        switch (item.id) {
            case 'edit':
                polygonEditorRef.current.setEditEnabled(checked);
                break;
            case 'snap':
                const snapAllOptions: SnapOptions = {
                    enabled: checked,
                    modes: ['edge', 'vertex'],
                    tolerance: 8,
                    highlight: {
                        enabled: true,
                        pointStyle: {
                            radius: 15,
                            color: '#00ff00',
                            weight: 2,
                            fillOpacity: 0.8,
                            pane: 'mapPane'
                        },
                        edgeStyle: {
                            color: '#00ff00',
                            weight: 5,
                            dashArray: '4,2',
                            pane: 'mapPane'
                        }
                    }
                };
                polygonEditorRef.current.toggleSnap(snapAllOptions);
                break;
            case 'midPoint':
                polygonEditorRef.current.updateEditOptions({
                    dragMidMarkerOptions: {
                        enabled: checked
                    }
                } as EditOptions)
                break;
            case 'edgeMarker':
                polygonEditorRef.current.updateEditOptions({
                    dragLineMarkerOptions: {
                        enabled: checked
                    }
                } as EditOptions)
                break;

            default:
                break;
        }
    }


    // 同步 currSelTool 到 ref
    useEffect(() => {
        currSelToolRef.current = currSelTool;
    }, [currSelTool]);

    // 工具按钮点击
    const handleToolClick = (toolId: string) => {

        // 如果点击的是当前已选中的工具，则取消
        if (currSelTool === toolId) {
            handleCancelDraw();
            return;
        }

        // 吸附参数
        const snap: SnapOptions = {
            enabled: true,
            modes: ['edge', 'vertex']
        };
        // 顶点渲染参数
        const midPointMarkerConfig: DragMarkerOptions = {
            enabled: true,
            dragMarkerStyle: {
                icon: L.divIcon({
                    className: 'polygon-midpoint-insert',
                    html: `<div style="border-radius:50%;background:#fff;border:2px solid #f00;width:14px;height:14px"></div>`,
                    iconSize: [14, 14]
                }),
                pane: 'markerPane'
            }
        }
        const edgeMarkerConfig: DragMarkerOptions = {
            enabled: true,
            dragMarkerStyle: {
                icon: L.divIcon({
                    className: 'polygon-midpoint-insert',
                    html: `<div style="border-radius:50%;background:#fff;border:2px solid #0f0;width:14px;height:14px"></div>`,
                    iconSize: [14, 14]
                }),
                pane: 'markerPane'
            }
        }
        const edit: EditOptions = {
            enabled: true,
            dragLineMarkerOptions: edgeMarkerConfig,
            dragMidMarkerOptions: midPointMarkerConfig
        };
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
                const polygonLayerEditor = new LeafletPolygonEditor(mapInstance, {
                    snap,
                    edit
                });
                saveEditorAndAddListener(polygonLayerEditor, true);

                break;
            case 'rectangle_editor':
                const rectangleLayerEditor = new LeafletRectangleEditor(mapInstance, { snap, edit });
                saveEditorAndAddListener(rectangleLayerEditor, true);
                break;
            case 'add':
                const geometry: any = {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [
                                102.10387893927167,
                                28.447770110343942
                            ],
                            [
                                105.582591,
                                28.251648
                            ],
                            [
                                106.204812,
                                31.298223
                            ],
                            [
                                103.01435564306644,
                                31.431075274005355
                            ],
                            [
                                102.10387893927167,
                                28.447770110343942
                            ]
                        ],
                        [
                            [
                                103.293457,
                                29.42046
                            ],
                            [
                                103.293457,
                                30.315988
                            ],
                            [
                                105.095215,
                                30.486551
                            ],
                            [
                                105.380859,
                                29.343875
                            ],
                            [
                                103.293457,
                                29.42046
                            ]
                        ]
                    ]
                };
                const polygonGeom: any = {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [
                                100.876465,
                                28.516969
                            ],
                            [
                                102.10387893925075,
                                28.44777011034512
                            ],
                            [
                                103.01435564304498,
                                31.431075274006247
                            ],
                            [
                                101.271973,
                                31.503629
                            ],
                            [
                                100.876465,
                                28.516969
                            ]
                        ]
                    ]
                };
                const polyGeom: any = {
                    "type": "MultiPolygon",
                    "coordinates": [
                        [
                            [
                                [
                                    102.590332,
                                    18.937464
                                ],
                                [
                                    102.919922,
                                    18.145852
                                ],
                                [
                                    103.939991,
                                    18.12198
                                ],
                                [
                                    103.051758,
                                    14.081927
                                ],
                                [
                                    106.47623230452568,
                                    14.289011419681762
                                ],
                                [
                                    109.54186425796593,
                                    20.600407678388187
                                ],
                                [
                                    103.205566,
                                    20.014645
                                ],
                                [
                                    102.590332,
                                    18.937464
                                ]
                            ]
                        ],
                        [
                            [
                                [
                                    106.47623230454701,
                                    14.289011419683053
                                ],
                                [
                                    117.993164,
                                    14.985462
                                ],
                                [
                                    117.324258,
                                    18.949618
                                ],
                                [
                                    118.476563,
                                    19.103648
                                ],
                                [
                                    118.322754,
                                    21.412162
                                ],
                                [
                                    109.54186425798815,
                                    20.60040767839024
                                ],
                                [
                                    106.47623230454701,
                                    14.289011419683053
                                ]
                            ],
                            [
                                [
                                    108.369141,
                                    16.40447
                                ],
                                [
                                    108.614692,
                                    18.012581
                                ],
                                [
                                    110.061035,
                                    17.978733
                                ],
                                [
                                    112.079764,
                                    18.248579
                                ],
                                [
                                    113.664551,
                                    16.69934
                                ],
                                [
                                    108.369141,
                                    16.40447
                                ]
                            ]
                        ],
                        [
                            [
                                [
                                    94.658203,
                                    13.154376
                                ],
                                [
                                    97.4364787587324,
                                    13.154376
                                ],
                                [
                                    98.88330745073758,
                                    17.895114
                                ],
                                [
                                    94.658203,
                                    17.895114
                                ],
                                [
                                    94.658203,
                                    13.154376
                                ]
                            ]
                        ],
                        [
                            [
                                [
                                    97.4364787587514,
                                    13.154376
                                ],
                                [
                                    101.074219,
                                    13.154376
                                ],
                                [
                                    101.074219,
                                    17.895114
                                ],
                                [
                                    98.88330745075729,
                                    17.895114
                                ],
                                [
                                    97.4364787587514,
                                    13.154376
                                ]
                            ]
                        ]
                    ]
                };
                const polygonEditor = new LeafletPolygonEditor(mapInstance!, {}, geometry);
                const polygonEditor2 = new LeafletPolygonEditor(mapInstance!, {}, polygonGeom);
                const polygonEditor3 = new LeafletPolygonEditor(mapInstance!, {}, polyGeom);
                saveEditorAndAddListener(polygonEditor, false, 'add');

                const polyGeomline: any = {
                    "type": "LineString",
                    "coordinates": [
                        [
                            124.892578,
                            39.504041
                        ],
                        [
                            126.62344029494868,
                            42.3445773598043
                        ],
                        [
                            153.457031,
                            42.617791
                        ]
                    ]
                };
                const lineLayer111 = L.geoJSON(polyGeomline, {
                    style: {
                        color: 'red', // 设置边线颜色
                        weight: 2,
                        fillColor: "red", // 设置填充颜色
                        fillOpacity: 0.3, // 设置填充透明度
                    }
                });
                lineLayer111.addTo(mapInstance);
                break;
            case 'add_hole':
                const hole_geometry: any = {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [
                                100.876465,
                                28.516969
                            ],
                            [
                                105.58259123950764,
                                28.251648224837997
                            ],
                            [
                                106.20481214475944,
                                31.298223358319337
                            ],
                            [
                                101.271973,
                                31.503629
                            ],
                            [
                                100.876465,
                                28.516969
                            ]
                        ],
                        [
                            [
                                103.293457,
                                29.42046
                            ],
                            [
                                103.293457,
                                30.315988
                            ],
                            [
                                105.095215,
                                30.486551
                            ],
                            [
                                105.380859,
                                29.343875
                            ],
                            [
                                103.293457,
                                29.42046
                            ]
                        ]
                    ]
                };
                const holePolygonEditor = new LeafletPolygonEditor(mapInstance!, {}, hole_geometry);
                saveEditorAndAddListener(holePolygonEditor, false, 'add_hole');
                break;
            case 'add_hole_multi':
                const hole_multi_geometry: any = {
                    "type": "MultiPolygon",
                    "coordinates": [
                        [
                            [
                                [
                                    102.590332,
                                    18.937464
                                ],
                                [
                                    102.919922,
                                    18.145852
                                ],
                                [
                                    103.93999069271662,
                                    18.121979970547713
                                ],
                                [
                                    103.051758,
                                    14.081927
                                ],
                                [
                                    117.993164,
                                    14.985462
                                ],
                                [
                                    117.32425772889664,
                                    18.949617797255353
                                ],
                                [
                                    118.476563,
                                    19.103648
                                ],
                                [
                                    118.322754,
                                    21.412162
                                ],
                                [
                                    103.205566,
                                    20.014645
                                ],
                                [
                                    102.590332,
                                    18.937464
                                ]
                            ],
                            [
                                [
                                    108.369141,
                                    16.40447
                                ],
                                [
                                    108.6146917528086,
                                    18.012580866169795
                                ],
                                [
                                    110.061035,
                                    17.978733
                                ],
                                [
                                    112.07976438163757,
                                    18.24857928443335
                                ],
                                [
                                    113.664551,
                                    16.69934
                                ],
                                [
                                    108.369141,
                                    16.40447
                                ]
                            ]
                        ],
                        [
                            [
                                [
                                    94.658203,
                                    13.154376
                                ],
                                [
                                    101.074219,
                                    13.154376
                                ],
                                [
                                    101.074219,
                                    17.895114
                                ],
                                [
                                    94.658203,
                                    17.895114
                                ],
                                [
                                    94.658203,
                                    13.154376
                                ]
                            ]
                        ]
                    ]
                };
                const holeMultiPolygonEditor = new LeafletPolygonEditor(mapInstance!, {}, hole_multi_geometry);
                saveEditorAndAddListener(holeMultiPolygonEditor, false, 'add_hole_multi');
                break;
            case 'delete':
                // 销毁图层
                clearAllIfExist();
                // 关闭工具条
                if (currEditor) {
                    setCurrEditor(null);
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
    const saveEditorAndAddListener = (editor: leafletGeoEditorInstance, needSnapToobar: boolean = false, toolId?: string) => {
        setDrawLayers((pre: any[]) => [...pre, editor]);
        // 对于有默认 geometry 的工具，立即触发绘制结果回调
        if (props.drawGeoJsonResult && toolId && ['add', 'add_hole', 'add_hole_multi'].includes(toolId)) {
            try {
                const layerInstance = (editor as any).polygonLayer || (editor as any).markerLayer ||
                    (editor as any).lineLayer || (editor as any).circleLayer ||
                    (editor as any).rectangleLayer;

                if (layerInstance) {
                    let geoJsonData = null;
                    try {
                        geoJsonData = (editor as any).geojson ? (editor as any).geojson() : null;
                    } catch (e) {
                        console.error('获取 GeoJSON 数据失败:', e);
                    }
                    props.drawGeoJsonResult({
                        layer: layerInstance,
                        type: toolId,
                        geojson: geoJsonData
                    });
                }
            } catch (error) {
                console.error('获取绘制结果失败:', error);
            }
        }
        // 添加监听逻辑
        editor.onStateChange((status: PolygonEditorState) => {
            const currentTool = currSelToolRef.current;
            if (status === PolygonEditorState.Drawing) {
                setCurrEditor(editor);
            } else if (status === PolygonEditorState.Editing) {
                setCurrEditor(editor);
                if (needSnapToobar) {
                    polygonEditorRef.current = editor as (LeafletPolygonEditor | LeafletRectangleEditor);
                }
            } else {
                if (status === PolygonEditorState.Idle && currentTool && !['add', 'add_hole', 'add_hole_multi'].includes(currentTool)) {
                    // 绘制完成，尝试获取绘制的图层数据
                    try {
                        // 获取绘制工具类型
                        const toolType = currentTool;
                        if (toolType && ['point', 'line', 'polygon', 'circle', 'rectangle', 'measure_distance', 'measure_area', 'polygon_editor', 'rectangle_editor', 'magic'].includes(toolType)) {
                            // 获取 Leaflet 图层实例
                            const layerInstance = (editor as any).polygonLayer || (editor as any).markerLayer ||
                                (editor as any).lineLayer || (editor as any).circleLayer ||
                                (editor as any).rectangleLayer;

                            if (layerInstance && props.drawGeoJsonResult) {
                                // 获取绘制的 GeoJSON 数据（容错处理）
                                let geoJsonData = null;
                                try {
                                    geoJsonData = (editor as any).geojson ? (editor as any).geojson() : null;
                                } catch (e) {
                                    console.error('获取 GeoJSON 数据失败:', e);
                                }
                                // 传递绘制结果给父组件
                                props.drawGeoJsonResult({
                                    layer: layerInstance,
                                    type: toolType,
                                    geojson: geoJsonData
                                });
                            }
                        }
                        setCurrSelTool('');
                    } catch (error) {
                        console.error('获取绘制结果失败:', error);
                    }
                }
                setCurrEditor(null);
            }
        }, { immediateNotify: true })
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
    const undoDraw = () => {
        currEditor && currEditor.undoDraw();
    }
    // #endregion

    // #region 编辑工具条事件
    const undoEdit = () => {
        currEditor && currEditor.undoEdit();
    }
    const redoEdit = () => {
        currEditor && currEditor.redoEdit();
    }
    // 重置到最初状态
    const resetToInitial = () => {
        currEditor && currEditor.resetToInitial();
    }
    // 完成编辑
    const saveEdit = () => {
        currEditor && currEditor.commitEdit();
    }
    // #endregion

    // #region 拓扑工具条事件
    // 选择图层
    const pickLayer = () => {
        topologyInstance && topologyInstance.select();
    }
    const deleteRecord = (record: any, isDelete: boolean) => {
        if (isDelete) {
            // deleteRecode(record, false);
        } else {
            // addRecode(record, false);
        }
    }
    // 裁切
    const cut = () => {
        topologyInstance && topologyInstance.clipByLine(({ doClipLayers, clipedGeoms }: TopoClipResult) => {
            console.log('裁剪--clipedGeoms', clipedGeoms, doClipLayers);
            // 第一步：删除之前的旧图层
            doClipLayers.forEach((layer: any) => {
                // console.log('layer11', layer);
                const record = layer.options.origin;
                // deleteRecode(record, false);
            });
            // 第二步：添加新的图层
            clipedGeoms.forEach((Feature: GeoJSON.Feature, idx: number) => {
                // console.log('Feature', Feature);
                // addRecode(Feature, idx === clipedGeoms.length - 1 ? true : false);
            });
        });

    }
    // 合并图层
    const union = () => {
        topologyInstance && topologyInstance.merge(({ mergedGeom, mergedLayers }: TopoMergeResult) => {
            // try {
            console.log('合并--mergedGeom', mergedGeom, mergedLayers);
            // 第一步：删除之前的旧图层
            mergedLayers.forEach((layer: any) => {
                const record = layer.options.origin;
                // deleteRecode(record, false);
            });
            // 第二步：添加合并后的新图层
            // addRecode(mergedGeom);
            // } catch (error) {
            //     console.log('error', error);

            //     // message.error(error as any);
            // }
        });
    }
    // 整形要素
    const reshapeFeature = () => {
        const options: ReshapeOptions = {
            AllowReshapingWithoutSelection: reshapeBar[0].visible ? true : false,
            chooseStrategy: reshapeBar[1].visible ? 'manual' : 'auto',
        };
        topologyInstance && topologyInstance.reshapeFeature(options, ({ doReshapeLayers, reshapedGeoms }: TopoReshapeFeatureResult) => {
            // try {
            // console.log('整形--reshapedGeoms', reshapedGeoms, doReshapeLayers);
            // 第一步：删除之前的旧图层
            doReshapeLayers.forEach((layer: any) => {
                const record = layer.options.origin;
                // deleteRecode(record, false);
            });
            // 第二步：添加整形后的新图层
            // addRecode(reshapedGeoms);
            // } catch (error) {
            //     console.log('error', error);

            //     // message.error(error as any);
            // }
        });
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
            const state = (currEditor as (LeafletPolygonEditor | LeafletRectangleEditor)).getCurrentState();
            if (state === PolygonEditorState.Drawing) {
                undoDraw();
            } else {
                undoEdit();
            }
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
    }, [currEditor])

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
                            <Divider orientation="horizontal" style={{ margin: '0px' }} />
                        </Activity>
                        {/* 绘制状态时的取消按钮 */}
                        {currSelTool === tool.id && !['delete', 'add'].includes(currSelTool) && <div className='cancel-btn' onClick={handleCancelDraw}>取消</div>}
                    </div>
                ))}
            </div>
            {/* 编辑工具条 */}
            {currEditor
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
            {!currEditor
                &&
                <div className="leaflet-topology-toolbar leaflet-bar">
                    <div>拓扑工具条：</div>
                    <div className='topology-tool-item item-bar' onClick={() => pickLayer()}>↩️ 选择</div>
                    <div className='topology-tool-item item-bar' onClick={() => cut()}>↩️ 裁切</div>
                    <div className='topology-tool-item item-bar' onClick={() => union()}>🔄 合并</div>
                    <div className='topology-tool-item item-bar' onClick={() => clearTopo()}>🔄 清除</div>
                </div>
            }
            {/* 整形要素工具条 */}
            {!currEditor
                &&
                <div className="leaflet-reshape-toolbar leaflet-bar">
                    <div className='top'>
                        <div>整形工具条：</div>
                        {!reshapeBar[0].visible && <div className='topology-tool-item item-bar' onClick={() => pickLayer()}>↩️ 选择</div>}
                        <div className='topology-tool-item item-bar' onClick={() => reshapeFeature()}>🔄 整形要素工具</div>
                        <div className='topology-tool-item item-bar' onClick={() => clearTopo()}>🔄 清除</div>
                    </div>
                    <div className='bottom'>
                        {
                            reshapeBar.map((ite: any, index: number) => {
                                return (
                                    <div className='reshape-item' key={'SCEML-' + index}>
                                        <div className='switch-btn'>
                                            <Switch checkedChildren="开" unCheckedChildren="关" value={ite.visible} onChange={(e) => { changeReshapeBarOptions(ite, e) }} />
                                        </div>
                                        <div className='label'>{ite.label}</div>
                                    </div>
                                )
                            })
                        }
                    </div>
                </div>
            }
            {/* 编辑配置工具 */}
            {currEditor
                &&
                <div className="edit-config-toolbar leaflet-bar">
                    <div className='edit-config-content'>
                        {
                            editConfigBar.map((ite: any, index: number) => {
                                return (
                                    <div className='edit-config-item' key={'ECTLB-' + index}>
                                        <div className='switch-btn'>
                                            <Switch checkedChildren="开" unCheckedChildren="关" value={ite.enable} onChange={(e) => { changeEditConfigBarOptions(ite, e) }} />
                                        </div>
                                        <div className='label'>{ite.label}</div>
                                    </div>
                                )
                            })
                        }
                    </div>
                </div>
            }
        </>
    );
}