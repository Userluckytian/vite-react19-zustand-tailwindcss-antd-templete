# CircleEditor - LeafLetGeoTools 圆形编辑器

## 概述

`CircleEditor` 是 LeafLetGeoTools 库中专门用于绘制和编辑圆形的组件。它提供高效的圆形创建和操作功能，包括中心点拖动、半径调整、吸附、撤销/重做、验证以及可选的半径-中心连线视觉反馈。

## 功能特性

### 核心功能
- **圆形绘制**：点击设置圆心，拖动设置半径
- **实时预览**：鼠标移动时显示带半径的圆形预览
- **中心点拖动**：拖动圆心到新位置
- **半径调整**：拖动半径标记调整圆形大小
- **吸附功能**：支持中心点和半径位置的吸附
- **视觉反馈**：绘制和编辑过程中的实时视觉反馈

### 高级功能
- **撤销/重做**：完整的绘制和编辑历史管理
- **验证功能**：可配置规则的最小半径验证
- **状态管理**：完整的绘制/编辑/空闲状态管理
- **自定义样式**：为不同状态配置可自定义的圆形样式
- **可见性控制**：显示/隐藏圆形图层
- **GeoJSON 导出**：将圆形导出为 GeoJSON 格式
- **事件回调**：丰富的状态变更事件系统
- **半径-中心连线**：可选的连接中心和半径点的虚线

## 基本用法

```typescript
import{LeafletCircle, EditorState} from 'leaflet-geo-tools';

// 创建圆形编辑器
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
        // 圆形特定验证
    }
});

// 监听状态变更
circleEditor.onStateChange((state) => {
    console.log('编辑器状态:', state);
    if (state === EditorState.Idle) {
        // 绘制完成
        const geoJson = circleEditor.getGeoJSON();
        console.log('圆形 GeoJSON:', geoJson);
    }
});
```

## 配置选项

### LeafletEditorOptions

```typescript
interface LeafletEditorOptions {
    coordPrecision?: number;           // 坐标精度，默认: 6
    defaultGeometry?: GeoJSON.Geometry; // 默认中心点
    defaultStyle?: LeafletCircleOptions; // 默认圆形样式
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
    vertexsMarkerStyle: {              // 中心和半径标记样式
        icon: markerIcon,
        draggable: true,
        pane: 'markerPane'
    },
    circle_LinkRadiusAndCenterDashLineOptions: { // 圆形特定选项
        enabled: true,                  // 启用半径-中心连线
        dashLineStyle: {
            color: '#ff6b6b',
            weight: 2,
            dashArray: '5,5',
            opacity: 0.7
        }
    }
};
```

### ValidationOptions - 验证配置

```typescript
const validationOptions: ValidationOptions = {
    circle_minRadius: 2000,         // 最小半径 2000 米
};
```

## 完整配置示例

```typescript
const circleEditor = new LeafletCircle(map, {
    coordPrecision: 6,
    
    // 默认圆形样式
    defaultStyle: {
        color: '#007bff',
        weight: 3,
        opacity: 1,
        fillColor: '#007bff',
        fillOpacity: 0.3,
        radius: 100 // 默认半径（米）
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
    
    // 验证配置
    validation: {
        circle_minRadius: 2000
    }
});
```

## 事件处理

### 状态变更事件

```typescript
circleEditor.onStateChange((state) => {
    switch (state) {
        case EditorState.Drawing:
            console.log('用户正在绘制圆形');
            break;
        case EditorState.Editing:
            console.log('用户正在编辑圆形');
            break;
        case EditorState.Idle:
            console.log('圆形绘制/编辑完成');
            // 获取结果
            const layer = circleEditor.getLayer();
            const geoJson = circleEditor.getGeoJSON();
            console.log('圆形图层:', layer);
            console.log('圆形 GeoJSON:', geoJson);
            break;
    }
});
```

### 绘制结果处理

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

## API 方法

### 核心方法

```typescript
// 获取绘制的图层
const layer = circleEditor.getLayer();

// 获取 GeoJSON 数据
const geoJson = circleEditor.getGeoJSON(precision);

// 设置图层可见性
circleEditor.setLayerVisibility(true);

// 销毁编辑器
circleEditor.destroy();

```

### 编辑方法

```typescript
// 检查是否启用编辑
const editEnabled = circleEditor.getEditEnabled();

// 更新编辑选项
circleEditor.updateEditOptions({
    enabled: true,
    vertexsMarkerStyle: {
        icon: newMarkerIcon,
        draggable: true
    }
});
```

### 吸附方法

```typescript

// 获取当前吸附选项
const snapOptions = circleEditor.getSnapOptions();

// 更新吸附选项 / 切换吸附
circleEditor.toggleSnap({
    enabled: true,
    modes: ['vertex'],
    tolerance: 12
});
```

## 绘制行为

### 绘制过程
1. **点击**：设置圆心点
2. **再次点击**：设置半径并完成绘制

### 编辑过程
1. **双击圆形**：进入或退出编辑模式
2. **拖动中心**：移动圆形到新位置
3. **拖动半径标记**：调整圆形半径

## 自定义样式

### 中心和半径标记

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

### 半径-中心连线

```typescript
const dashLineOptions = {
    color: '#28a745',
    weight: 2,
    dashArray: '8,4',
    opacity: 0.8
};
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
```

### 2. **用户体验**
```typescript
// 启用半径-中心连线以获得更好的可视化效果
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

### 3. **内存管理**
```typescript
useEffect(() => {
    return () => {
        if (circleEditor) {
            circleEditor.destroy();
        }
    };
}, []);
```

## 故障排除

### 常见问题

1. **圆形不显示**
   - 检查地图是否正确初始化
   - 验证中心和半径都已设置
   - 确保样式配置正确

2. **编辑不工作**
   - 验证配置中启用了编辑
   - 检查是否双击圆形进入编辑模式
   - 确保标记可见

3. **吸附不工作**
   - 验证已启用吸附
   - 检查是否存在其他图层用于吸附
   - 确保容差值适当

4. **半径调整不工作**
   - 确保半径标记可见
   - 检查半径标记是否可拖动
   - 验证标记样式配置

## 圆形特定功能

### 半径-中心连线

圆形编辑器可以显示连接中心和半径点的虚线：

```typescript
const editOptions = {
    enabled: true,
    circle_LinkRadiusAndCenterDashLineOptions: {
        enabled: true, // 显示连接线
        dashLineStyle: {
            color: '#ff6b6b',
            weight: 2,
            dashArray: '5,5',
            opacity: 0.7
        }
    }
};
```

## 高级用法

### 编程方式创建圆形

```typescript
// 从中心和半径创建圆形
const center = L.latLng(40.7128, -74.0060);
const radius = 1000; // 1公里（米）

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

### GeoJSON 格式

圆形使用 Turf.js 的 circle 方法导出为 GeoJSON：

```typescript
const geoJson = circleEditor.getGeoJSON();
// 返回: 近似圆形的多边形要素
// 注意: 真正的圆形会转换为多边形以兼容 GeoJSON
```

## 依赖项

- Leaflet ^1.9.0
- TypeScript ^4.5.0
- @turf/turf (用于空间操作和 GeoJSON 转换)

## 浏览器支持

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 许可证

此组件是 LeafLetGeoTools 库的一部分，遵循相同的许可条款。
