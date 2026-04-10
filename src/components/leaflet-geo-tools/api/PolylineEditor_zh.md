# PolylineEditor - LeafLetGeoTools 折线编辑器

## 概述

`PolylineEditor` 是 LeafLetGeoTools 库中用于绘制和编辑折线的组件。它提供全面的折线绘制和编辑功能，包括顶点拖动、中点插入、边拖动、顶点删除、吸附、撤销/重做、验证和多线支持。

## 功能特性

### 核心功能
- **折线绘制**：点击添加点，双击完成绘制
- **多线支持**：同时处理多条折线
- **实时预览**：鼠标移动时显示带吸附的折线预览
- **顶点编辑**：拖动顶点调整折线形状
- **中点插入**：通过拖动中点标记插入新顶点
- **边拖动**：拖动整个边段调整形状
- **顶点删除**：右键单击顶点删除它们
- **吸附功能**：支持到其他几何图形的顶点和边吸附
- **视觉反馈**：绘制和编辑过程中的实时视觉反馈

### 高级功能
- **撤销/重做**：完整的绘制和编辑历史管理
- **验证功能**：可配置规则的自相交验证
- **状态管理**：完整的绘制/编辑/空闲状态管理
- **自定义样式**：为不同状态配置可自定义的折线样式
- **可见性控制**：显示/隐藏折线图层
- **GeoJSON 导出**：将折线导出为 GeoJSON 格式
- **事件回调**：丰富的状态变更事件系统

## 基本用法

```typescript
import { PolylineEditor, EditorState } from 'leaflet-geo-tools';

// 创建折线编辑器
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

// 监听状态变更
polylineEditor.onStateChange((state) => {
    console.log('编辑器状态:', state);
    if (state === EditorState.Idle) {
        // 绘制完成
        const geoJson = polylineEditor.getGeoJSON();
        console.log('折线 GeoJSON:', geoJson);
    }
});
```

## 配置选项

### LeafletEditorOptions

```typescript
interface LeafletEditorOptions {
    coordPrecision?: number;           // 坐标精度，默认: 6
    defaultGeometry?: GeoJSON.Geometry; // 默认几何图形（用于编辑）
    defaultStyle?: LeafletPolylineOptions; // 默认折线样式
    snap?: SnapOptions;                // 吸附配置
    edit?: EditOptionsExpends;         // 编辑配置
    validation?: ValidationOptions;    // 验证配置
}
```

### SnapOptions - 吸附配置

