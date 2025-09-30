import { sleep } from '@/utils/utils';
import { useContext, useImperativeHandle, useTransition, type Ref, use } from 'react'

interface CtxChildrenProps {
    ref?: Ref<any>;
};
export default function UseTransitionHook(props: CtxChildrenProps) {
    // 从项目Context中获取项目对象
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


    return (
        <div>C {isPending ? '加载中...' : '加载完成'}</div>
    )
}
