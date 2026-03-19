# 如何实现继承BaseEditor类 - PolylineEditor

## 🎯 学习引导：跟着我的思路思考

在开始代码实现之前，我想先引导你理解整个实现思路。这样你不仅能看懂代码，更能理解为什么这样设计。

### 第一步：理解我们要做什么

想象一下你在地图上画一条折线，需要哪些功能？

1. **绘制阶段**：用户点击地图 → 记录点 → 连接成线 → 双击完成
2. **编辑阶段**：用户双击已画的线 → 显示控制点 → 拖动修改 → 保存结果

### 💡 关键思路分解：

**绘制 = 鼠标事件 + 临时存储 + 实时渲染**
**编辑 = 激活检测 + 控制点创建 + 拖动处理 + 历史管理**

### 第二步：绘制功能的思考路径

#### 🤔 思考问题1：如何让用户能画线？

**我的思路**：
1. 用户点击地图时，我需要知道点击了哪里 → **监听click事件**
2. 点击的位置需要保存起来 → **用数组tempCoords存储**
3. 用户需要看到正在画的线 → **实时渲染预览**
4. 什么时候算画完？ → **双击事件触发完成**

**你思考**：
- 如果用户画错了怎么办？🤔
- 如果用户画的线自己相交了怎么办？🤔
- 如何让用户知道当前画的是否有效？🤔

#### 🤔 思考问题2：如何实现实时预览？

**我的思路**：
1. 用户移动鼠标时，我知道当前位置 → **监听mousemove事件**
2. 我已经有之前点击的点 + 当前鼠标位置 = 一条完整的线
3. 用这条临时线渲染出来 → **用户就能看到预览效果**

**关键代码思路**：
```typescript
// 鼠标移动时的思考逻辑
mousemoveEvent = (e) => {
    if (正在绘制) {
        let 临时坐标 = [已点击的点, 当前鼠标位置];
        渲染折线(临时坐标);
    }
}
```

### 第三步：编辑功能的思考路径

#### 🤔 思考问题3：如何进入编辑模式？

**我的思路**：
1. 用户双击已画的线 → **检测是否点击到了线上**
2. 如果点击到了，就进入编辑模式 → **状态切换**
3. 进入编辑模式后要做什么？→ **显示控制点**

**你思考**：
- 如果线是隐藏的，能编辑吗？🤔
- 如果线已经是编辑状态，再次双击应该做什么？🤔

#### 🤔 思考问题4：什么是控制点？

想象一条线 a→b→c→d：

- **顶点**：a, b, c, d - 用户可以直接拖动这些点
- **中点**：a-b中间、b-c中间、c-d中间 - 拖动后插入新顶点
- **拖动点**：也是a-b中间、b-c中间、c-d中间 - 拖动后整条边移动

**为什么需要两种中间点？**
- **红色中点**：用户想在中间加一个顶点
- **绿色拖动点**：用户想移动整条边

### 第四步：核心设计思路

#### 🏗️ 架构设计思路

**我的设计原则**：
1. **职责分离**：绘制逻辑和编辑逻辑分开
2. **状态驱动**：不同状态做不同的事
3. **事件统一**：所有鼠标事件统一管理
4. **历史记录**：支持撤销重做

#### 🔄 状态管理思路

```typescript
// 我的状态管理思路
enum EditorState {
    Idle,     // 空闲：已画完，等待操作
    Drawing,  // 绘制：正在画线
    Editing   // 编辑：正在编辑线
}

// 状态切换的思考
if (状态 === Drawing) {
    // 绘制逻辑：点击记录点，移动预览，双击完成
} else if (状态 === Editing) {
    // 编辑逻辑：显示控制点，处理拖动，更新历史
}
```

### 第五步：实现策略

#### 🎯 策略1：分而治之

**实现策略**：
1. **先实现基础绘制**
2. **再添加编辑功能**
3. **最后完善细节**

#### 🎯 策略2：抽象思维

**继承BaseEditor的好处**：
- 我不用重新实现状态管理 → **基类已提供**
- 我不用重新实现事件绑定 → **基类已提供**
- 我不用重新实现历史记录 → **基类已提供**

**我只需要专注于**：
- 折线特有的绘制逻辑
- 折线特有的编辑逻辑


## 🤔 现在轮到你了：思考练习

在查看具体代码实现之前，先思考以下几个问题，这会帮助你更好地理解代码：

