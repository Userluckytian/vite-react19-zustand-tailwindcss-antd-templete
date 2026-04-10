# PolygonEditor - LeafLetGeoTools polygon editor

## Overview

`PolygonEditor` is a comprehensive polygon drawing and editing component in the LeafLetGeoTools library. It provides advanced polygon creation and manipulation capabilities, including vertex dragging, midpoint insertion, edge dragging, vertex deletion, polygon dragging, snapping, undo/redo, validation, and multi-polygon support.

## Features

### Core Features
- **Polygon Drawing**: Click to add vertices, double-click to finish drawing
- **Multi-polygon Support**: Handle multiple polygons and holes simultaneously
- **Real-time Preview**: Mouse movement shows polygon preview with snapping
- **Vertex Editing**: Drag vertices to adjust polygon shape
- **Midpoint Insertion**: Insert new vertices by dragging midpoint markers
- **Edge Dragging**: Drag entire edge segments to adjust shape
- **Vertex Deletion**: Right-click vertices to delete them
- **Polygon Dragging**: Drag entire polygon to new position
- **Snapping**: Supports vertex and edge snapping to other geometries
- **Visual Feedback**: Real-time visual feedback during drawing and editing

### Advanced Features
- **Undo/Redo**: Full history management for drawing and editing
- **Validation**: Self-intersection validation with configurable rules
- **State Management**: Complete state management for drawing/editing/idle states
- **Custom Styles**: Configurable polygon styles for different states
- **Visibility Control**: Show/hide polygon layers
- **GeoJSON Export**: Export polygons as GeoJSON format
- **Event Callbacks**: Rich event system for state changes
- **Hole Support**: Create and edit polygon holes

## Basic Usage

```typescript
import {EditorState, PolygonEditor} from 'leaflet-geo-tools';

// Create a polygon editor
const polygonEditor = new PolygonEditor(map, {
    snap: {
        enabled: true,
        modes: ['vertex', 'edge'],
        tolerance: 8
    },
    edit: {
        enabled: true,
        vertexsMarkerStyle: {
            icon: vertexIcon,
            draggable: true
        },
        dragMidMarkerOptions: {
            enabled: true,
            positionRatio: 0.3
        },
        dragLineMarkerOptions: {
            enabled: true,
            positionRatio: 0.6
        }
    },
    validation: {
        allowSelfIntersect: false
    }
});

// Listen for state changes
polygonEditor.onStateChange((state) => {
    console.log('Editor state:', state);
    if (state === EditorState.Idle) {
        // Drawing completed
        const geoJson = polygonEditor.getGeoJSON();
        console.log('Polygon GeoJSON:', geoJson);
    }
});
```

## Configuration Options

### LeafletEditorOptions

```typescript
interface LeafletEditorOptions {
    coordPrecision?: number;           // Coordinate precision, default: 6
    defaultGeometry?: GeoJSON.Geometry; // Default geometry (for editing)
    defaultStyle?: LeafletPolygonOptions; // Default polygon style
    snap?: SnapOptions;                // Snap configuration
    edit?: EditOptionsExpends;         // Edit configuration
    validation?: ValidationOptions;    // Validation configuration
}
```

### SnapOptions - Snapping Configuration

```typescript
const snapOptions: SnapOptions = {
    enabled: true,                     // Enable snapping
    modes: ['vertex', 'edge'],         // Snap modes: vertex/edge
    tolerance: 8,                      // Snap tolerance in pixels
    highlight: {                       // Highlight style for snap targets
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
```

### EditOptionsExpends - Edit Configuration

```typescript
const editOptions: EditOptionsExpends = {
    enabled: true,                     // Enable editing
    vertexsMarkerStyle: {              // Vertex marker style
        icon: vertexIcon,
        draggable: true,
        pane: 'markerPane'
    },
    dragMidMarkerOptions: {            // Midpoint marker options
        enabled: true,
        positionRatio: 0.3,            // Position ratio on edge (0-1)
        dragMarkerStyle: {
            icon: midpointIcon,
            draggable: true,
            pane: 'markerPane'
        }
    },
    dragLineMarkerOptions: {           // Edge dragging marker options
        enabled: true,
        positionRatio: 0.6,            // Position ratio on edge (0-1)
        dragMarkerStyle: {
            icon: edgeIcon,
            draggable: true,
            pane: 'markerPane'
        }
    }
};
```

