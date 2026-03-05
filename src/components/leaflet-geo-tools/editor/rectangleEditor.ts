
import { BaseEditor } from "../base/BaseEditor";
import type { LeafletEditorOptions } from "../types";

export default class RectangleEditor extends BaseEditor<L.Rectangle> {
    protected initLayer<U extends L.LayerOptions>(layerOptions: U, geometry?: GeoJSON.Geometry | L.LatLng): void {
        throw new Error("Method not implemented.");
    }
    protected renderLayer(coords: any[], valid: boolean): void {
        throw new Error("Method not implemented.");
    }
    protected vertexMarkers: any[];
    protected midpointMarkers: any[];
    protected historyStack: any[];
    protected redoStack: any[];
    protected getCurrentMarkerCoords() {
        throw new Error("Method not implemented.");
    }
    protected reBuildMarker(coords: any[]): void {
        throw new Error("Method not implemented.");
    }
    protected updateMidpoints(skipMarker?: L.Marker): void {
        throw new Error("Method not implemented.");
    }
    protected reBuildMarkerAndRender(coordinatesArray: any): void {
        throw new Error("Method not implemented.");
    }

    constructor(map: L.Map, options?: LeafletEditorOptions) {
        super(map, options);
    }

    protected createEditorLayer() { }

    protected bindMapEvents() { }

    protected offMapEvents() { }

    protected setLayerVisibility() { }

    protected updateEditOptions() { }

    protected enterEditMode() { }

    protected exitEditMode() { }

    protected undoEdit(): void { }

    protected redoEdit(): void { }
    
    protected resetToInitial(): void { }
    
    protected commitEdit(): void { }

}