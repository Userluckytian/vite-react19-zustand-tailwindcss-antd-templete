import * as L from 'leaflet';
import { modeManager } from '../interaction/InteractionModeManager';
import { queryLayerOnClick } from '../utils/commonUtils';
import { union } from '@turf/turf';

export class LeafletTopology {
  private map: L.Map;
  private selectedLayers: L.Polygon[] = [];
  private highlightStyle = {
    // fillColor: 'rgba(0, 0, 0, 0)',
    color: '#ff0',
    dashArray: '10, 8', // 虚线模式
    // dashOffset: '8', // 虚线偏移量
    fillOpacity: .5,
    // 边框大小
    weight: 2,
  };
  private clickHandler: ((e: L.LeafletMouseEvent) => void) | null = null;

  constructor(map: L.Map) {
    this.map = map;
  }

  /** 选择图层
   *
   *
   * @memberof LeafletTopology
   */
  public select() {
    this.cleanup();
    modeManager.setMode('topo');
    this.map.getContainer().style.cursor = 'pointer';

    this.clickHandler = (e: L.LeafletMouseEvent) => {
      const hits = queryLayerOnClick(this.map, e);
      console.log('hits', hits);
      
      hits.forEach(layer => {
        if (!this.selectedLayers.includes(layer)) {
          this.selectedLayers.push(layer);
          layer.setStyle?.(this.highlightStyle); // 高亮选中
        }
      });
    };

    this.map.on('click', this.clickHandler);
  }

  /** 
   * 执行合并操作 
   * */
  public merge() {
    if (this.selectedLayers.length < 2) {
      throw new Error('请至少选择两个图层进行合并');
    }

    // const features = this.selectedLayers.map(layer => layer.toGeoJSON());
    // const merged = features.reduce((acc, cur) => union(acc, cur));
    // this.selectedLayers.forEach(layer => layer.remove());
    // L.geoJSON(merged).addTo(this.map);

    // this.cleanup();
  }

  /** 
   * 执行线裁剪操作 
   * */
  public clipByLine(lineFeature: any) {
    if (this.selectedLayers.length === 0) {
      throw new Error('请先选择要裁剪的图层');
    }

    // saveClipSelectedLayers(lineFeature, this.selectedLayers);
    this.cleanup();
  }

  /** 清理状态和事件 */
  public cleanup() {
    if (this.clickHandler) {
      this.map.off('click', this.clickHandler);
      this.clickHandler = null;
    }
    this.map.getContainer().style.cursor = 'default';
    this.selectedLayers = [];
    modeManager.reset();
  }
}
