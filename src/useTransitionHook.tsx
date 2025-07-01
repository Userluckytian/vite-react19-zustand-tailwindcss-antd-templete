import React, { useContext, useEffect, useImperativeHandle, useTransition, type Ref, use } from 'react'
import { ThemeContext } from './App'
import { sleep } from './utils/utils';
interface CtxChildrenProps {
    ref?: Ref<any>;
};
export default function UseTransitionHook(props: CtxChildrenProps) {
    // 从项目Context中获取项目对象
    const themeContext = useContext(ThemeContext)
    const [isPending, startTransition] = useTransition();

    const alert = () => {
        window.alert('ok！')
    }
    useImperativeHandle(props.ref, () => ({
        alert,
    }));


    const asyncFunc = () => {
        startTransition(async () => {
            await sleep(4000);
        })
    };
    const syncFunc = () => {
        startTransition(() => sleep(4000).then((_res: any) => {}))
    };

    // console.log('themeContext', themeContext);
    
    // This would not work with useContext
    // because of the early return.
    const theme = use(ThemeContext);

    return (
        <div>C {isPending ? '加载中...' : '加载完成'}</div>
    )
}
