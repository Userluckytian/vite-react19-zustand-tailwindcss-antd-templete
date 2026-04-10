# MarkerPointEditor - LeafLetGeoTools  point editor

## Overview

`MarkerPointEditor` is a point drawing and editing component in the LeafLetGeoTools library. It provides users with the ability to draw, edit, and manage point markers on Leaflet maps, supporting snapping, drag-and-drop, and various configuration options.

## Features

### Core Features
- **Point Drawing**: Click on the map to create point markers
- **Real-time Preview**: Mouse movement shows point position preview with snapping
- **Snapping**: Supports vertex and edge snapping to other geometries
- **Drag & Drop**: Points can be dragged to adjust position
- **Visual Feedback**: Real-time visual feedback during drawing and editing
- **State Management**: Complete state management for drawing/editing/idle states

### Advanced Features
- **Custom Styles**: Configurable point marker styles
- **Visibility Control**: Show/hide point layers
- **GeoJSON Export**: Export points as GeoJSON format
- **Event Callbacks**: Rich event system for state changes

## Basic Usage

```typescript
import { EditorState, MarkerPointEditor } from 'leaflet-geo-tools';

// Create a point editor
const pointEditor = new MarkerPointEditor(map, {
    snap: {
        enabled: true,
        modes: ['vertex', 'edge'],
        tolerance: 8
    },
    defaultStyle: {
        icon: customIcon, // [leafletjs-icon](https://leafletjs.cn/reference.html#icon)
        draggable: true
    }
});

// Listen for state changes
pointEditor.onStateChange((state) => {
    console.log('Editor state:', state);
    if (state === EditorState.Idle) {
        // Drawing completed
        const geoJson = pointEditor.getGeoJSON();
        console.log('Point GeoJSON:', geoJson);
    }
});
```

## Configuration Options

### LeafletEditorOptions

```typescript
interface LeafletEditorOptions {
    coordPrecision?: number;           // Coordinate precision, default: 6
    defaultGeometry?: GeoJSON.Geometry; // Default geometry (for editing)
    defaultStyle?: LeafletMarkerOptions; // Default marker style
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

## Complete Configuration Example

```typescript
const pointEditor = new MarkerPointEditor(map, {
    coordPrecision: 6,
    
    // Default marker style
    defaultStyle: {
        icon: L.divIcon({
            className: 'custom-point-marker',
            html: `<div style="width: 20px; height: 20px; border-radius: 50%; 
                         background: #007bff; border: 2px solid #fff; 
                         box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        }),
        draggable: true,
        opacity: 1
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
});
```

## Event Handling

### State Change Events

```typescript
pointEditor.onStateChange((state) => {
    switch (state) {
        case EditorState.Drawing:
            console.log('User is drawing a point');
            break;
        case EditorState.Editing:
            console.log('User is editing a point');
            break;
        case EditorState.Idle:
            console.log('Point drawing/editing completed');
            // Get the result
            const layer = pointEditor.getLayer();
            const geoJson = pointEditor.getGeoJSON();
            console.log('Point layer:', layer);
            console.log('Point GeoJSON:', geoJson);
            break;
    }
});
```

### Drawing Result Handling

```typescript
// Method 1: Use state change event
const pointEditor = new MarkerPointEditor(map);
pointEditor.onStateChange((state) => {
    if (state === EditorState.Idle) {
        const result = {
            layer: pointEditor.getLayer(),
            geojson: pointEditor.getGeoJSON(),
            type: 'point'
        };
        handleDrawResult(result);
    }
});

```

## API Methods

### Core Methods

```typescript
// Get the drawn layer
const layer = pointEditor.getLayer();

// Get GeoJSON data
const geoJson = pointEditor.getGeoJSON(precision);

// Set layer visibility
pointEditor.setLayerVisibility(false);

// Destroy the editor
pointEditor.destroy();

```

### Snap Methods

```typescript
// Get current snap options
const snapOptions = pointEditor.getSnapOptions();

// Toggle snap / Update snap options
pointEditor.toggleSnap({
    enabled: true,
    modes: ['vertex'],
    tolerance: 12
});
```

## Custom Marker Icons

### Using Leaflet Icons

```typescript
import * as L from 'leaflet';

// Custom div icon
const customIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background: #007bff; width: 24px; height: 24px; 
                 border-radius: 50%; border: 3px solid white; 
                 box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

// Using image icon
const imageIcon = L.icon({
    iconUrl: '/images/marker.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});
```

## Best Practices

### 1. **Memory Management**
```typescript
// Clean up when component unmounts
useEffect(() => {
    return () => {
        if (pointEditor) {
            pointEditor.destroy();
        }
    };
}, []);
```

### 2. **Error Handling**
```typescript
try {
    const pointEditor = new MarkerPointEditor(map, options);
    // ... use editor
} catch (error) {
    console.error('Failed to create point editor:', error);
}
```

### 3. **Performance Optimization**
```typescript
// Use appropriate snap tolerance
const snapOptions = {
    enabled: true,
    tolerance: 8, // Don't set too high to avoid performance issues
    modes: ['vertex'] // Only use needed modes
};
```

### 4. **User Experience**
```typescript
// Provide visual feedback
const pointEditor = new MarkerPointEditor(map, {
    snap: {
        enabled: true,
        highlight: {
            enabled: true, // Always enable for better UX
            pointStyle: {
                // Use contrasting colors
                color: '#ff6b6b',
                fillOpacity: 0.8
            }
        }
    }
});
```

## Troubleshooting

### Common Issues

1. **Point not appearing**
   - Check if map is properly initialized
   - Verify icon configuration
   - Ensure pane is correctly set

2. **Snapping not working**
   - Verify snap is enabled
   - Check if other layers exist for snapping
   - Ensure tolerance value is appropriate

3. **Drag not working**
   - Ensure `draggable: true` in marker options
   - Check if marker pane is correctly configured
   - Verify no CSS conflicts

4. **Performance issues**
   - Reduce snap tolerance
   - Limit snap modes
   - Disable unnecessary highlights

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
