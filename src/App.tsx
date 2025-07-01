import { createContext, Suspense, useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import UseTransitionHook from './useTransitionHook'
import UseOptimisticHook from './useOptimisticHook'
import UseHook from './useHook'
import ZustandUseDemo from './zustand_use_demo'

export const ThemeContext = createContext({}); // 这个要放到组件的外部（并且使用export，为了可以在子组件中拿到它）

function App() {
  const [count, setCount] = useState(0)
  const ctxChildrenRef = useRef<any>(null);
  return (
    <>
      <ThemeContext value={{ name: '123', age: 12 }}>
        <div>
          <a href="https://vite.dev" target="_blank">
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </div>
        <h1>Vite + React</h1>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
          <p>
            Edit <code>src/App.tsx</code> and save to test HMR
          </p>
        </div>
        <div className="read-the-docs">
          {/* 钩子函数1 */}

          <UseTransitionHook ref={
            (node: any) => {
              return () => { }
            }
          } />

        </div>
        {/* 钩子函数2 */}
        <div className="read-the-docs">
          <UseOptimisticHook />
        </div>
        {/* 钩子函数3 */}
        <div className="read-the-docs">
          {/* Suspense 如果你不想每次都写，可以写在main.tsx文件中，然后使用Suspense包裹整个App即可 */}
          <Suspense fallback={<div>⏳ 生成图片中...</div>}>
            <UseHook num={12} />
          </Suspense>
        </div>
        {/* 4：zustand */}
        <div className="read-the-docs">
          <ZustandUseDemo />
        </div>
        {/* tailwindCss */}
        <h1 className="text-3xl font-bold underline p-0.5">
          Hello world!
        </h1>
      </ThemeContext>
    </>
  )
}

export default App
