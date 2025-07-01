import { Suspense, type LazyExoticComponent, type ReactNode } from 'react'

// 传入组件，构建懒加载模式
export default function LazyLoadComp(Comp: LazyExoticComponent<any>): ReactNode {
  return (
    <Suspense fallback={<div>⏳ 组件加载中...</div>}>
      <Comp />
    </Suspense>
  )
}


