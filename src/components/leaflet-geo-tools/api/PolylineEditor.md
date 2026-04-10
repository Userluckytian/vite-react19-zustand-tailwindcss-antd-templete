# PolylineEditor - LeafLetGeoTools polyline editor

## Overview

`PolylineEditor` is a polyline drawing and editing component in the LeafLetGeoTools library. It provides comprehensive polyline drawing and editing capabilities, including vertex dragging, midpoint insertion, edge dragging, vertex deletion, snapping, undo/redo, validation, and multi-line support.

## Features

### Core Features
- **Polyline Drawing**: Click to add points, double-click to finish drawing
- **Multi-line Support**: Handle multiple polylines simultaneously
- **Real-time Preview**: Mouse movement shows polyline preview with snapping
- **Vertex Editing**: Drag vertices to adjust polyline shape
- **Midpoint Insertion**: Insert new vertices by dragging midpoint markers
- **Edge Dragging**: Drag entire edge segments to adjust shape
- **Vertex Deletion**: Right-click vertices to delete them
- **Snapping**: Supports vertex and edge snapping to other geometries
- **Visual Feedback**: Real-time visual feedback during drawing and editing

### Advanced Features
- **Undo/Redo**: Full history management for drawing and editing
- **Validation**: Self-intersection validation with configurable rules
- **State Management**: Complete state management for drawing/editing/idle states
- **Custom Styles**: Configurable polyline styles for different states
- **Visibility Control**: Show/hide polyline layers
- **GeoJSON Export**: Export polylines as GeoJSON format
- **Event Callbacks**: Rich event system for state changes

## Basic Usage

```typescript
import { PolylineEditor, EditorState } from 'leaflet-geo-tools';

// Create a polyline editor
const polylineEditor = new PolylineEditor(map, {
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
polylineEditor.onStateChange((state) => {
    console.log('Editor state:', state);
    if (state === EditorState.Idle) {
        // Drawing completed
        const geoJson = polylineEditor.getGeoJSON();
        console.log('Polyline GeoJSON:', geoJson);
    }
});
```

## Configuration Options

### LeafletEditorOptions

```typescript
interface LeafletEditorOptions {
    coordPrecision?: number;           // Coordinate precision, default: 6
    defaultGeometry?: GeoJSON.Geometry; // Default geometry (for editing)
    defaultStyle?: LeafletPolylineOptions; // Default polyline style
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
    validErrorLineStyle: {              // Error style for invalid polylines
        color: '#ff0000',
        weight: 3,
        dashArray: '5,5'
    }
};
```

## Complete Configuration Example

```typescript
const polylineEditor = new PolylineEditor(map, {
    coordPrecision: 6,
    
    // Default polyline style
    defaultStyle: {
        color: '#007bff',
        weight: 3,
        opacity: 1,
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
                className: 'polyline-vertex-marker',
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
                    className: 'polyline-midpoint-marker',
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
                    className: 'polyline-edge-marker',
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
        validErrorLineStyle: {
            color: '#dc3545',
            weight: 3,
            dashArray: '8,4',
            opacity: 0.8
        }
    }
});
```

## Event Handling

### State Change Events

```typescript
polylineEditor.onStateChange((state) => {
    switch (state) {
        case EditorState.Drawing:
            console.log('User is drawing a polyline');
            break;
        case EditorState.Editing:
            console.log('User is editing a polyline');
            break;
        case EditorState.Idle:
            console.log('Polyline drawing/editing completed');
            // Get the result
            const layer = polylineEditor.getLayer();
            const geoJson = polylineEditor.getGeoJSON();
            console.log('Polyline layer:', layer);
            console.log('Polyline GeoJSON:', geoJson);
            break;
    }
});
```

### Drawing Result Handling

```typescript
polylineEditor.onStateChange((state) => {
    if (state === EditorState.Idle) {
        const result = {
            layer: polylineEditor.getLayer(),
            geojson: polylineEditor.getGeoJSON(),
            type: 'polyline'
        };
        handleDrawResult(result);
    }
});
```

## API Methods

### Core Methods

```typescript
// Get the drawn layer
const layer = polylineEditor.getLayer();

// Get GeoJSON data
const geoJson = polylineEditor.getGeoJSON(precision);

// Set layer visibility
polylineEditor.setLayerVisibility(true);

// Destroy the editor
polylineEditor.destroy();

```

### Edit Methods

```typescript
// Check if editing is enabled
const editEnabled = polylineEditor.getEditEnabled();

// Update edit options
polylineEditor.updateEditOptions({
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
polylineEditor.updateSnapOptions({
    enabled: true,
    modes: ['vertex'],
    tolerance: 12
});

// Get current snap options
const snapOptions = polylineEditor.getSnapOptions();

// Toggle snap
polylineEditor.toggleSnap({
    enabled: false
});
```

## Drawing Behavior

### Drawing Process
1. **Click**: Add a vertex to the polyline
2. **Mouse Move**: Show real-time preview with snapping
3. **Double-click**: Finish drawing and enter idle state
4. **Undo**: Use `undoDraw()` to remove last vertex during drawing

### Editing Process
1. **Double-click polyline**: Enter edit mode
2. **Drag vertices**: Adjust polyline shape
3. **Drag midpoints**: Insert new vertices
4. **Drag edges**: Move entire edge segments
5. **Right-click vertices**: Delete vertices (minimum 2 vertices required)
6. **Double-click or press Enter**: Commit changes and exit edit mode

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

// Limit vertex markers for complex polylines
const editOptions = {
    enabled: true,
    dragMidMarkerOptions: {
        enabled: false // Disable for better performance
    }
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
        if (polylineEditor) {
            polylineEditor.destroy();
        }
    };
}, []);
```

## Troubleshooting

### Common Issues

1. **Polyline not appearing**
   - Check if map is properly initialized
   - Verify at least 2 points are added
   - Ensure style configuration is correct

2. **Editing not working**
   - Verify edit is enabled in configuration
   - Check if polyline is double-clicked to enter edit mode
   - Ensure vertex markers are visible

3. **Snapping not working**
   - Verify snap is enabled
   - Check if other layers exist for snapping
   - Ensure tolerance value is appropriate

4. **Performance issues with complex polylines**
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
