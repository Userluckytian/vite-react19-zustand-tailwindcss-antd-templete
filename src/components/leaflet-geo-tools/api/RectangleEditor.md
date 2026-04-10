# RectangleEditor - LeafLetGeoTools rectangle editor

## Overview

`RectangleEditor` is a specialized rectangle drawing and editing component in the LeafLetGeoTools library. It provides efficient rectangle creation and manipulation capabilities, including vertex dragging, rectangle dragging, snapping, undo/redo, validation, and visual feedback.

## Features

### Core Features
- **Rectangle Drawing**: Click and drag to draw rectangles
- **Real-time Preview**: Mouse movement shows rectangle preview with snapping
- **Vertex Editing**: Drag corner vertices to adjust rectangle size
- **Rectangle Dragging**: Drag entire rectangle to new position
- **Snapping**: Supports vertex and edge snapping to other geometries
- **Visual Feedback**: Real-time visual feedback during drawing and editing

### Advanced Features
- **Undo/Redo**: Full history management for drawing and editing
- **Validation**: Rectangle validation with configurable rules
- **State Management**: Complete state management for drawing/editing/idle states
- **Custom Styles**: Configurable rectangle styles for different states
- **Visibility Control**: Show/hide rectangle layers
- **GeoJSON Export**: Export rectangles as GeoJSON format
- **Event Callbacks**: Rich event system for state changes

## Basic Usage

```typescript

import { RectangleEditor, EditorState } from 'leaflet-geo-tools';

// Create a rectangle editor
const rectangleEditor = new RectangleEditor(map, {
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
        }
    },
    validation: {
        // Rectangle-specific validation if needed
    }
});

// Listen for state changes
rectangleEditor.onStateChange((state) => {
    console.log('Editor state:', state);
    if (state === EditorState.Idle) {
        // Drawing completed
        const geoJson = rectangleEditor.getGeoJSON();
        console.log('Rectangle GeoJSON:', geoJson);
    }
});
```

## Configuration Options

### LeafletEditorOptions

```typescript
interface LeafletEditorOptions {
    coordPrecision?: number;           // Coordinate precision, default: 6
    defaultGeometry?: GeoJSON.Geometry; // Default geometry (for editing)
    defaultStyle?: LeafletRectangleOptions; // Default rectangle style
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
    }
    // Note: Rectangle editor doesn't use midpoint or edge markers
    // as rectangles have fixed 4-corner structure
};
```

## Complete Configuration Example

```typescript
const rectangleEditor = new RectangleEditor(map, {
    coordPrecision: 6,
    
    // Default rectangle style
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
                className: 'rectangle-vertex-marker',
                html: `<div style="width: 12px; height: 12px; border-radius: 50%; 
                             background: #fff; border: 2px solid #007bff; 
                             cursor: move;"></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            }),
            draggable: true,
            pane: 'markerPane'
        }
    },

});
```

## Event Handling

### State Change Events

```typescript
rectangleEditor.onStateChange((state) => {
    switch (state) {
        case EditorState.Drawing:
            console.log('User is drawing a rectangle');
            break;
        case EditorState.Editing:
            console.log('User is editing a rectangle');
            break;
        case EditorState.Idle:
            console.log('Rectangle drawing/editing completed');
            // Get the result
            const layer = rectangleEditor.getLayer();
            const geoJson = rectangleEditor.getGeoJSON();
            console.log('Rectangle layer:', layer);
            console.log('Rectangle GeoJSON:', geoJson);
            break;
    }
});
```

### Drawing Result Handling

```typescript
rectangleEditor.onStateChange((state) => {
    if (state === EditorState.Idle) {
        const result = {
            layer: rectangleEditor.getLayer(),
            geojson: rectangleEditor.getGeoJSON(),
            type: 'rectangle'
        };
        handleDrawResult(result);
    }
});
```

## API Methods

### Core Methods

```typescript
// Get the drawn layer
const layer = rectangleEditor.getLayer();