### 问题1：如果用户在绘制过程中，想要撤销最后一个点，你会怎么实现？

**提示**：
- 需要从哪里移除点？tempCoords数组
- 移除后需要做什么？重新渲染
- 如何触发这个操作？快捷键Ctrl+Z

### 问题2：用户拖动顶点时，如何保持折线的连续性？

**提示**：
- 拖动一个点会影响什么？相邻的两条边
- 需要实时更新什么？折线的渲染
- 拖动结束后需要记录什么？历史状态

### 问题3：为什么需要getCurrentMarkerCoords这个函数？

**提示**：
- 顶点marker的位置 = 折线的实际坐标
- 渲染折线需要什么？坐标数组
- 历史记录需要保存什么？坐标数组

### 问题4：中点和拖动点为什么要互相引用？

**提示**：
- 拖动中点时，边拖动点应该消失？避免重叠
- 拖动边拖动点时，中点应该消失？避免重叠
- 如何实现这种"互斥"效果？pairRef引用

---

## 📚 开始代码实现

带着上面的思考，我们来看具体的代码实现。


### 为什么要继承BaseEditor？

BaseEditor是一个抽象基类，它为我们提供了所有几何编辑器的通用功能：

- **状态管理**：绘制状态、编辑状态、空闲状态的切换
- **事件处理**：统一的鼠标事件处理机制
- **吸附功能**：自动吸附到其他几何图形的功能
- **撤销重做**：历史记录管理
- **图层管理**：图层的显示隐藏、样式设置等

通过继承BaseEditor，我们不需要重复实现这些通用功能，只需要专注于折线特有的逻辑。

### 继承的基本结构

```typescript
import { BaseEditor } from "../base/BaseEditor";
import { EditorState } from "../types";

export default class PolylineEditor extends BaseEditor<L.Polyline> {
    constructor(map: L.Map, options?: LeafletEditorOptions) {
        super(map, options);
        // 初始化逻辑
    }
    
    // 必须实现的抽象方法
    protected initLayer(geometry?: GeoJSON.Geometry): void {}
    protected bindMapEvents(map: L.Map): void {}
    protected offMapEvents(map: L.Map): void {}
    // ... 其他抽象方法
}
```

---

## 2. 绘制功能实现

### 2.1 初始化图层

首先，我们需要创建折线图层。折线需要坐标数组和样式配置。

#### 🤔 思考：初始化图层要解决什么问题？

回想我们之前的思考，绘制功能需要"鼠标事件 + 临时存储 + 实时渲染"。那么初始化图层就是要为这些功能做准备：

1. **样式配置**：折线需要有颜色、粗细等样式 → 为实时渲染提供样式
2. **坐标处理**：用户可能传入GeoJSON格式的几何数据，需要转换为Leaflet需要的坐标格式 → 为数据兼容性做准备
3. **默认坐标**：如果没有传入几何数据，需要提供默认坐标 → 为绘制功能提供起点

#### 💡 关键理解：

**为什么需要样式配置？**
- 绘制时需要实时预览，预览需要样式
- 校验失败时需要显示错误样式（红色）
- 不同状态可能需要不同样式

**为什么需要坐标转换？**
- 用户传入的可能是GeoJSON格式：`[lng, lat]`
- Leaflet需要的是：`[lat, lng]`
- 需要统一格式，避免后续处理出错

#### 分析：
1. **样式配置**：折线需要有颜色、粗细等样式
2. **坐标处理**：用户可能传入GeoJSON格式的几何数据，需要转换为Leaflet需要的坐标格式
3. **默认坐标**：如果没有传入几何数据，需要提供默认坐标

#### 实现：

