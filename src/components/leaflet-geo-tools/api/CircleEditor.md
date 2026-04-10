# CircleEditor - LeafLetGeoTools circle editor

## Overview

`CircleEditor` is a specialized circle drawing and editing component in the LeafLetGeoTools library. It provides efficient circle creation and manipulation capabilities, including center dragging, radius adjustment, snapping, undo/redo, validation, and visual feedback with optional radius-center connection lines.

## Features

### Core Features
- **Circle Drawing**: Click to set center, drag to set radius
- **Real-time Preview**: Mouse movement shows circle preview with radius
- **Center Dragging**: Drag circle center to new position
- **Radius Adjustment**: Drag radius marker to adjust circle size
- **Snapping**: Supports center point and radius position snapping
- **Visual Feedback**: Real-time visual feedback during drawing and editing

### Advanced Features
- **Undo/Redo**: Full history management for drawing and editing
- **Validation**: Minimum radius validation with configurable rules
- **State Management**: Complete state management for drawing/editing/idle states
- **Custom Styles**: Configurable circle styles for different states
- **Visibility Control**: Show/hide circle layers
- **GeoJSON Export**: Export circles as GeoJSON format
- **Event Callbacks**: Rich event system for state changes
- **Radius-Center Line**: Optional dashed line connecting center and radius point

## Basic Usage

```typescript
import{LeafletCircle, EditorState} from 'leaflet-geo-tools';

// Create a circle editor
const circleEditor = new LeafletCircle(map, {
    snap: {
        enabled: true,
        modes: ['vertex', 'edge'],
        tolerance: 8
    },
    edit: {
        enabled: true,
        vertexsMarkerStyle: {
            icon: centerIcon,
            draggable: true
        },
        circle_LinkRadiusAndCenterDashLineOptions: {
            enabled: true,
            dashLineStyle: {
                color: '#ff6b6b',
                weight: 2,
                dashArray: '5,5'
            }
        }
    },
    validation: {
        // Circle-specific validation
    }
});

// Listen for state changes
circleEditor.onStateChange((state) => {
    console.log('Editor state:', state);
    if (state === EditorState.Idle) {
        // Drawing completed
        const geoJson = circleEditor.getGeoJSON();
        console.log('Circle GeoJSON:', geoJson);
    }
});
```

## Configuration Options

### LeafletEditorOptions

```typescript
interface LeafletEditorOptions {
    coordPrecision?: number;           // Coordinate precision, default: 6
    defaultGeometry?: GeoJSON.Geometry; // Default center point
    defaultStyle?: LeafletCircleOptions; // Default circle style
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
    vertexsMarkerStyle: {              // Center and radius marker style
        icon: markerIcon,
        draggable: true,
        pane: 'markerPane'
    },
    circle_LinkRadiusAndCenterDashLineOptions: { // Special circle option
        enabled: true,                  // Enable radius-center line
        dashLineStyle: {
            color: '#ff6b6b',
            weight: 2,
            dashArray: '5,5',
            opacity: 0.7
        }
    }
};
```

### ValidationOptions - Validation Configuration

```typescript
const validationOptions: ValidationOptions = {
    circle_minRadius: 2000,         // min radiuns 2000 meters
};
```

## Complete Configuration Example

```typescript
const circleEditor = new LeafletCircle(map, {
    coordPrecision: 6,
    
    // Default circle style
    defaultStyle: {
        color: '#007bff',
        weight: 3,
        opacity: 1,
        fillColor: '#007bff',
        fillOpacity: 0.3,
        radius: 100 // Default radius in meters
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
                className: 'circle-marker',
                html: `<div style="width: 12px; height: 12px; border-radius: 50%; 
                             background: #fff; border: 2px solid #007bff; 
                             cursor: move;"></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            }),
            draggable: true,
            pane: 'markerPane'
        },
        circle_LinkRadiusAndCenterDashLineOptions: {
            enabled: true,
            dashLineStyle: {
                color: '#28a745',
                weight: 2,
                dashArray: '8,4',
                opacity: 0.8
            }
        }
    },
    
    // Validation configuration
    validation: {
        circle_minRadius: 2000
    }
});
```

## Event Handling

### State Change Events

```typescript
circleEditor.onStateChange((state) => {
    switch (state) {
        case EditorState.Drawing:
            console.log('User is drawing a circle');
            break;
        case EditorState.Editing:
            console.log('User is editing a circle');
            break;
        case EditorState.Idle:
            console.log('Circle drawing/editing completed');
            // Get the result
            const layer = circleEditor.getLayer();
            const geoJson = circleEditor.getGeoJSON();
            console.log('Circle layer:', layer);
            console.log('Circle GeoJSON:', geoJson);
            break;
    }
});
```

### Drawing Result Handling

```typescript
circleEditor.onStateChange((state) => {
    if (state === EditorState.Idle) {
        const result = {
            layer: circleEditor.getLayer(),
            geojson: circleEditor.getGeoJSON(),
            type: 'circle'
        };
        handleDrawResult(result);
    }
});
```

## API Methods

### Core Methods

```typescript
// Get the drawn layer
const layer = circleEditor.getLayer();

