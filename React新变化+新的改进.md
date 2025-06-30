### 1. React新变化
1: 增加了异步请求中的isPending，startTransition来控制页面的loading状态，或者按钮的是否禁用状态。(同步、异步写法均可)
钩子函数1： `useTransition`: `  const [isPending, startTransition] = useTransition(); ` // 异步请求中使用。
详情见： D:\test_react\imagesky-vite-react19\src\useTransitionHook.tsx

钩子函数2： `useOptimistic`: ` const [optimisticName, setOptimisticName] = useOptimistic(currentName); `
问： 你和useState设置个默认值有啥区别?
答： useOptimistic 最佳场景‌：
网络延迟敏感的场景（点赞、收藏、评论、表单提交---常见于移动端）
需要即时视觉反馈的 UI（如购物车增减）
由于上面的操作都将进行后台接口调用，一旦网速慢了，可能就无法及时更新状态，但是我们在网上看博客，刷视频。点赞评论等操作很多都是立刻更新的，这个时候，useOptimistic 就派上用场了。
至于后续接口报错，也可以把错误信息返给用户，比如： 网络异常，点赞失败等等，然后把用户点赞的状态取消掉（简称回滚）。
总结： 
useOptimistic 是 useState 在‌异步交互场景‌的强化扩展，它允许你在异步操作完成前，先更新 UI 状态，然后等待异步操作完成。通过乐观更新机制显著优化了异步交互体验。
使用: 
既要定义useState 管理真实数据，又要定义useOptimistic管理页面显示交互体验
详情见： D:\test_react\imagesky-vite-react19\src\useOptimisticHook.tsx文件 

钩子函数3： `useActionState`: ` `
钩子函数4： `useFormStatus`: ` `  // 弃用并重命名为3了。
钩子函数5： `use`: ` `

#### 总结：
 1. 引入了5个新的钩子函数，
     - 其中useTransition用于简化之前做异步接口请求时，要定义loading状态，或者按钮的禁用状态的操作）
     - useOptimistic用于处理一些需要即时视觉反馈的场景，比如： 购物车增减、点赞、评论等场景。 使用时，需要搭配useState使用，可以将其视为是state属性的强化。
     - useActionState： 管理表单的状态，包括: [error, submitAction, isPending],其中 error表示：表单提交的错误状态、 submitAction表示：表单提交时，触发的异步请求方法、 isPending表示：表单是否正在提交的状态。 自身使用总结： 没用，因为antd-form组件已经封装了表单提交状态管理。
     - useFormStatus：在 React 19 中，‌useFormState 已被弃用并被 useActionState 替代‌
 2. 


### 2. 新的改进
1: ref 可以通过 props 属性传递，将会删除forwardRef ref forwardRef。 子组件仍需要使用useImperativeHandle暴露自身的方法供父组件调用，否则仍然无法拿到子组件的内容.(之前可以通过自定义Ref来获取, 这种改进就是把之前两个写法，合并到一起了。)
2: 改造了contextAPI的使用，父传子不再需要写provider字样。
3： 没用，但是要见过这种写法，别见了以后，懵了，不认识！


#### 总结：
 1. ref可以通过props获取了，且不再需要定义forWordRef ref forwardRef。
     - 子组件仍需要使用useImperativeHandle暴露自身的方法供父组件调用
 2. 改造了contextAPI的使用，父传子不再需要写provider字样。
 3. 其他的一些改动，目前来看，使用会比较少。但是建议还是看看，别以后从github下载了别人的代码，看不懂。



### 3: 记录创建框架的过程：
1: 肯定是使用vite来创建. 那么vite创建项目的命令是什么呐？✔

2: 解决样式隔离问题。使用tailwindcss，其按需引用版本： Windi CSS。 但是我还是建议先用tailwindcss，去了解它，然后再使用它的按需引入版本。 (https://tailwindcss.com/docs/installation/using-vite) ✔

3: 引入组件库呀： antdesign UI

4: 路由

5: utils工具函数中构建一个sleep函数，用于异步等待。✔

6: 状态管理：zustand。✔

7: echats图表库。

8: leaflet地图库。

9: 



周五： 
1：react19的新特征、以及改进的内容。 
新的变化： https://react.dev/blog/2024/12/05/react-19#whats-new-in-react-19
新的改进:  https://react.dev/blog/2024/12/05/react-19#improvements-in-react-19
-  react19将ref放在了props中，那么是不是可以通过ref获取子组件的全部变量了？ 还要写 useImperativeHandle吗？
-  In HTML, <div> cannot be a descendant of <p>. This will cause a hydration error.  翻译这个报错， 是什么意思？
-  ref将可以接收一个函数了，函数包含一些变量，第一个变量是什么？
-  react19中，使用函数写法的组件，ref在props中，那我的子组件的useImperativeHandle还需要定义吗？
-  介绍下react19中 支持自定义元素中的客户端渲染模式，举个实际的例子
-  useOptimistic 和 useState有啥区别吗?
-  给我来个示例： 比如我要实现点赞功能， 通过promise settimeout resolve模拟接口请求， 你帮我写下代码。 我需要接口返回成功和返回失败的两种结果
-  useActionState 和 useFormStatus 哪个被弃用了？

2: 项目集成zustand后，如何构建和使用， devtools函数的作用。
-  import { devtools } from 'zustand/middleware'; 这个devTools的作用是？
-  怎么在zustand中使用devtools
-  enabled、name属性的作用是什么？
-  定义好store.ts后，我在我的组件中如何打印userInfo的username以及修改userName？ （见/store/userStore.ts）
-  const userInfo_Sample = useUserStore((state) => state.userInfo); 之前redux中的写法，这种写法还可以吗? 支持吗？
-  


3: tailwindcss引入项目的流程
https://tailwindcss.com/docs/installation/using-vite

4:  