```typescript
private getLayerStyle(valid: boolean = true) {
    const defaultLayerStyle = {
        weight: 2,
        color: '#008BFF',
        ...this.options.defaultStyle,
    };
    const allOptions = {
        pane: 'overlayPane',
        layerVisible: true,
        defaultStyle: defaultLayerStyle,
        ...defaultLayerStyle,
    }
    const errorLayerStyle = {
        weight: 2,
        color: 'red',
        ...this.options?.validation?.validErrorPolygonStyle
    }
    return valid ? allOptions : errorLayerStyle;
}

// 坐标转换工具函数
export function reversePolyLineLatLngs(geometry: GeoJSON.Geometry): number[][][] {
    if (geometry.type === 'LineString') {
        const singlePolyline = geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        return [singlePolyline]
    } else if (geometry.type === 'MultiLineString') {
        return geometry.coordinates.map(line => line.map(([lng, lat]) => [lat, lng]));
    } else {
        throw new Error('不支持的 geometry 类型: ' + geometry.type);
    }
}

protected initLayer(geometry?: GeoJSON.Geometry): void {
    const layerStyle = this.getLayerStyle();
    let coords: number[][][] = [[[181, 181], [182, 182]]]; // 默认坐标
    if (geometry) {
        coords = reversePolyLineLatLngs(geometry); // 坐标提取
    }
    this.layer = L.polyline(coords as any, layerStyle);
    this.layer.addTo(this.map);
    
    // 设置吸附源（排除当前图层）
    if (this.IsEnableSnap()) {
        this.setSnapSources([this.layer]);
    }
}
```

### 2.2 绑定鼠标事件

绘制功能需要监听三个核心事件：点击、双击、鼠标移动。

#### 🤔 思考：为什么需要这三个事件？

回想我们之前的思路："绘制 = 鼠标事件 + 临时存储 + 实时渲染"

1. **点击事件**：用户点击地图时记录点的位置 → 解决"临时存储"问题
2. **双击事件**：用户双击时完成绘制 → 解决"绘制完成"的判断问题  
3. **移动事件**：鼠标移动时实时预览折线 → 解决"实时渲染"问题

#### 💡 关键理解：

**为什么需要tempCoords和lastMoveCoord两个数组？**
- `tempCoords`：存储用户确认的点（点击后确认）
- `lastMoveCoord`：存储鼠标移动的临时位置（用于预览）
- 这样设计的好处：确认的点不会因为鼠标移动而丢失

**为什么每个事件都要检查`!this.isActive()`？**
- 可能有多个编辑器实例在同一个地图上
- 只有激活的实例才应该处理事件
- 避免事件冲突和重复处理

**为什么点击时要先校验再添加点？**
- 防止用户绘制无效的折线（如自相交）
- 实时反馈：让用户立即知道当前操作是否有效
- 避免绘制完成后才发现问题

#### 分析：
1. **点击事件**：用户点击地图时记录点的位置
2. **双击事件**：用户双击时完成绘制
3. **移动事件**：鼠标移动时实时预览折线

#### 实现：

```typescript
// 需要的属性
private tempCoords: number[][] = [];  // 存储用户点击的坐标点
private lastMoveCoord: number[] = []; // 存储鼠标移动的最后一个点

protected bindMapEvents(map: L.Map): void {
    map.on('click', this.mapClickEvent);
    map.on('dblclick', this.mapDblClickEvent);
    map.on('mousemove', this.mapMouseMoveEvent);
}

// 地图点击事件
private mapClickEvent = (e: L.LeafletMouseEvent) => {
    if (!this.isActive()) return;
    if (this.currentState === EditorState.Drawing) {
        // 尝试添加新点
        let waitingAddCoord = [e.latlng.lat, e.latlng.lng];
        if (this.IsEnableSnap()) {
            const { snappedLatLng } = this.applySnapWithTarget(e.latlng);
            waitingAddCoord = [snappedLatLng.lat, snappedLatLng.lng];
        }
        const testCoords = [...this.tempCoords, waitingAddCoord];
        // 实时校验并改变样式
        const isValid = this.isValidPolyline(testCoords);
        // 通过校验，则添加点
        isValid && this.tempCoords.push(waitingAddCoord);
        // 记录最后一个点，用于后续撤回操作
        this.lastMoveCoord = waitingAddCoord;
    }
}

// 地图双击事件
private mapDblClickEvent = (e: L.LeafletMouseEvent) => {
    if (!this.canConsume(e)) return;
    if (!this.layer) throw new Error('图层实例化失败，无法完成图层创建，请重试');
    
    if (this.currentState === EditorState.Drawing) {
        const lastCoord = [e.latlng.lat, e.latlng.lng];
        // 渲染图层，先剔除重复坐标（双击事件实际触发了2次单击事件）
        const finalCoords = deduplicateCoordinates([...this.tempCoords, lastCoord]);
        if (this.isValidPolyline(finalCoords)) {
            this.finishedDraw([finalCoords]);
        } else {
            throw new Error('绘制的折线无效，请继续绘制或调整');
        }
    }
}

// 地图鼠标移动事件
private mapMouseMoveEvent = (e: L.LeafletMouseEvent) => {
    if (!this.isActive()) return;
    if (this.currentState === EditorState.Drawing) {
        let lastMoveEndPoint: number[] = [e.latlng.lat, e.latlng.lng];
        let tempMovedCoords = this.tempCoords;
        if (this.IsEnableSnap()) {
            const { snappedLatLng } = this.applySnapWithTarget(e.latlng);
            lastMoveEndPoint = [snappedLatLng.lat, snappedLatLng.lng];
        }
        // 一个点也没有时，什么也不做
        if (!this.tempCoords.length) return;
        // 构建临时坐标点数组
        tempMovedCoords = [...tempMovedCoords, lastMoveEndPoint];
        // 实时校验并改变样式
        const isValid = this.isValidPolyline(tempMovedCoords);
        // 实时渲染
        this.renderLayer([tempMovedCoords], isValid);
    }
}

protected offMapEvents(map: L.Map): void {
    map.off('click', this.mapClickEvent);
    map.off('dblclick', this.mapDblClickEvent);
    map.off('mousemove', this.mapMouseMoveEvent);
}
```