// Get GeoJSON data
const geoJson = rectangleEditor.getGeoJSON(precision);

// Set layer visibility
rectangleEditor.setLayerVisibility(false);

// Destroy the editor
rectangleEditor.destroy();

```

### Edit Methods

```typescript
// Check if editing is enabled
const editEnabled = rectangleEditor.getEditEnabled();

// Update edit options
rectangleEditor.updateEditOptions({
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
rectangleEditor.updateSnapOptions({
    enabled: true,
    modes: ['vertex'],
    tolerance: 12
});

// Get current snap options
const snapOptions = rectangleEditor.getSnapOptions();

// Toggle snap
rectangleEditor.toggleSnap({
    enabled: false
});
```

## Drawing Behavior

### Drawing Process
1. **Click and Drag**: Start drawing rectangle from click point
2. **Mouse Move**: Show real-time rectangle preview with snapping
3. **Release Mouse**: Finish drawing and enter idle state

### Editing Process
1. **Double-click rectangle**: Enter edit mode
2. **Drag vertices**: Adjust rectangle size by dragging corners
3. **Drag rectangle**: Move entire rectangle (click and drag interior)
4. **Double-click or press Enter**: Commit changes and exit edit mode

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
    }
};
```

### 3. **Memory Management**
```typescript
useEffect(() => {
    return () => {
        if (rectangleEditor) {
            rectangleEditor.destroy();
        }
    };
}, []);
```

## Troubleshooting

### Common Issues

1. **Rectangle not appearing**
   - Check if map is properly initialized
   - Verify drawing action (click and drag) is completed
   - Ensure style configuration is correct

2. **Editing not working**
   - Verify edit is enabled in configuration
   - Check if rectangle is double-clicked to enter edit mode
   - Ensure vertex markers are visible

3. **Snapping not working**
   - Verify snap is enabled
   - Check if other layers exist for snapping
   - Ensure tolerance value is appropriate

4. **Vertex markers not appearing**
   - Ensure edit mode is activated
   - Check vertex marker style configuration
   - Verify pane configuration is correct

## Rectangle-Specific Features

### Fixed Structure

Unlike polygons, rectangles have a fixed 4-corner structure:
- No midpoint insertion (not needed for rectangles)
- No edge dragging (corners provide sufficient control)
- Simplified editing interface

### Efficient Drawing

Rectangle drawing is optimized for efficiency:
- Single click-and-drag operation
- Real-time preview during drawing
- Automatic corner alignment

### Bounds-based Operations

The rectangle editor uses Leaflet's bounds system:

```typescript
// Rectangle bounds are internally managed as L.LatLngBounds
const bounds = rectangleEditor.getBounds();
// Returns: L.LatLngBounds object

// You can also set bounds programmatically
rectangleEditor.setBounds(bounds);
```

## Advanced Usage

### Programmatic Rectangle Creation

```typescript
// Create a rectangle from bounds
const bounds = L.latLngBounds(
    L.latLng(40.7128, -74.0060),  // Southwest corner
    L.latLng(40.7794, -73.9554)   // Northeast corner
);

const rectangleEditor = new RectangleEditor(map, {
    defaultGeometry: {
        type: 'Polygon',
        coordinates: [[
            [bounds.getSouth(), bounds.getWest()],
            [bounds.getNorth(), bounds.getWest()],
            [bounds.getNorth(), bounds.getEast()],
            [bounds.getSouth(), bounds.getEast()],
            [bounds.getSouth(), bounds.getWest()]
        ]]
    }
});
```

### Rectangle Validation

```typescript
// Custom validation for minimum size
const validationOptions = {
    customValidator: (bounds) => {
        const width = bounds.getEast() - bounds.getWest();
        const height = bounds.getNorth() - bounds.getSouth();
        return width > 0.001 && height > 0.001; // Minimum size in degrees
    }
};
```

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