```typescript
const snapOptions: SnapOptions = {
    enabled: true,                     // 启用吸附
    modes: ['vertex', 'edge'],         // 吸附模式: vertex/edge
    tolerance: 8,                      // 吸附容差（像素）
    highlight: {                       // 吸附目标的高亮样式
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

### EditOptionsExpends - 编辑配置

```typescript
const editOptions: EditOptionsExpends = {
    enabled: true,                     // 启用编辑
    vertexsMarkerStyle: {              // 顶点标记样式
        icon: vertexIcon,
        draggable: true,
        pane: 'markerPane'
    },
    dragMidMarkerOptions: {            // 中点标记选项
        enabled: true,
        positionRatio: 0.3,            // 边上的位置比例 (0-1)
        dragMarkerStyle: {
            icon: midpointIcon,
            draggable: true,
            pane: 'markerPane'
        }
    },
    dragLineMarkerOptions: {           // 边拖动标记选项
        enabled: true,
        positionRatio: 0.6,            // 边上的位置比例 (0-1)
        dragMarkerStyle: {
            icon: edgeIcon,
            draggable: true,
            pane: 'markerPane'
        }
    }
};
```

### ValidationOptions - 验证配置

```typescript
const validationOptions: ValidationOptions = {
    allowSelfIntersect: false,         // 允许自相交
    validErrorLineStyle: {              // 无效折线的错误样式
        color: '#ff0000',
        weight: 3,
        dashArray: '5,5'
    }
};
```

## 完整配置示例

```typescript
const polylineEditor = new PolylineEditor(map, {
    coordPrecision: 6,
    
    // 默认折线样式
    defaultStyle: {
        color: '#007bff',
        weight: 3,
        opacity: 1,
        dashArray: null
    },
    
    // 吸附配置
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
    
    // 编辑配置
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
    
    // 验证配置
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

## 事件处理

### 状态变更事件

```typescript
polylineEditor.onStateChange((state) => {
    switch (state) {
        case EditorState.Drawing:
            console.log('用户正在绘制折线');
            break;
        case EditorState.Editing:
            console.log('用户正在编辑折线');
            break;
        case EditorState.Idle:
            console.log('折线绘制/编辑完成');
            // 获取结果
            const layer = polylineEditor.getLayer();
            const geoJson = polylineEditor.getGeoJSON();
            console.log('折线图层:', layer);
            console.log('折线 GeoJSON:', geoJson);
            break;
    }
});
```

### 绘制结果处理

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

## API 方法

### 核心方法

```typescript
// 获取绘制的图层
const layer = polylineEditor.getLayer();

// 获取 GeoJSON 数据
const geoJson = polylineEditor.getGeoJSON(precision);

// 设置图层可见性
polylineEditor.setLayerVisibility(true);

// 销毁编辑器
polylineEditor.destroy();

```

### 编辑方法

```typescript
// 检查是否启用编辑
const editEnabled = polylineEditor.getEditEnabled();

// 更新编辑选项
polylineEditor.updateEditOptions({
    enabled: true,
    vertexsMarkerStyle: {
        icon: newVertexIcon,
        draggable: true
    }
});
```

### 吸附方法

```typescript
// 更新吸附选项
polylineEditor.updateSnapOptions({
    enabled: true,
    modes: ['vertex'],
    tolerance: 12
});

// 获取当前吸附选项
const snapOptions = polylineEditor.getSnapOptions();

// 切换吸附
polylineEditor.toggleSnap({
    enabled: false
});
```

## 绘制行为

### 绘制过程
1. **点击**：向折线添加顶点
2. **鼠标移动**：显示带吸附的实时预览
3. **双击**：完成绘制并进入空闲状态
4. **撤销**：在绘制过程中使用 `undoDraw()` 移除最后一个顶点

### 编辑过程
1. **双击折线**：进入编辑模式
2. **拖动顶点**：调整折线形状
3. **拖动中点**：插入新顶点
4. **拖动边**：移动整个边段
5. **右键单击顶点**：删除顶点（最少需要 2 个顶点）
6. **双击或按 Enter**：提交更改并退出编辑模式

## 自定义样式

### 顶点标记

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

### 中点标记

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

### 边标记

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

## 最佳实践

### 1. **性能优化**
```typescript
// 使用适当的吸附容差
const snapOptions = {
    enabled: true,
    tolerance: 8, // 不要设置太高以避免性能问题
    modes: ['vertex'] // 仅使用需要的模式
};

// 为复杂折线限制顶点标记
const editOptions = {
    enabled: true,
    dragMidMarkerOptions: {
        enabled: false // 禁用以获得更好的性能
    }
};
```

### 2. **用户体验**
```typescript
// 提供清晰的视觉反馈
const editOptions = {
    enabled: true,
    vertexsMarkerStyle: {
        icon: vertexIcon,
        draggable: true
    },
    dragMidMarkerOptions: {
        enabled: true,
        positionRatio: 0.3 // 在可用性和准确性之间取得良好平衡
    }
};
```

### 3. **内存管理**
```typescript
useEffect(() => {
    return () => {
        if (polylineEditor) {
            polylineEditor.destroy();
        }
    };
}, []);
```

## 故障排除

### 常见问题

1. **折线不显示**
   - 检查地图是否正确初始化
   - 验证至少添加了 2 个点
   - 确保样式配置正确

2. **编辑不工作**
   - 验证配置中启用了编辑
   - 检查是否双击折线进入编辑模式
   - 确保顶点标记可见

3. **吸附不工作**
   - 验证已启用吸附
   - 检查是否存在其他图层用于吸附
   - 确保容差值适当

4. **复杂折线的性能问题**
   - 减少吸附容差
   - 禁用中点标记
   - 限制顶点标记数量

## 依赖项

- Leaflet ^1.9.0
- TypeScript ^4.5.0
- @turf/turf (用于空间操作)

## 浏览器支持

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 许可证

此组件是 LeafLetGeoTools 库的一部分，遵循相同的许可条款。