### 2.3 图层渲染和显隐控制

#### 分析：
1. **renderLayer**：根据坐标数组重新渲染折线
2. **setLayerVisibility**：控制图层的显示和隐藏

#### 实现：

```typescript
protected renderLayer(coords: number[][][], valid: boolean = true): void {
    if (this.layer) {
        const layerStyle = this.getLayerStyle(valid);
        this.layer.setStyle(layerStyle);
        this.layer.setLatLngs(coords as any);
    } else {
        throw new Error('图层不存在，无法渲染');
    }
}

protected setLayerVisibility(visible: boolean): void {
    this.layerVisble = visible;
    if (visible) {
        this.show();
    } else {
        this.hide();
    }
}

private show() {
    if (this.layer) {
        this.layer.setStyle({
            opacity: 1,
            weight: 2,
            color: '#3388ff'
        })
    }
}

private hide() {
    if (this.layer) {
        this.layer.setStyle({
            opacity: 0,
            weight: 0,
            color: '#3388ff'
        })
    }
    // 退出编辑状态（若存在）
    if (this.currentState === EditorState.Editing) {
        this.exitEditMode();
        this.updateAndNotifyStateChange(EditorState.Idle);
    }
}
```

### 2.4 绘制辅助功能

#### 分析：
1. **完成绘制**：将临时坐标转换为正式图层
2. **撤销绘制**：撤销最后一个绘制的点
3. **校验功能**：检查折线是否有效

#### 实现：

```typescript
private finishedDraw(finalCoords: number[][][]): void {
    this.renderLayer(finalCoords);
    this.reset();
    this.tempCoords = []; // 清空临时坐标
    // 移除可能存在的高亮
    this.clearSnapHighlights();
    // 设置为空闲状态，并发出状态通知
    this.updateAndNotifyStateChange(EditorState.Idle);
}

private isValidPolyline(coords: number[][]): boolean {
    // 检查自相交（根据配置）
    if (this.validationOptions.allowSelfIntersect === false) {
        if (polylineHasSelfIntersection(coords)) {
            return false;
        }
    }
    return true;
}

public undoDraw(): boolean {
    if (this.currentState !== EditorState.Drawing) return false;

    if (this.tempCoords.length > 0) {
        // 移除最后一个点
        this.tempCoords.pop();
        // 检查是否还有剩余点
        if (this.tempCoords.length > 0) {
            const finalCoords = [...this.tempCoords, this.lastMoveCoord];
            this.renderLayer([finalCoords]);
        } else {
            // 没有点了，清空渲染
            this.renderLayer([[]]);
            this.lastMoveCoord = []; // 清空移动点
        }
        return true;
    }
    return false;
}
```

---

## 3. 编辑功能实现

### 3.1 激活编辑模式

#### 🤔 思考：编辑模式的核心是什么？

回想我们之前的思路："编辑 = 激活检测 + 控制点创建 + 拖动处理 + 历史管理"

激活编辑模式就是"激活检测"这一步，需要解决：

1. **检测合法性**：这个折线能被编辑吗？
2. **状态切换**：从绘制/空闲状态切换到编辑状态
3. **界面准备**：为后续的控制点创建做准备

#### 💡 关键理解：