// Get GeoJSON data
const geoJson = circleEditor.getGeoJSON(precision);

// Set layer visibility
circleEditor.setLayerVisibility(true);

// Destroy the editor
circleEditor.destroy();

```

### Edit Methods

```typescript
// Check if editing is enabled
const editEnabled = circleEditor.getEditEnabled();

// Update edit options
circleEditor.updateEditOptions({
    enabled: true,
    vertexsMarkerStyle: {
        icon: newMarkerIcon,
        draggable: true
    }
});
```

### Snap Methods

```typescript

// Get current snap options
const snapOptions = circleEditor.getSnapOptions();

// Update snap options / Toggle snap
circleEditor.toggleSnap({
    enabled: true,
    modes: ['vertex'],
    tolerance: 12
});
```

## Drawing Behavior

### Drawing Process
1. **Click**: Set circle center point
2. **Click Again**: Set radius and finish drawing

### Editing Process
1. **Double-click circle**: Enter or exit edit mode
2. **Drag center**: Move circle to new position
3. **Drag radius marker**: Adjust circle radius

## Custom Styling

### Center and Radius Markers

```typescript
const markerIcon = L.divIcon({
    className: 'custom-circle-marker',
    html: `<div style="width: 16px; height: 16px; border-radius: 50%; 
                 background: #007bff; border: 3px solid #fff; 
                 box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});
```

### Radius-Center Connection Line

```typescript
const dashLineOptions = {
    color: '#28a745',
    weight: 2,
    dashArray: '8,4',
    opacity: 0.8
};
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
// Enable radius-center line for better visualization
const editOptions = {
    enabled: true,
    vertexsMarkerStyle: {
        icon: markerIcon,
        draggable: true
    },
    circle_LinkRadiusAndCenterDashLineOptions: {
        enabled: true,
        dashLineStyle: {
            color: '#28a745',
            weight: 2,
            dashArray: '8,4',
            opacity: 0.8
        }
    }
};
```

### 3. **Memory Management**
```typescript
useEffect(() => {
    return () => {
        if (circleEditor) {
            circleEditor.destroy();
        }
    };
}, []);
```

## Troubleshooting

### Common Issues

1. **Circle not appearing**
   - Check if map is properly initialized
   - Verify both center and radius are set
   - Ensure style configuration is correct

2. **Editing not working**
   - Verify edit is enabled in configuration
   - Check if circle is double-clicked to enter edit mode
   - Ensure markers are visible

3. **Snapping not working**
   - Verify snap is enabled
   - Check if other layers exist for snapping
   - Ensure tolerance value is appropriate

4. **Radius adjustment not working**
   - Ensure radius marker is visible
   - Check if radius marker is draggable
   - Verify marker style configuration

## Circle-Specific Features

### Radius-Center Connection Line

The circle editor can display a dashed line connecting the center and radius point:

```typescript
const editOptions = {
    enabled: true,
    circle_LinkRadiusAndCenterDashLineOptions: {
        enabled: true, // Show the connection line
        dashLineStyle: {
            color: '#ff6b6b',
            weight: 2,
            dashArray: '5,5',
            opacity: 0.7
        }
    }
};
```

## Advanced Usage

### Programmatic Circle Creation

```typescript
// Create a circle from center and radius
const center = L.latLng(40.7128, -74.0060);
const radius = 1000; // 1km in meters

const circleEditor = new LeafletCircle(map, {
    defaultGeometry: {
        type: 'Point',
        coordinates: [center.lng, center.lat]
    },
    defaultStyle: {
        radius: radius
    }
});
```

### GeoJSON Format

Circles are exported as GeoJSON using Turf.js's circle method:

```typescript
const geoJson = circleEditor.getGeoJSON();
// Returns: Polygon Feature approximating the circle
// Note: True circles are converted to polygons for GeoJSON compatibility
```

## Dependencies

- Leaflet ^1.9.0
- TypeScript ^4.5.0
- @turf/turf (for spatial operations and GeoJSON conversion)

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

This component is part of the LeafLetGeoTools library and follows the same license terms.
