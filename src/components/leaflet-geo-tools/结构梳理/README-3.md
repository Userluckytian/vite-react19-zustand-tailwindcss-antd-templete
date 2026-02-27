
## 实现细节

### baseEditor-抽象类-承担所有几何图形的通用功能
```typescript

// 1: 空模板
   class abstract BaseEditor {
       constructor() {}
   } 
/* 2：第一步我们先做绘制的功能，绘制就需要一个layer， layer的创建包含：
    2-1：定义layer
    2-2：需要提供样式、
    2-3：绑定的双击、点击、鼠标移动事件、
    2-4：面类型的拖动也需要mouseDown、mouseUp事件。 
    2-5：用户可能还会传入默认的geometry信息。
    2-6：layer显隐控制
    2-7：图层销毁、图层鼠标事件、地图鼠标事件销毁
    2-8：获取图层geojson数据事件
    2-9：是否需要将layer对象暴露给用户？应该没必要。算了，我还是提供吧，我哪知道你有什么奇怪的需求。【非必要情况，不建议你们用这个呢。】

    于是，我们需要定义三层结构：BaseEditor ---> BaseXXXEditor ---> XXXEditor
*/
    class abstract BaseEditor {
        // 定义图层（先设置protected，后续需要再放开）
        protected layer: L.Layer;
        constructor() {}
        // 创建图层对象
        protected abstract createLayer(): L.Layer;
        // 绑定地图事件(任何几何图层，绘制时，都需要关联地图事件)
        protected abstract bindMapEvents(): void;
        protected setLayerVisibility(visible: boolean): void{
            ... // 设置图层显隐
                this.layer.setStyle({
                // 控制描边透明度
                opacity: isVisible ? 1 : 0,
                // 控制填充透明度（对点和面有效）
                fillOpacity: isVisible ? 1 : 0,
                // 也可以将线宽设为0
                weight: isVisible ? 2 : 0
            });
        }
        
        protected getGeoJson(): any{
            ... // 获取图层geojson数据
        }

        protected getLayer(): L.Layer{
            ... // 获取图层
        }

        protected layerDestroy(): void{ // 销毁图层（起这个名字是为了规避编辑器的销毁事件。）
            ... // 销毁图层
            this.layer.remove();
        } 

        protected destroy(): void{ // 销毁图层
        this.layerDestroy();
        }; 
    } 

    // 用于构建layer图层，以及地图事件的绑定
    class abstract BaseXXXEditor extends BaseEditor {
        // 使用无效坐标，先实现将图层加载到地图上
        private defaultGeometry: L.LatLngExpression[] | L.LatLngExpression[][] | L.LatLngExpression[][][] = [[181, 181], [181, 181], [181, 181], [181, 181]];
        // 默认样式
       private layerStyle: L.PathOptions | L.PolygonOptions | L.PolylineOptions | L.CircleOptions = {
        color: 'red',
        weight: 2,
        opacity: 1,
        fillColor: 'red',
        fillOpacity: 0.1,
        pane: 'xxxPane'
       };
       constructor(map: L.Map, options: XXXEditorOptions) {
           super();
           if (map) {             
               this.defaultGeometry = options.defaultGeometry || this.defaultGeometry;
               this.layerStyle = options.layerStyle || this.layerStyle;
               this.layer = this.createLayer();
               if(this.layer){
                   this.layer.addTo(map);
                   this.bindMapEvents();
                   this.bindLayerEvents();
               }
            }
       }
    
        protected createLayer(): L.Layer {
            return new L.Polygon(this.defaultGeometry, this.layerStyle);
        }
        protected bindMapEvents(): void {
            ... // 给map绑定事件
            this.mapClickHandler();
            this.mapDblClickHandler();
            this.mapMouseMoveHandler();
        }
        // 为啥没用抽象到 BaseEditor？ 原因：抽象上去的话，每个子类都要实现，比如有一天，我们构建一个新的类继承BaseEditor这个类，但是这个新类不需要bindLayerEvents，但是她是抽象的，我们还必须写，就显得冗余了。
        protected bindLayerEvents(): void {
            ... // 给图层绑定事件
            this.layerMouseDownHandler();
            this.layerMouseUpHandler();
        }


        // 下面的是辅助函数，梳理结构的时候，不用管

        //  #region 地图事件
        private mapClickHandler(): void {
            ... // 给图层绑定事件
        }
        private mapDblClickHandler(): void {
            ... // 给图层绑定事件
        }
        private mapMouseMoveHandler(): void {
            ... // 给图层绑定事件
        }
        // #endregion

        //  #region 图层事件
        private layerMouseDownHandler(): void {
            ... // 给图层绑定事件
        }
        private layerMouseUpHandler(): void {
            ... // 给图层绑定事件
        }
        // #endregion


    } 
    // new的时候要传入map对象
    class XXXEditor extends BaseXXXEditor {
       
       constructor(map: L.Map, options: XXXEditorOptions) {
           if (!map) {
               throw new Error('地图实例不能为空');
                return;
           }
           super(map, options);
       }
    } 
    // 定义要传入的内容（下面定义的类型不一定对，只做示范）：
    interface XXXEditorOptions {
        defaultGeometry?: L.LatLngExpression[] | L.LatLngExpression[][] | L.LatLngExpression[][][]; // 默认的空间信息(可选)
        layerStyle?: L.PathOptions | L.PolygonOptions | L.PolylineOptions | L.CircleOptions;  // 图层的样式(可选)
    }
    // 创建实例
    const xxxEditorInstan = new XXXEditor(map, options);

/* 3：第二步我们做编辑的功能：
    3-1：顶点拖动（放BaseEditor中）
    3-2：右键删除（放BaseEditor中）
    3-3：中点插入
    3-4：边拖拽
*/
/* 4：第三步我们做【历史栈】的功能（baseEditor做抽象，子类实现，原因：点、线、面历史记录的坐标数组结构不同，有的2层，有的三层，有的四层，定义历史坐标数组的类型不完全一致）
*/

/* 5：第四步我们做【几何有效性校验】的功能（BaseEditor做抽象接口，子类实现各自的几何校验）*/

/* 重构并不是一蹴而就的，也许这次的重构也并不完美，但我会一致维护下去。improve it*/

```


1. 绘制： 绘制就得有layer，放到BaseEditor中做layer抽象，子类实现样式， 图层的事件也在BaseEditor中抽象，子类实现。
2. 编辑（顶点拖动、中点插入、边拖拽、右键删除）：顶点的拖动、右键删除可以放到BaseEditor中实现，中点插入、边拖拽放到子类中实现。
3. 撤销/重做： baseEditor做抽象，子类实现。
4. 吸附： BaseEditor实现。
5. 图层显隐控制： BaseEditor抽象，子类实现（一般都是设置透明度做图层显隐吧？ 是的话，可以写在BaseEditor中实现）
6. 状态管理： BaseEditor实现
7. 多环支持： 这个是构造函数中--传入默认的geom--实现的，放BaseEditor中实现, 允许各种类型都支持传入默认的geom
8. 几何有效性校验： BaseEditor做抽象接口，子类实现各自的几何校验
9. 样式配置： BaseEditor做抽象接口，子类实现各自的样式配置