**为什么需要`canEnterEditMode()`检查？**
- 折线可能被隐藏了 → 不能编辑隐藏的图层
- 折线可能被锁定了 → 不能编辑锁定的图层
- 当前可能已经是编辑状态 → 避免重复进入

**为什么需要`updateAndNotifyStateChange()`？**
- 内部状态管理：让编辑器知道自己当前状态
- 外部通知：让其他组件知道状态变化（如UI更新）
- 状态驱动：不同状态下的事件处理逻辑不同

**为什么需要`this.activate()`？**
- 多实例管理：告诉系统"现在是我在处理事件"
- 事件优先级：确保当前实例优先处理鼠标事件
- 避免冲突：防止其他实例干扰当前编辑

#### 分析：
当用户双击已绘制的折线时，需要进入编辑模式。我们需要：
1. 检查是否可以进入编辑模式
2. 更新状态和激活实例
3. 初始化编辑界面

#### 实现：

```typescript
public startEdit(): void {
    if (!this.canEnterEditMode()) return;
    // 状态变更，并发出状态通知
    this.updateAndNotifyStateChange(EditorState.Editing);
    // 设置当前激活态是本实例
    this.activate()
    // 进入编辑模式
    this.enterEditMode();
}

protected enterEditMode(): void {
    if (!this.layer) return;

    const multiline_latlngs = this.layer.getLatLngs() as L.LatLng[][];
    let coords: number[][][] = multiline_latlngs.map(line_latlngs => 
        line_latlngs.map((line_coords) => [line_coords.lat, line_coords.lng])
    );

    // 记录初始快照
    this.historyStack.push(coords);
    // 清空重做栈
    this.redoStack = [];

    // 设置吸附源（排除当前图层）
    if (this.IsEnableSnap()) {
        this.setSnapSources([this.layer]);
    }

    // 渲染每个顶点为可拖动 marker
    this.reBuildMarker(coords)
    // 渲染边的中线点
    this.insertMidpointMarkers();
}
```

### 3.2 顶点编辑功能

#### 🤔 思考：顶点编辑要解决什么问题？

回想我们之前的思路，编辑需要"控制点创建 + 拖动处理 + 历史管理"。顶点编辑就是核心的控制点功能：

1. **创建控制点**：在每个顶点创建可拖动的marker
2. **绑定拖动事件**：让用户能拖动修改折线形状
3. **处理拖动结束**：记录历史状态，支持撤销重做
4. **支持删除操作**：右键删除不需要的顶点

#### 💡 关键理解：

**为什么需要`vertexMarkers`二维数组？**
- 外层数组：支持多条折线（MultiLineString）
- 内层数组：每条折线的所有顶点marker
- 结构：`vertexMarkers[线索引][顶点索引] = Marker`

**为什么拖动时要实时更新折线？**
- 用户需要立即看到拖动效果
- 实时反馈：让用户知道操作结果
- 视觉连续：避免拖动时的视觉跳跃

**为什么拖动结束要记录历史？**
- 支持撤销：用户可以回到之前的状态
- 操作记录：每次修改都要有历史痕迹
- 重做支持：撤销后还能重做

**为什么右键删除要检查顶点数量？**
- 几何有效性：折线至少需要2个顶点
- 防止破坏：避免删除后折线消失
- 用户提示：明确告诉用户为什么不能删除

#### 分析：
进入编辑模式后，需要在每个顶点创建可拖动的marker，并绑定相应的事件：
1. **拖动事件**：实时更新折线形状
2. **拖动结束事件**：记录历史
3. **右键事件**：删除顶点

#### 实现：

