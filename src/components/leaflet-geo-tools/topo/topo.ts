import * as L from 'leaflet';
import { queryLayerOnClick, queryLayersIntersectingGeometry } from '../utils/commonUtils';

import { clipSelectedLayersByLine, mergePolygon, reshapeSelectedLayersByLine } from '../utils/topoUtils';
import PolylineEditor from '../editor/polylineEditor';
import { EditorState, type ReshapeOptions, type TopoClipResult, type TopoMergeResult, type TopoOptions, type TopoReshapeFeatureResult } from '../types';
import { circle } from '@turf/turf';


export class LeafletTopology {
  private static instance: LeafletTopology;
  private map: L.Map | null = null;
  drawLineLayer: PolylineEditor | null = null;
  private selectedLayers: L.GeoJSON[] = [];
  private clickHandler: ((e: L.LeafletMouseEvent) => void) | null = null;
  private drawLineListener: ((status: EditorState) => void) | null = null;
  private isPicking: boolean = false; // 是否处于选择图层状态（这个状态主要用于edit编辑器在编辑时，确保当前不是选择图层的状态，如果是选择图层的状态，则editor编辑器的事件应该禁止，不让其触发）
  private topoOptions: TopoOptions = {
    precision: 6,
    circleStep: 64,
  }

  constructor(map: L.Map, options: TopoOptions = {}) {
    this.map = map;
    this.topoOptions = { ...this.topoOptions, ...options };
  }

  public static getInstance(map: L.Map): LeafletTopology {
    if (!LeafletTopology.instance) {
      LeafletTopology.instance = new LeafletTopology(map);
    }
    return LeafletTopology.instance;
  }

  public getTopoOptions() {
    return this.topoOptions;
  }

  public setTopoOptions(options: TopoOptions) {
    return { ...this.topoOptions, ...options };
  }