### ValidationOptions - Validation Configuration

```typescript
const validationOptions: ValidationOptions = {
    allowSelfIntersect: false,         // Allow self-intersection
    validErrorPolygonStyle: {          // Error style for invalid polygons
        color: '#ff0000',
        weight: 3,
        dashArray: '5,5',
        fillOpacity: 0.2
    }
};
```

## Complete Configuration Example

```typescript
const polygonEditor = new PolygonEditor(map, {
    coordPrecision: 6,
    
    // Default polygon style
    defaultStyle: {
        color: '#007bff',
        weight: 3,
        opacity: 1,
        fillColor: '#007bff',
        fillOpacity: 0.3,
        dashArray: null
    },
    
    // Snap configuration
    snap: {
        enabled: true,
        modes: ['vertex', 'edge'],
        tolerance: 10,
        highlight: {
            enabled: true,
            pointStyle: {
                radius: 12,
                color: '#ff6b6b',
                weight: 3,
                fillOpacity: 0.6,
                pane: 'mapPane'
            },
            edgeStyle: {
                color: '#ff6b6b',
                weight: 4,
                dashArray: '6,3',
                pane: 'mapPane'
            }
        }
    },
    
    // Edit configuration
    edit: {
        enabled: true,
        vertexsMarkerStyle: {
            icon: L.divIcon({
                className: 'polygon-vertex-marker',
                html: `<div style="width: 12px; height: 12px; border-radius: 50%; 
                             background: #fff; border: 2px solid #007bff; 
                             cursor: move;"></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            }),
            draggable: true,
            pane: 'markerPane'
        },
        dragMidMarkerOptions: {
            enabled: true,
            positionRatio: 0.3,
            dragMarkerStyle: {
                icon: L.divIcon({
                    className: 'polygon-midpoint-marker',
                    html: `<div style="width: 10px; height: 10px; border-radius: 50%; 
                                 background: #28a745; border: 2px solid #fff; 
                                 cursor: pointer;"></div>`,
                    iconSize: [10, 10],
                    iconAnchor: [5, 5]
                }),
                draggable: true,
                pane: 'markerPane'
            }
        },
        dragLineMarkerOptions: {
            enabled: true,
            positionRatio: 0.6,
            dragMarkerStyle: {
                icon: L.divIcon({
                    className: 'polygon-edge-marker',
                    html: `<div style="width: 14px; height: 14px; border-radius: 50%; 
                                 background: #ffc107; border: 2px solid #fff; 
                                 cursor: move;"></div>`,
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                }),
                draggable: true,
                pane: 'markerPane'
            }
        }
    },
    
    // Validation configuration
    validation: {
        allowSelfIntersect: false,
        validErrorPolygonStyle: {
            color: '#dc3545',
            weight: 3,
            dashArray: '8,4',
            fillOpacity: 0.2,
            fillColor: '#dc3545'
        }
    }
});
```

## Event Handling

### State Change Events

```typescript
polygonEditor.onStateChange((state) => {
    switch (state) {
        case EditorState.Drawing:
            console.log('User is drawing a polygon');
            break;
        case EditorState.Editing:
            console.log('User is editing a polygon');
            break;
        case EditorState.Idle:
            console.log('Polygon drawing/editing completed');
            // Get the result
            const layer = polygonEditor.getLayer();
            const geoJson = polygonEditor.getGeoJSON();
            console.log('Polygon layer:', layer);
            console.log('Polygon GeoJSON:', geoJson);
            break;
    }
});
```

### Drawing Result Handling

```typescript
polygonEditor.onStateChange((state) => {
    if (state === EditorState.Idle) {
        const result = {
            layer: polygonEditor.getLayer(),
            geojson: polygonEditor.getGeoJSON(),
            type: 'polygon'
        };
        handleDrawResult(result);
    }
});
```

## API Methods

### Core Methods

```typescript
// Get the drawn layer
const layer = polygonEditor.getLayer();

