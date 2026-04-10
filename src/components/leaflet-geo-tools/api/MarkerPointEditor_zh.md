# MarkerPointEditor - LeafLetGeoTools 点编辑器

## 概述

`MarkerPointEditor` 是 LeafLetGeoTools 库中用于绘制和编辑点的组件。它为用户提供在 Leaflet 地图上绘制、编辑和管理点标记的能力，支持吸附、拖放和各种配置选项。

## 功能特性

### 核心功能
- **点绘制**：在地图上点击创建点标记
- **实时预览**：鼠标移动时显示带吸附的点位置预览
- **吸附功能**：支持到其他几何图形的顶点和边吸附
- **拖放功能**：点可以拖动以调整位置
- **视觉反馈**：绘制和编辑过程中的实时视觉反馈
- **状态管理**：完整的绘制/编辑/空闲状态管理

### 高级功能
- **自定义样式**：可配置的点标记样式
- **可见性控制**：显示/隐藏点图层
- **GeoJSON 导出**：将点导出为 GeoJSON 格式
- **事件回调**：丰富的状态变更事件系统

## 基本用法

```typescript
import { EditorState, MarkerPointEditor } from 'leaflet-geo-tools';

// 创建点编辑器
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

// 监听状态变更
pointEditor.onStateChange((state) => {
    console.log('编辑器状态:', state);
    if (state === EditorState.Idle) {
        // 绘制完成
        const geoJson = pointEditor.getGeoJSON();
        console.log('点 GeoJSON:', geoJson);
    }
});
```

## 配置选项

### LeafletEditorOptions

```typescript
interface LeafletEditorOptions {
    coordPrecision?: number;           // 坐标精度，默认: 6
    defaultGeometry?: GeoJSON.Geometry; // 默认几何图形（用于编辑）
    defaultStyle?: LeafletMarkerOptions; // 默认标记样式
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

## 完整配置示例

```typescript
const pointEditor = new MarkerPointEditor(map, {
    coordPrecision: 6,
    
    // 默认标记样式
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
});
```

## 事件处理

### 状态变更事件

```typescript
pointEditor.onStateChange((state) => {
    switch (state) {
        case EditorState.Drawing:
            console.log('用户正在绘制点');
            break;
        case EditorState.Editing:
            console.log('用户正在编辑点');
            break;
        case EditorState.Idle:
            console.log('点绘制/编辑完成');
            // 获取结果
            const layer = pointEditor.getLayer();
            const geoJson = pointEditor.getGeoJSON();
            console.log('点图层:', layer);
            console.log('点 GeoJSON:', geoJson);
            break;
    }
});
```

### 绘制结果处理

```typescript
// 方法 1: 使用状态变更事件
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

## API 方法

### 核心方法

```typescript
// 获取绘制的图层
const layer = pointEditor.getLayer();

// 获取 GeoJSON 数据
const geoJson = pointEditor.getGeoJSON(precision);

// 设置图层可见性
pointEditor.setLayerVisibility(false);

// 销毁编辑器
pointEditor.destroy();

```

### 吸附方法

```typescript
// 获取当前吸附选项
const snapOptions = pointEditor.getSnapOptions();

// 切换吸附 / 更新吸附选项
pointEditor.toggleSnap({
    enabled: true,
    modes: ['vertex'],
    tolerance: 12
});
```

## 自定义标记图标

### 使用 Leaflet 图标

```typescript
import * as L from 'leaflet';

// 自定义 div 图标
const customIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background: #007bff; width: 24px; height: 24px; 
                 border-radius: 50%; border: 3px solid white; 
                 box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

// 使用图片图标
const imageIcon = L.icon({
    iconUrl: '/images/marker.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});
```

## 最佳实践

### 1. **内存管理**
```typescript
// 组件卸载时清理
useEffect(() => {
    return () => {
        if (pointEditor) {
            pointEditor.destroy();
        }
    };
}, []);
```

### 2. **错误处理**
```typescript
try {
    const pointEditor = new MarkerPointEditor(map, options);
    // ... 使用编辑器
} catch (error) {
    console.error('创建点编辑器失败:', error);
}
```

### 3. **性能优化**
```typescript
// 使用适当的吸附容差
const snapOptions = {
    enabled: true,
    tolerance: 8, // 不要设置太高以避免性能问题
    modes: ['vertex'] // 仅使用需要的模式
};
```

### 4. **用户体验**
```typescript
// 提供视觉反馈
const pointEditor = new MarkerPointEditor(map, {
    snap: {
        enabled: true,
        highlight: {
            enabled: true, // 始终启用以获得更好的用户体验
            pointStyle: {
                // 使用对比色
                color: '#ff6b6b',
                fillOpacity: 0.8
            }
        }
    }
});
```

## 故障排除

### 常见问题

1. **点不显示**
   - 检查地图是否正确初始化
   - 验证图标配置
   - 确保窗格设置正确

2. **吸附不工作**
   - 验证已启用吸附
   - 检查是否存在其他图层用于吸附
   - 确保容差值适当

3. **拖动不工作**
   - 确保标记选项中设置了 `draggable: true`
   - 检查标记窗格是否正确配置
   - 验证没有 CSS 冲突

4. **性能问题**
   - 减少吸附容差
   - 限制吸附模式
   - 禁用不必要的高亮

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
