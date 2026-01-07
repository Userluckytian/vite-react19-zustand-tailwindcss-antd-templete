<!-- 不再需要！下面是废话 -->
`InteractionModeManager.ts` 是状态源（负责存储和广播当前模式）
`drawToolbarController.ts` 是行为触发器（负责设置模式并调用对应功能）

#### 解释其作用:

1. 我们先不考虑draw目录下的内容，仅关注edit目录下的polygon.ts文件，因为这个文件已经包含了绘制的逻辑和编辑的逻辑了。现在我们要干嘛？答： 增加拓扑逻辑。同时我们计划：分成三个工具条： 绘制工具条、编辑工具条、拓扑工具条。
2. 然后用户点击绘制工具条的绘制面按钮，开始绘制多边形。首先是点击操作，它触发了事件`setCurrSelTool`,那么`currSelTool`就有值了。
```javascript
    const [currSelTool, setCurrSelTool] = useState<string | null>(null); // 当前使用的【绘制条上的绘制工具】
```
3. 然后用户绘制完成后，会设置`currSelTool`的值为空字符串， 然后用户双击图形，打开了编辑工具条，这个操作触发了事件`setCurrEditLayer`,那么`currEditLayer`就有值了。
```javascript
    const [currEditLayer, setCurrEditLayer] = useState<any>(null); // 当前编辑的图层【我们设置的是一次仅可编辑一个图层】
```
3. 等用户编辑完成，点击【完成】按钮，那么`currEditLayer`的值就为null了。
4. 接下来，我们要触发topo操作了，那么请问，topo的操作是不是： `currEditLayer`的值为null，且`currSelTool`的值为空字符串时，才可以进行topo操作？
5. 好，那接下来我们开始编写topo的逻辑代码，比如选择操作，首先这个操作是用户点击了选择按钮触发的，针对绘制操作，绘制的状态也是用户点击按钮触发的，针对编辑操作也是用户双击图形然后触发的。触发了，所以我们知道状态改变了。但是这些状态你让用户自己去维护吗？
6. 为了解决：不让用户去维护这些状态，我们需要调整下我们的代码，举个例子，假设用户点击绘制面操作，实际执行的操作是：`drawManager.startPolygon()`, 那我们就需要增加中间处理层，来管理这些状态，这个处理层我们可以称之为行为触发器层（ActionController.ts），根据下面代码的写法来做的话，用户不需要关心状态管理细节，状态还是由我们来管理。用户正常使用绘制操作即可，不用关心状态是怎么变化的
```javascript ActionController.ts
    function newStartPolygon() {
    modeManager.setMode('draw');
    drawManager.startPolygon();
    }
```


——————————————————————

1. 用户先获取到选中的图层，组件这边提供高亮捕获的图层
2. 用户点击裁剪按钮--触发绘制线事件
3. 绘制完毕后，我执行结果计算，然后只将geojson数据抛出去。
4. 用户自己做业务逻辑（比如删除旧图层，新建新的图层）。
5. ————————————————————————
6. 允许回退、撤销、重做。