// Get GeoJSON data
const geoJson = polygonEditor.getGeoJSON(precision);

// Set layer visibility
polygonEditor.setLayerVisibility(false);

// Destroy the editor
polygonEditor.destroy();

```

### Edit Methods

```typescript
// Check if editing is enabled
const editEnabled = polygonEditor.getEditEnabled();

// Update edit options
polygonEditor.updateEditOptions({
    enabled: true,
    vertexsMarkerStyle: {
        icon: newVertexIcon,
        draggable: true
    }
});
```

### Snap Methods

```typescript
// Update snap options
polygonEditor.updateSnapOptions({
    enabled: true,
    modes: ['vertex'],
    tolerance: 12
});

// Get current snap options
const snapOptions = polygonEditor.getSnapOptions();

// Toggle snap
polygonEditor.toggleSnap({
    enabled: false
});
```

## Drawing Behavior

### Drawing Process
1. **Click**: Add a vertex to the polygon
2. **Mouse Move**: Show real-time preview with snapping
3. **Double-click**: Finish drawing and enter idle state
4. **Undo**: Use `undoDraw()` to remove last vertex during drawing

### Editing Process
1. **Double-click polygon**: Enter edit mode
2. **Drag vertices**: Adjust polygon shape
3. **Drag midpoints**: Insert new vertices
4. **Drag edges**: Move entire edge segments
5. **Drag polygon**: Move entire polygon (click and drag interior)
6. **Right-click vertices**: Delete vertices (minimum 3 vertices required)
7. **Double-click**: Commit changes and exit edit mode

## Custom Styling

### Vertex Markers

```typescript
const vertexIcon = L.divIcon({
    className: 'custom-vertex-marker',
    html: `<div style="width: 16px; height: 16px; border-radius: 50%; 
                 background: #007bff; border: 3px solid #fff; 
                 box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});
```

### Midpoint Markers

```typescript
const midpointIcon = L.divIcon({
    className: 'custom-midpoint-marker',
    html: `<div style="width: 12px; height: 12px; border-radius: 50%; 
                 background: #28a745; border: 2px solid #fff; 
                 cursor: pointer;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});
```

### Edge Markers

```typescript
const edgeIcon = L.divIcon({
    className: 'custom-edge-marker',
    html: `<div style="width: 14px; height: 14px; border-radius: 50%; 
                 background: #ffc107; border: 2px solid #fff; 
                 cursor: move;"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
});
```

## Best Practices

### 1. **Performance Optimization**
```typescript
// Use appropriate snap tolerance
const snapOptions = {
    enabled: true,
    tolerance: 8, // Don't set too high to avoid performance issues
    modes: ['vertex'] // Only use needed modes
};

```

### 2. **User Experience**
```typescript
// Provide clear visual feedback
const editOptions = {
    enabled: true,
    vertexsMarkerStyle: {
        icon: vertexIcon,
        draggable: true
    },
    dragMidMarkerOptions: {
        enabled: true,
        positionRatio: 0.3 // Good balance between usability and accuracy
    }
};
```

### 3. **Memory Management**
```typescript
useEffect(() => {
    return () => {
        if (polygonEditor) {
            polygonEditor.destroy();
        }
    };
}, []);
```

## Troubleshooting

### Common Issues

1. **Polygon not appearing**
   - Check if map is properly initialized
   - Verify at least 3 points are added
   - Ensure style configuration is correct

2. **Editing not working**
   - Verify edit is enabled in configuration
   - Check if polygon is double-clicked to enter edit mode
   - Ensure vertex markers are visible

3. **Snapping not working**
   - Verify snap is enabled
   - Check if other layers exist for snapping
   - Ensure tolerance value is appropriate

4. **Performance issues with complex polygons**
   - Reduce snap tolerance
   - Disable midpoint markers
   - Limit vertex marker count

## Dependencies

- Leaflet ^1.9.0
- TypeScript ^4.5.0
- @turf/turf (for spatial operations)

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

This component is part of the LeafLetGeoTools library and follows the same license terms.
