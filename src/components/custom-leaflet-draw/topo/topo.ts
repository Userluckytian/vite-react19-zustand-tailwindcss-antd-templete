import * as L from 'leaflet';
import { queryLayerOnClick } from '../utils/commonUtils';
import { union } from '@turf/turf';
import LeafletPolyline from '../draw/polyline';
import { PolygonEditorState, type TopoClipResult, type TopoMergeResult } from '../types';
import { clipSelectedLayersByLine, mergePolygon } from '../utils/topoUtils';

export class LeafletTopology {
  private static instance: LeafletTopology;
  private map: L.Map;
  drawLineLayer: LeafletPolyline | null = null;
  private selectedLayers: L.GeoJSON[] = [];
  private clickHandler: ((e: L.LeafletMouseEvent) => void) | null = null;
  private drawLineListener: ((status: PolygonEditorState) => void) | null = null;

  constructor(map: L.Map) {
    this.map = map;
  }

  public static getInstance(map: L.Map): LeafletTopology {
    if (!LeafletTopology.instance) {
      LeafletTopology.instance = new LeafletTopology(map);
    }
    return LeafletTopology.instance;
  }

  /** 选择图层
   *
   *
   * @memberof LeafletTopology
   */
  public select() {
    this.cleanAll();
    this.map.getContainer().style.cursor = 'pointer';
    this.disableMapOpt();

    this.clickHandler = (e: L.LeafletMouseEvent) => {
      const hits = queryLayerOnClick(this.map, e);
      // console.log('这里返回的是全部被选择的图层，其中我们高亮的图层携带有属性： options.linkLayerId，所以我们可以判断出，这是一个高亮图层，从而跳过处理', hits);
      /* 过滤条件1： layer的options属性中若包含linkLayerId属性，说明是topo的高亮图层，需要过滤掉
         过滤条件2： layer的options属性中layerVisible属性的值是false，说明是隐藏的图层，需要过滤掉
        */
      const realPickedLayer = hits.filter(layer => {
        const isHighLightLayer = layer.options && layer.options?.linkLayerId;
        const isShowLayer = layer.options?.layerVisible ?? true;
        return !(isHighLightLayer || !isShowLayer);
      });
      // console.log('realPickedLayer', realPickedLayer);
      realPickedLayer.forEach(layer => {
        const pickerLayerId = layer._leaflet_id;
        // console.log('this.selectedLayers', this.selectedLayers);
        const findLayerIdx = this.selectedLayers.findIndex((layer: any) => layer?.options && layer?.options?.linkLayerId === pickerLayerId);
        if (findLayerIdx !== -1) {
          const pickLayer = this.selectedLayers[findLayerIdx];
          this.map.removeLayer(pickLayer);
          pickLayer.remove();
          this.selectedLayers.splice(findLayerIdx, 1);
        } else {
          // 基于选中的图层的空间信息，添加对应的高亮图层
          this.addHighLightLayerByPickLayerGeom(layer);
        }
      });
    };

    this.map.on('click', this.clickHandler);
  }

  /** 
   * 执行合并操作 
   * */
  public merge(callback: (result: TopoMergeResult) => void) {
    if (this.selectedLayers.length < 2) {
      throw new Error('请至少选择两个图层进行合并');
    }
    try {
      const mergedGeom = mergePolygon(this.selectedLayers);
      // console.log('合并--mergedGeom', mergedGeom);
      // return { mergedGeom, mergedLayers: this.selectedLayers };
       // console.log('合并--mergedGeom', mergedGeom);
      callback && callback({ mergedGeom, mergedLayers: this.selectedLayers })
      setTimeout(() => {
        this.cleanAll();
      }, 0);
    } catch (error) {
      throw new Error('合并发生错误：' + error);
    }
  }