```typescript
// 需要的属性
protected historyStack: any[] = [];
protected redoStack: any[] = [];
protected vertexMarkers: L.Marker[][] = []; // 存储顶点标记的数组
protected midpointMarkers: MidpointPair[][] = []; // 存储中点和拖动点的数组

protected reBuildMarker(multi_coords: number[][][]): void {
    // 清除旧的 marker
    this.vertexMarkers.forEach(singleLineMarkers => {
        singleLineMarkers.forEach(marker => this.map.removeLayer(marker));
    });
    this.vertexMarkers = [];

    multi_coords.forEach((coords, lineIndex) => {
        const singleLineMarkers: L.Marker[] = [];
        coords.forEach((coord, pointIndex) => {
            const latlng = L.latLng(coord[0], coord[1]);
            const marker = L.marker(latlng, this.editOptions.vertexsMarkerStyle).addTo(this.map);

            // 拖动时更新图形
            marker.on('drag', () => {
                // 先进行吸附处理
                let latlng = marker.getLatLng();
                if (this.IsEnableSnap()) {
                    const { snappedLatLng } = this.applySnapWithTarget(marker.getLatLng());
                    latlng = snappedLatLng;
                }
                marker.setLatLng(latlng);

                this.renderLayerFromMarkers();
                this.updateMidpoints();
            });

            // 拖动结束后记录历史
            marker.on('dragend', () => {
                // 移除可能存在的高亮
                this.clearSnapHighlights();
                // 更新历史记录
                this.pushHistoryFromMarkers();
            });

            // 右键删除点（前提是线段的点数大于2个）
            marker.on('contextmenu', () => {
                const waitingEditLineMarkerArr = this.vertexMarkers[lineIndex];
                if (waitingEditLineMarkerArr.length > 2) {
                    this.map.removeLayer(marker);
                    const currentIndex = waitingEditLineMarkerArr.findIndex(m => m === marker);
                    if (currentIndex !== -1) {
                        waitingEditLineMarkerArr.splice(currentIndex, 1);
                        this.renderLayerFromMarkers();
                        this.pushHistoryFromMarkers();
                        this.updateMidpoints();
                    }
                } else {
                    alert('线段至少需要2个顶点');
                }
            });

            singleLineMarkers.push(marker);
        })
        this.vertexMarkers.push(singleLineMarkers);
    });
}

protected getCurrentMarkerCoords() {
    // 读取当前 marker 坐标，构建完整结构
    const current = this.vertexMarkers.map(singleLineMarker => 
        singleLineMarker.map(pointMarker => [pointMarker.getLatLng().lat, pointMarker.getLatLng().lng])
    );
    return current;
}

private renderLayerFromMarkers() {
    const coords = this.getCurrentMarkerCoords();
    this.renderLayer(coords);
}

private pushHistoryFromMarkers() {
    const coords = this.getCurrentMarkerCoords();
    this.historyStack.push(coords);
}
```

### 3.3 中点和边拖拽功能

#### 分析：
为了提供更好的编辑体验，我们需要在每条边上添加两种控制点：
1. **中点**：拖动后插入新的顶点
2. **拖动点**：拖动整条边

#### 实现：