  /** 选择图层
   *
   *
   * @memberof LeafletTopology
   */
  public select() {
    if (!this.map) {
      throw new Error('未获取到map对象');
    }
    this.cleanAll();
    this.isPicking = true; // 设置选择状态
    this.map.getContainer().style.cursor = 'pointer';
    this.disableMapOpt();

    this.clickHandler = (e: L.LeafletMouseEvent) => {
      const hits = queryLayerOnClick(this.map!, e, this.topoOptions.precision);
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
        const findLayerIdx = this.selectedLayers.findIndex((layer: any) => layer?.options && layer?.options?.linkLayerId === pickerLayerId);
        if (findLayerIdx !== -1) {
          const pickLayer = this.selectedLayers[findLayerIdx];
          this.map!.removeLayer(pickLayer);
          pickLayer.remove();
          this.selectedLayers.splice(findLayerIdx, 1);
        } else {
          const clickLnglat = e.latlng;
          // 基于选中的图层的空间信息，添加对应的高亮图层
          this.addHighLightLayerByPickLayerGeom(layer, clickLnglat);
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
      const mergedGeom = mergePolygon(this.selectedLayers, this.topoOptions.precision);
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
   * 执行整形要素工具操作 
   * */
  public reshapeFeature(options: ReshapeOptions, callback: (result: TopoReshapeFeatureResult) => void) {
    if (!this.map) {
      return;
    }
    // todo: 不允许无选择时，若选择的图层数量为0个，则拒绝后续执行。
    if (!options.AllowReshapingWithoutSelection && this.selectedLayers.length === 0) {
      throw new Error('请先选择要执行整形操作的图层');
    }
    // 就要获取全部的layer，然后逐个遍历是否和绘制的线相交，再执行后续操作 

    // 第一步： 关闭选择高亮的交互事件
    if (this.clickHandler) {
      this.map.off('click', this.clickHandler);
      this.clickHandler = null;
    }
    // 第二步： 执行绘制操作，并添加监听事件
    const drawReshapeLineFlag = 'reshapeLine';
    this.drawLineLayer = new PolylineEditor(this.map, { defaultStyle: { drawFlag: drawReshapeLineFlag } });
    // 添加绘制完毕后，重新调整状态为topo状态
    this.drawLineListener = (status: EditorState) => {
      if (status === EditorState.Idle) {
        const geoJson = this.drawLineLayer!.getGeoJSON(this.topoOptions.precision);
        // console.log('绘制的线图层的空间信息：', this.drawLineLayer, geoJson);
        // console.log('用户选择的图层：', this.selectedLayers);
        // console.log('地图对象', this.map);
        if (options.AllowReshapingWithoutSelection) {
          const tempIntersectLayer = queryLayersIntersectingGeometry(this.map!, geoJson, this.topoOptions.precision);
          this.selectedLayers = tempIntersectLayer.filter((it: L.Layer) => (it.options as any).drawFlag !== drawReshapeLineFlag);
        }
        console.log('final-this.selectedLayers', this.selectedLayers);

        const { doReshapeLayers, reshapedGeoms } = reshapeSelectedLayersByLine(geoJson, this.selectedLayers, options, this.topoOptions.precision);
        // 行为1：正常输出
        // console.log('reshapedGeoms', reshapedGeoms, 'doReshapeLayers', doReshapeLayers);
        setTimeout(() => {
          this.drawLineLayer!.destroy();
          this.cleanAll();
        }, 0);
        callback && callback({ doReshapeLayers, reshapedGeoms });

        // 为啥不删掉？ 后续调试用
        // 行为2：上图渲染，但不输出，主要用于测试
        // reshapedGeoms.forEach(element => {
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

  /** 
   * 执行线裁剪操作 
   * */
  public clipByLine(callback: (result: TopoClipResult) => void) {
    if (!this.map) {
      throw new Error('未获取到map对象');
    }
    if (this.selectedLayers.length === 0) {
      throw new Error('请先选择要裁剪的图层');
    }

    // 第一步： 关闭选择高亮的交互事件
    if (this.clickHandler) {
      this.map.off('click', this.clickHandler);
      this.clickHandler = null;
    }
    // 第二步： 执行绘制操作，并添加监听事件
    this.drawLineLayer = new PolylineEditor(this.map);
    // 添加绘制完毕后，重新调整状态为topo状态
    this.drawLineListener = (status: EditorState) => {
      if (status === EditorState.Idle) {
        const geoJson = this.drawLineLayer!.getGeoJSON(this.topoOptions.precision);
        // console.log('绘制的线图层的空间信息：', geoJson, this.selectedLayers);
        const { doClipLayers, clipedGeoms } = clipSelectedLayersByLine(geoJson, this.selectedLayers, this.topoOptions.precision);
        // console.log('clipsPolygons', clipedGeoms, 'waitingDelLayer', doClipLayers);
        setTimeout(() => {
          if (this.drawLineLayer) {
            this.drawLineLayer.destroy();
          }
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
  private addHighLightLayerByPickLayerGeom(layer: any, lnglat: L.LatLng) {
    console.log('layer', layer);

    const layerGeom = layer.toGeoJSON();

    const highlightStyle = {
      // fillColor: 'rgba(0, 0, 0, 0)',
      color: '#ff0',
      dashArray: '10, 8', // 虚线模式
      // dashOffset: '8', // 虚线偏移量
      fillOpacity: .5,
      // 边框大小
      weight: 2,
    };

    let highlightLayer: any = null;
    // 暂时不支持点类型的
    if (layerGeom.geometry.type === 'Point') {
      // 可能是圆
      const { isCircle, circleHighLightLayer } = this.validIsCircle(layer, highlightStyle, lnglat);
      if (isCircle) {
        highlightLayer = circleHighLightLayer;
      } else {
        throw new Error('不支持的数据类型：' + layerGeom.geometry.type + '，不支持高亮');
      }
    } else {
      highlightLayer = L.geoJSON(layerGeom, {
        style: highlightStyle,
        ['linkLayerId' as any]: layer._leaflet_id, // 添加自定义属性
      });
    }
    if (highlightLayer) {
      this.selectedLayers.push(highlightLayer);
      this.map && this.map.addLayer(highlightLayer);
    }
  }

  private validIsCircle(layer: any, options: L.PolylineOptions, lnglat: L.LatLng) {
    if (layer && layer.getRadius && layer.getLatLng) {
      const center = layer.getLatLng();
      const radius = layer.getRadius();
      // 计算两点距离（单位：米）
      const distance = center.distanceTo(lnglat);

      // 如果点击的是内部，则做处理。否则什么也不做
      if (distance <= radius) {

        const km_value = 1000; // 1千米 = 1000米

        const lnglat = [center.lng, center.lat];
        const turfOptions: any = {
          steps: this.topoOptions.circleStep || 64,
          units: 'kilometers',
          properties: { type: 'circle' }
        };

        const geojson = circle(lnglat, radius / km_value, turfOptions);
        const circleLayer = new L.GeoJSON(geojson, {
          style: options,
          ['linkLayerId' as any]: layer._leaflet_id, // 添加自定义属性
        });

        return { isCircle: true, circleHighLightLayer: circleLayer }
      }
      return { isCircle: true, circleHighLightLayer: null }
    }
    return { isCircle: false, circleHighLightLayer: null }
  }

  private disableMapOpt() {
    // 1：禁用双击地图放大功能（先考虑让用户自己去写，里面不再控制）
    // this.map && this.map.doubleClickZoom.disable();
  }
  private enableMapOpt() {
    // 1：恢复双击地图放大功能（先考虑让用户自己去写，里面不再控制）
    // this.map && this.map.doubleClickZoom.enable();
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
      this.map && this.map.off('click', this.clickHandler);
      this.clickHandler = null;
    }
    this.map && (this.map.getContainer().style.cursor = 'default');
    this.selectedLayers.forEach(layer => {
      this.map!.removeLayer(layer);
      layer.remove();
    });
    // 如果绘制功能实例化了，则移除
    if (this.drawLineLayer) {
      // 关闭监听函数
      this.drawLineListener && this.drawLineLayer.offStateChange(this.drawLineListener)
      this.drawLineListener = null;
      // 关闭图层监听
      this.drawLineLayer.destroy();
      this.drawLineLayer = null;
    }
    this.selectedLayers = [];
    this.enableMapOpt();
    // 释放pick图层的锁（状态）
    this.isPicking = false; //  退出选择状态（false）
  }

  /** 返回选择的全部图层
   *
   *
   * @memberof LeafletTopology
   */
  public getSelectLayers() {
    return this.selectedLayers;
  }

  /**
   * 静态方法：检查指定地图是否处于选择图层状态
   * @param map 地图实例
   * @returns {boolean} 是否正在选择图层
   */
  public static isPicking(map: L.Map): boolean {
    if (!LeafletTopology.instance || !LeafletTopology.instance.map) {
      return false;
    }
    // 确保是同一个地图实例
    if (LeafletTopology.instance.map !== map) {
      return false;
    }
    return LeafletTopology.instance.isPicking;
  }

  /**
     * 完全销毁单例实例
     * 应在页面卸载或组件销毁时调用
     */
  public destroy(): void {
    // 1. 清理所有状态和事件
    this.cleanAll();

    // 2. 移除对地图的引用
    this.map = null;

    // 3. 重置单例实例
    (LeafletTopology as any).instance = null;

  }
}