  /** 
   * 执行线裁剪操作 
   * */
  public clipByLine(callback: (result: TopoClipResult) => void) {
    if (this.selectedLayers.length === 0) {
      throw new Error('请先选择要裁剪的图层');
    }

    // 第一步： 关闭选择高亮的交互事件
    if (this.clickHandler) {
      this.map.off('click', this.clickHandler);
      this.clickHandler = null;
    }
    // 第二步： 执行绘制操作，并添加监听事件
    this.drawLineLayer = new LeafletPolyline(this.map);
    // 添加绘制完毕后，重新调整状态为topo状态
    this.drawLineListener = (status: PolygonEditorState) => {
      if (status === PolygonEditorState.Idle) {
        const geoJson = this.drawLineLayer!.geojson();
        console.log('绘制的线图层的空间信息：', geoJson, this.selectedLayers);
        const { doClipLayers, clipedGeoms } = clipSelectedLayersByLine(geoJson, this.selectedLayers);
        console.log('clipsPolygons', clipedGeoms, 'waitingDelLayer', doClipLayers);
        setTimeout(() => {
          this.drawLineLayer!.destroy();
          this.cleanAll();
        }, 0);
        callback && callback({ clipedGeoms, doClipLayers });

        // clipsPolygons.forEach(element => {
        //   const layer = L.geoJSON(element, {
        //     style: {
        //       fillColor: 'rgba(0, 0, 0, 0.2)',
        //       color: '#0f0',
        //       dashArray: '10, 8', // 虚线模式
        //       // dashOffset: '8', // 虚线偏移量
        //       fillOpacity: 1,
        //       fill: true,
        //       // 边框大小
        //       weight: 3,
        //     }
        //   });
        //   console.log('layer', layer);
        //   this.map.addLayer(layer);
        // });
      }
    }
    this.drawLineLayer.onStateChange(this.drawLineListener)
  }


  /** 基于选中的图层的空间信息，添加对应的高亮图层
   *
   *
   * @private
   * @param {*} layer
   * @memberof LeafletTopology
   */
  private addHighLightLayerByPickLayerGeom(layer: any) {
    const layerGeom = layer.toGeoJSON();
    // 暂时不支持点类型的
    if (layerGeom.geometry.type === 'Point') {
      throw new Error('不支持的数据类型：' + layerGeom.geometry.type + '，不支持高亮');
    }
    const highlightStyle = {
      // fillColor: 'rgba(0, 0, 0, 0)',
      color: '#ff0',
      dashArray: '10, 8', // 虚线模式
      // dashOffset: '8', // 虚线偏移量
      fillOpacity: .5,
      // 边框大小
      weight: 2,
    };
    const highlightLayer = L.geoJSON(layerGeom, {
      style: highlightStyle,
      ['linkLayerId' as any]: layer._leaflet_id, // 添加自定义属性
    });
    this.selectedLayers.push(highlightLayer);
    this.map.addLayer(highlightLayer);
  }

  private disableMapOpt() {
    // 1：禁用双击地图放大功能
    this.map.doubleClickZoom.disable();
  }
  private enableMapOpt() {
    // 1：恢复双击地图放大功能
    this.map.doubleClickZoom.enable();
  }
  /** 
   * 清理状态和事件
   * 1： off click事件
   * 2： 移除高亮图层
   * 3： 恢复地图事件
   * 4： 重置模式管理器
   * */
  public cleanAll() {
    if (this.clickHandler) {
      this.map.off('click', this.clickHandler);
      this.clickHandler = null;
    }
    this.map.getContainer().style.cursor = 'default';
    this.selectedLayers.forEach(layer => {
      this.map.removeLayer(layer);
      layer.remove();
    });
    // 如果绘制功能实例化了，则移除
    if (this.drawLineLayer) {
      this.drawLineListener && this.drawLineLayer.offStateChange(this.drawLineListener)
      this.drawLineLayer.destroy();
      this.drawLineLayer = null;
    }
    this.selectedLayers = [];
    this.enableMapOpt();
  }
}