```typescript
// 首先定义类型
interface MidpointPair {
    insert: L.Marker | null; // 中点marker（插入新顶点用）
    edge: L.Marker | null;   // 边拖动marker（拖动整条边用）
}

protected insertMidpointMarkers(skipMarker?: L.Marker): void {
    const isEnabledMidPointsMarker = this.editOptions.dragMidMarkerOptions!.enabled;
    const isEnabledEdgeMarker = this.editOptions.dragLineMarkerOptions!.enabled;
    const disableRenderMarker = (!isEnabledMidPointsMarker && !isEnabledEdgeMarker);
    if (disableRenderMarker || this.currentState !== EditorState.Editing) return;

    // 清除旧的中点标记
    this.removeAllMidPointMarkers(skipMarker);

    this.vertexMarkers.forEach((singleLineMarker, singleLineIndex) => {
        const lineMidpoints: MidpointPair[] = [];

        for (let i = 0; i < singleLineMarker.length; i++) {
            const nextIndex = i + 1;
            if (nextIndex >= singleLineMarker.length) break;
            
            const p1 = singleLineMarker[i];
            const p2 = singleLineMarker[nextIndex];
            
            // 跳过当前边包含 skipMarker 的情况
            if (skipMarker && (skipMarker === p1 || skipMarker === p2 || 
                (skipMarker as any).pairRef === p1 || (skipMarker as any).pairRef === p2)) { 
                continue; 
            }

            const insertMidpoint = isEnabledMidPointsMarker ? 
                this.createInsertMidpointMarker(p1, p2, singleLineIndex, nextIndex, 
                    this.editOptions.dragMidMarkerOptions!.positionRatio!) : null;
            
            const edgeDragMarker = isEnabledEdgeMarker ? 
                this.createEdgeDragMarker(p1, p2, singleLineIndex, 
                    this.editOptions.dragLineMarkerOptions!.positionRatio!) : null;

            lineMidpoints.push({ insert: insertMidpoint, edge: edgeDragMarker });
            
            // 互相引用
            if (insertMidpoint) {
                (insertMidpoint as any).pairRef = edgeDragMarker;
            }
            if (edgeDragMarker) {
                (edgeDragMarker as any).pairRef = insertMidpoint;
            }
        }
        this.midpointMarkers.push(lineMidpoints);
    });
}

// 创建中点marker（拖动后插入新顶点）
private createInsertMidpointMarker(
    p1: L.Marker, p2: L.Marker, lineIndex: number, 
    insertIndex: number, positionRadio: number
): L.Marker {
    const midPoint = getFractionalPointOnEdge(p1.getLatLng(), p2.getLatLng(), positionRadio);
    const marker = L.marker(midPoint, this.editOptions.dragMidMarkerOptions!.dragMarkerStyle).addTo(this.map);

    // 开始拖动时，移除配对的边拖动marker
    marker.on('dragstart', () => {
        const pair = (marker as any).pairRef as L.Marker;
        if (pair) {
            this.map.removeLayer(pair);
        }
    });

    // 中点被拖动时，图形同步更新
    marker.on('drag', () => {
        // 吸附处理
        let latlng = marker.getLatLng();
        if (this.IsEnableSnap()) {
            const { snappedLatLng } = this.applySnapWithTarget(marker.getLatLng());
            latlng = snappedLatLng;
        }

        // 拷贝当前顶点坐标
        const coords = this.getCurrentMarkerCoords();
        // 插入中点坐标到对应位置
        const line = coords[lineIndex];
        const newLine = [...line];
        newLine.splice(insertIndex, 0, [latlng.lat, latlng.lng]);
        // 构造新的坐标结构
        const newCoords = [...coords];
        newCoords[lineIndex] = newLine;
        // 实时渲染
        this.renderLayer(newCoords);
    });

    // 中点拖动结束后，转换为顶点marker
    marker.on('dragend', () => {
        // 吸附处理
        let latlng = marker.getLatLng();
        if (this.IsEnableSnap()) {
            const { snappedLatLng } = this.applySnapWithTarget(marker.getLatLng());
            latlng = snappedLatLng;
        }
        this.clearSnapHighlights();

        // 从地图中移除中点 marker
        this.map.removeLayer(marker);

        // 创建新的顶点 marker
        const newMarker = L.marker(latlng, this.editOptions.vertexsMarkerStyle).addTo(this.map);
        // 插入到顶点数组
        this.vertexMarkers[lineIndex].splice(insertIndex, 0, newMarker);

        // 绑定事件（复用顶点的事件逻辑）
        newMarker.on('drag', () => {
            let latlng = newMarker.getLatLng();
            if (this.IsEnableSnap()) {
                const { snappedLatLng } = this.applySnapWithTarget(newMarker.getLatLng());
                latlng = snappedLatLng;
            }
            newMarker.setLatLng(latlng);
            this.renderLayerFromMarkers();
            this.updateMidpoints();
        });

        newMarker.on('dragend', () => {
            this.clearSnapHighlights();
            this.pushHistoryFromMarkers();
        });

        newMarker.on('contextmenu', () => {
            const currentLine = this.vertexMarkers[lineIndex];
            if (currentLine.length > 2) {
                const currentIndex = currentLine.findIndex(m => m === newMarker);
                if (currentIndex !== -1) {
                    this.map.removeLayer(newMarker);
                    currentLine.splice(currentIndex, 1);
                    this.renderLayerFromMarkers();
                    this.pushHistoryFromMarkers();
                    this.updateMidpoints();
                }
            } else {
                alert('线段至少需要2个顶点');
            }
        });

        // 刷新图层和中点
        this.renderLayerFromMarkers();
        this.pushHistoryFromMarkers();
        this.updateMidpoints();
    });
    
    return marker;
}

// 创建边拖动marker（拖动整条边）
private createEdgeDragMarker(
    p1: L.Marker, p2: L.Marker, lineIndex: number, positionRadio: number
): L.Marker {
    const midDragPoint = getFractionalPointOnEdge(p1.getLatLng(), p2.getLatLng(), positionRadio);
    const marker = L.marker(midDragPoint, this.editOptions.dragLineMarkerOptions!.dragMarkerStyle).addTo(this.map);
    let lastLatLng: L.LatLng | null = null;

    marker.on('dragstart', () => {
        lastLatLng = marker.getLatLng();
        // 移除配对中点
        const pair = (marker as any).pairRef as L.Marker;
        if (pair && this.map.hasLayer(pair)) {
            this.map.removeLayer(pair);
        }
    });

    marker.on('drag', () => {
        if (!lastLatLng) return;

        const { snappedLatLng: current } = this.applySnapWithTarget(marker.getLatLng());
        const deltaLat = current.lat - lastLatLng.lat;
        const deltaLng = current.lng - lastLatLng.lng;

        const latlng1 = p1.getLatLng();
        const latlng2 = p2.getLatLng();

        p1.setLatLng([latlng1.lat + deltaLat, latlng1.lng + deltaLng]);
        p2.setLatLng([latlng2.lat + deltaLat, latlng2.lng + deltaLng]);

        this.renderLayerFromMarkers();
        this.updateMidpoints(marker); // 传入当前 marker，避免被销毁
        lastLatLng = current;
    });

    marker.on('dragend', () => {
        this.clearSnapHighlights();
        this.updateMidpoints();
        this.pushHistoryFromMarkers();
    });

    return marker;
}

// 实时更新中线点的位置
protected updateMidpoints(skipMarker?: L.Marker): void {
    const isEnabledMidPointsMarker = this.editOptions.dragMidMarkerOptions!.enabled;
    const isEnabledEdgeMarker = this.editOptions.dragLineMarkerOptions!.enabled;
    const disableRenderMarker = (!isEnabledMidPointsMarker && !isEnabledEdgeMarker);
    
    if (disableRenderMarker) {
        if (this.midpointMarkers.length > 0) {
            this.removeAllMidPointMarkers();
            this.midpointMarkers = [];
        }
        return;
    }

    // 清除旧的中点
    this.removeAllMidPointMarkers(skipMarker);
    // 重新插入
    this.insertMidpointMarkers(skipMarker);
}

// 移除所有中点标记
protected removeAllMidPointMarkers(skipMarker?: L.Marker) {
    const newMidpoints: MidpointPair[] = [];
    this.midpointMarkers.flat(1).forEach(pair => {
        const keepInsert = pair.insert && pair.insert === skipMarker;
        const keepEdge = pair.edge && pair.edge === skipMarker;

        if (!keepInsert && pair.insert && this.map.hasLayer(pair.insert)) {
            this.map.removeLayer(pair.insert);
        }

        if (!keepEdge && pair.edge && this.map.hasLayer(pair.edge)) {
            this.map.removeLayer(pair.edge);
        }

        // 如果有任一 marker 被保留，就保留这个 pair
        if (keepInsert || keepEdge) {
            newMidpoints.push(pair);
        }
    });

    // 重新组织为二维数组结构
    this.midpointMarkers = newMidpoints.length > 0 ? [[...newMidpoints]] : [];
}

// 退出编辑模式
protected exitEditMode(): void {
    // 移除所有顶点 marker
    this.vertexMarkers.flat(1).forEach(marker => {
        this.map.removeLayer(marker);
    });
    this.vertexMarkers = [];

    // 移除所有中点 marker
    this.removeAllMidPointMarkers();
}
```

