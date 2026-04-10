# RectangleEditor - LeafLetGeoTools 矩形编辑器

## 概述

`RectangleEditor` 是 LeafLetGeoTools 库中专门用于绘制和编辑矩形的组件。它提供高效的矩形创建和操作功能，包括顶点拖动、矩形拖动、吸附、撤销/重做、验证和视觉反馈。

## 功能特性

### 核心功能
- **矩形绘制**：点击并拖动绘制矩形
- **实时预览**：鼠标移动时显示带吸附的矩形预览
- **顶点编辑**：拖动角顶点调整矩形大小
- **矩形拖动**：拖动整个矩形到新位置
- **吸附功能**：支持到其他几何图形的顶点和边吸附
- **视觉反馈**：绘制和编辑过程中的实时视觉反馈

### 高级功能
- **撤销/重做**：完整的绘制和编辑历史管理
- **验证功能**：可配置规则的矩形验证
- **状态管理**：完整的绘制/编辑/空闲状态管理
- **自定义样式**：为不同状态配置可自定义的矩形样式
- **可见性控制**：显示/隐藏矩形图层
- **GeoJSON 导出**：将矩形导出为 GeoJSON 格式
- **事件回调**：丰富的状态变更事件系统

## 基本用法

```typescript

import { RectangleEditor, EditorState } from 'leaflet-geo-tools';

// 创建矩形编辑器
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
        // 矩形特定验证（如果需要）
    }
});

// 监听状态变更
rectangleEditor.onStateChange((state) => {
    console.log('编辑器状态:', state);
    if (state === EditorState.Idle) {
        // 绘制完成
        const geoJson = rectangleEditor.getGeoJSON();
        console.log('矩形 GeoJSON:', geoJson);
    }
});
```

## 配置选项

### LeafletEditorOptions

```typescript
interface LeafletEditorOptions {
    coordPrecision?: number;           // 坐标精度，默认: 6
    defaultGeometry?: GeoJSON.Geometry; // 默认几何图形（用于编辑）
    defaultStyle?: LeafletRectangleOptions; // 默认矩形样式
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
    }
    // 注意: 矩形编辑器不使用中点或边标记
    // 因为矩形具有固定的四角结构
};
```

## 完整配置示例

```typescript
const rectangleEditor = new RectangleEditor(map, {
    coordPrecision: 6,
    
    // 默认矩形样式
    defaultStyle: {
        color: '#007bff',
        weight: 3,
        opacity: 1,
        fillColor: '#007bff',
        fillOpacity: 0.3,
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

## 事件处理

### 状态变更事件

```typescript
rectangleEditor.onStateChange((state) => {
    switch (state) {
        case EditorState.Drawing:
            console.log('用户正在绘制矩形');
            break;
        case EditorState.Editing:
            console.log('用户正在编辑矩形');
            break;
        case EditorState.Idle:
            console.log('矩形绘制/编辑完成');
            // 获取结果
            const layer = rectangleEditor.getLayer();
            const geoJson = rectangleEditor.getGeoJSON();
            console.log('矩形图层:', layer);
            console.log('矩形 GeoJSON:', geoJson);
            break;
    }
});
```

### 绘制结果处理

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

## API 方法

### 核心方法

```typescript
// 获取绘制的图层
const layer = rectangleEditor.getLayer();

// 获取 GeoJSON 数据
const geoJson = rectangleEditor.getGeoJSON(precision);

// 设置图层可见性
rectangleEditor.setLayerVisibility(false);

// 销毁编辑器
rectangleEditor.destroy();

```

### 编辑方法

```typescript
// 检查是否启用编辑
const editEnabled = rectangleEditor.getEditEnabled();

// 更新编辑选项
rectangleEditor.updateEditOptions({
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
rectangleEditor.updateSnapOptions({
    enabled: true,
    modes: ['vertex'],
    tolerance: 12
});

// 获取当前吸附选项
const snapOptions = rectangleEditor.getSnapOptions();

// 切换吸附
rectangleEditor.toggleSnap({
    enabled: false
});
```

## 绘制行为

### 绘制过程
1. **点击并拖动**：从点击点开始绘制矩形
2. **鼠标移动**：显示带吸附的实时矩形预览
3. **释放鼠标**：完成绘制并进入空闲状态

### 编辑过程
1. **双击矩形**：进入编辑模式
2. **拖动顶点**：通过拖动角调整矩形大小
3. **拖动矩形**：移动整个矩形（点击并拖动内部）
4. **双击或按 Enter**：提交更改并退出编辑模式

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
// 提供清晰的视觉反馈
const editOptions = {
    enabled: true,
    vertexsMarkerStyle: {
        icon: vertexIcon,
        draggable: true
    }
};
```

### 3. **内存管理**
```typescript
useEffect(() => {
    return () => {
        if (rectangleEditor) {
            rectangleEditor.destroy();
        }
    };
}, []);
```

## 故障排除

### 常见问题

1. **矩形不显示**
   - 检查地图是否正确初始化
   - 验证绘制操作（点击并拖动）已完成
   - 确保样式配置正确

2. **编辑不工作**
   - 验证配置中启用了编辑
   - 检查是否双击矩形进入编辑模式
   - 确保顶点标记可见

3. **吸附不工作**
   - 验证已启用吸附
   - 检查是否存在其他图层用于吸附
   - 确保容差值适当

4. **顶点标记不显示**
   - 确保编辑模式已激活
   - 检查顶点标记样式配置
   - 验证窗格配置正确

## 矩形特定功能

### 固定结构

与多边形不同，矩形具有固定的四角结构：
- 无中点插入（矩形不需要）
- 无边拖动（角点提供足够的控制）
- 简化的编辑界面

### 高效绘制

矩形绘制经过优化以提高效率：
- 单次点击并拖动操作
- 绘制过程中的实时预览
- 自动角对齐

### 基于边界的操作

矩形编辑器使用 Leaflet 的边界系统：

```typescript
// 矩形边界在内部管理为 L.LatLngBounds
const bounds = rectangleEditor.getBounds();
// 返回: L.LatLngBounds 对象

// 您也可以以编程方式设置边界
rectangleEditor.setBounds(bounds);
```

## 高级用法

### 编程方式创建矩形

```typescript
// 从边界创建矩形
const bounds = L.latLngBounds(
    L.latLng(40.7128, -74.0060),  // 西南角
    L.latLng(40.7794, -73.9554)   // 东北角
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

### 矩形验证

```typescript
// 最小尺寸的自定义验证
const validationOptions = {
    customValidator: (bounds) => {
        const width = bounds.getEast() - bounds.getWest();
        const height = bounds.getNorth() - bounds.getSouth();
        return width > 0.001 && height > 0.001; // 最小尺寸（度）
    }
};
```

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
