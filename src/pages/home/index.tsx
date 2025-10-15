import { Fragment, Suspense, useContext, useEffect, useRef, useState } from 'react'

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
           
        </Fragment>
    )
}
