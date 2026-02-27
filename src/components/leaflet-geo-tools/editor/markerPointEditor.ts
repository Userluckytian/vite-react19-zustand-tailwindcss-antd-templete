import { BaseMarkerPointEditor } from "../base/BaseMarkerPointEditor";

export default class MarkerPointEditor extends BaseMarkerPointEditor {
    constructor(map: L.Map, options: L.MarkerOptions = {}, defaultPosition?: L.LatLng) {
        super(map, options, defaultPosition);
    }
}