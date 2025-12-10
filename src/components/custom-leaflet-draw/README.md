### 目录结构介绍

custom-leaflet-draw               # 基于leaflet构建的图层绘制、编辑、测量、拓扑等工具
├── draw                          # 仅支持绘制功能，不包含编辑、测量、拓扑等
├── simpleEdit                    # 支持传入或者绘制完毕的图形的编辑功能（仅单面形式的多边形、矩形）
│   ├──SimpleBaseEditor.ts        # 简易编辑类基类
│   ├──polygon.ts                 # 继承SimpleBaseEditor，支持多边形（单面）的编辑功能
│   └──rectangle.ts               # 继承SimpleBaseEditor，支持矩形的编辑功能
├── edit                          # 支持传入或者绘制完毕的图形的编辑功能（单面、挖孔、多面等多边形结构）
│   ├──BaseEditor.ts              # 编辑类基类
│   ├──BasePolygonEditor.ts       # 继承BaseEditor，支持多边形（单面、挖孔、多面）的编辑功能
│   ├──BaseRectangleEditor.ts     # 继承BaseEditor，支持矩形的编辑功能
│   ├──polygon.ts                 # 继承BasePolygonEditor，支持多边形（单面）的编辑功能
│   └──rectangle.ts               # 继承BaseRectangleEditor，支持矩形的编辑功能（和edit目录下的rectangle完全一样，因为没见过矩形挖孔，挖孔了还是矩形吗?）
├── measure                       # 支持绘制的图层的测量功能
└── topo                          # 支持拓扑功能，存放topo的工具集，



### 学习理解步骤：
1：先看绘制（draw）目录下的相关代码。
2：看测量（measure）目录下的相关代码。
3：看编辑（simpleEdit）目录下的相关代码，这些都是单面的处理逻辑。
4：再看编辑（edit）目录下的相关代码，这些是多边形（单面、挖孔、多面）的处理逻辑，搞清楚继承关系。