---

## 4. 使用示例

```typescript
// 创建地图
const map = L.map('map').setView([51.505, -0.09], 13);

// 创建折线编辑器
const polylineEditor = new PolylineEditor(map, {
    defaultStyle: {
        color: '#3388ff',
        weight: 3
    },
    editOptions: {
        enabled: true,
        vertexsMarkerStyle: {
            icon: L.divIcon({
                className: 'custom-vertex-marker',
                html: '<div style="width:10px;height:10px;background:red;border-radius:50%;"></div>'
            }),
            draggable: true
        },
        dragMidMarkerOptions: {
            enabled: true,
            positionRatio: 0.5
        },
        dragLineMarkerOptions: {
            enabled: true,
            positionRatio: 0.5
        }
    },
    snap: {
        enabled: true,
        tolerance: 10,
        modes: ['vertex', 'edge']
    },
    validation: {
        allowSelfIntersect: false
    }
});

// 监听状态变化
polylineEditor.onStateChange((state) => {
    console.log('编辑器状态:', state);
    if (state === EditorState.Idle) {
        // 编辑完成，获取结果
        const geoJSON = polylineEditor.getGeoJSON();
        console.log('绘制结果:', geoJSON);
    }
});

// 快捷键绑定
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
        polylineEditor.undoDraw();
    }
    if (e.ctrlKey && e.key === 'y') {
        polylineEditor.redoEdit(); // not implement
    }
});

// 清理资源
// 当组件销毁时调用
polylineEditor.destroy();
```
