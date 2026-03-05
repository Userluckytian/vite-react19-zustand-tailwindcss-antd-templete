基于README-2.md, 接下来要梳理各个文件中应该包含的内容：

1. BaseEditor.ts（我期望别人继承我时，应该要知道自己应该去实现哪些内容）
- 定义抽象类BaseEditor，作为编辑器，我应该具备：
- 0：精度问题---绘制时的坐标返回的精度，precision，无论是吸附、还是topo，都会涉及到精度问题（不再提供，管它呢，用户后期可以自己获取或者修改）
- 1：toGeojson默认支持的参数，要保持住，之前的丢了。
- 2：吸附功能，实例化编辑器时，要传递
- 3：第一步我们先只考虑绘制行为（撤销重绘，样式配置，吸附到其他图层、图层显隐控制）：
- 3.1：我们需要一个图层layer，它应该是一个实体对象。  
- 3.2：需要提供一个createLayer方法，创建这个图层对象（但是每个类型的不同，所以这个使用抽象的，由各个子类自行实现。这里涉及图层的style样式，写在子类中吧。）
- 3.3：我们绘制时还需要做点击、鼠标移动，双击事件（bindMapEvents），但是每个几何类型的事件可能不完全一致，所以这个使用抽象的，由各个子类自行实现。同样的，关闭监听的事件offMapEvents方法也是抽象的，由子类具体实现。
- 3.4：作为一个编辑器，那么可能需要提供隐藏或者展示图层的功能（但是不同几何类型又可能不同，所以这个使用抽象的（setLayerVisibility），在子类中具体实现）。同时应该提供一个方法，用于获取当前图层的状态（getLayerVisible）。
- 3.5：更新图层的样式（updateLayer）是非必须的，放在子类中自己去写吧。
- 3.6：用户绘制完成后，可能需要获取这个图层的geojson数据（getGeoJson）
- 3.7：从创建图层-->添加到地图-->更新样式-->获取geojson-->销毁图层，这个过程是完整的了。下一步考虑编辑行为：
- 3.8：需要提供一个getLayer方法，返回这个图层对象。这个是实体函数即可。
- 4: 编辑行为包括：双击激活编辑（enterEditMode，配套方法exitEditMode（抽象方法）），进入编辑模式后，会涉及顶点的渲染、拖动、添加和删除、撤销/重做等操作（包含: 编辑时顶点配置信息项editOptions={xxx}, initEditOptions, getEditOptions, updateEditOptions, canEnterEditMode enterEditMode, exitEditMode, undoEdit, redoEdit, resetToEditInitial, commitEdit）
  
  5：几何有效性校验，要不写在子类中？（每种类型的校验规则不一样，baseEditor中只提供一个校验对象用于收集校验规则: validationOptions = {},  getValidationOptions, setValidationOptions）

  6：状态管理：用户从绘制状态变成完成状态、从编辑状态到完成状态。是必要的（放到BaseEditor抽象类中. 包含:currentActiveEditor = null, activate\deactivate\isActive.注: 这块是完整的全部在baseEditor类中,后续迁移也不用顾虑子类）。

  7：消息通知.发布订阅模式: 一般是用户绘制完毕时或者编辑完毕时,要吐出状态,外部可以执行后续的一系列操作(currentState = 'idle', stateListeners=[], onStateChange, offStateChange, updateAndNotifyStateChange)
  
  8：销毁编辑器：destroy方法，销毁图层，关闭事件监听，销毁编辑器实例等（destroy）

  9: 构造函数(要子类提供地图对象map, 提供创建layer的相关信息options.defaultStyle, options.defaultGeometry,提供吸附行为的配置项options?.snap,提供编辑的配置项options?.edit, 提供校验的配置项options?.validation)


1. 我决定从PolygonEditor开始实现，后续其他的一般都是做减法。