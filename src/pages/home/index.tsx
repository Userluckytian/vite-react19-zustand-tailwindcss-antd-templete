import { Fragment, Suspense, useContext, useEffect, useRef, useState } from 'react'
import reactLogo from '@/assets/react.svg'
import viteLogo from '/vite.svg'

import { Button, message, Modal, DatePicker } from 'antd'
import UseHook from '../demos/hook-demo/useHook'
import UseOptimisticHook from '../demos/hook-demo/useOptimisticHook'
import UseTransitionHook from '../demos/hook-demo/useTransitionHook'
import ZustandUseDemo from '../demos/zustand_use_demo'
import { useUserStoreSample } from '@/store/zustand-store/userStore_sample'
import { GlobalContext } from '@/main'
import { useNavigate } from 'react-router';
// 引入的组件


export default function Home() {
    const [count, setCount] = useState(0)
    const navigate = useNavigate();
    const globalConfigContext = useContext(GlobalContext);
    const { userInfo_sample } = useUserStoreSample()


    const openInfo = () => {
        // console.log(modal, message);

        message.info('info');
        Modal.success({
            content: 'success',
        });
    }

    useEffect(() => {
        console.log('userInfo_sample', userInfo_sample);
    }, [userInfo_sample])
    useEffect(() => {
        console.log('globalConfigContext', globalConfigContext);

    }, [globalConfigContext])



    return (
        <Fragment>
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
            {/* 引入antd-design */}
            <Button type="primary" onClick={() => openInfo()}>antd-btn</Button>
            <Button type="primary" onClick={() => navigate('/404')}>导航到404页面</Button>
            <Button type="primary" onClick={() => navigate('/layout/teams/123')}>导航到下一页</Button>
            <DatePicker></DatePicker>
        </Fragment>
    )
}
