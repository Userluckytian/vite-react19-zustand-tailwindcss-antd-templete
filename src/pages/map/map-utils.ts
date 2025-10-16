
import type { ZoomOptions } from 'leaflet';
import * as L from 'leaflet';

/** 添加底图缩放控件
 *
 *
 * @export
 * @param {L.Map} map
 * @return {*}  {ZoomControl}
 */
export function addZoomControl(map: L.Map, options: L.Control.ZoomOptions = {
    position: 'bottomleft',
}) {
    const zoomControl =  new L.Control.Zoom(options);
    map.addControl(zoomControl);
    return zoomControl;
}

/** 添加底图比例尺控件
 *
 *
 * @export
 * @param {L.Map} map
 * @return {*}  {scaleControl}
 */
export function addScaleControl(map: L.Map, options: L.Control.ScaleOptions = {
    position: 'bottomleft',
    maxWidth: 100,
    metric: true,
    imperial: false
}): L.Control.Scale {
    const scaleControl = new L.Control.Scale(options);
    map.addControl(scaleControl);
    return scaleControl;
}