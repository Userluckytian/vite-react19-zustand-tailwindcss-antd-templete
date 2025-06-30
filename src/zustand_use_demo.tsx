import { useUserStore } from './store/userStore';
import { useUserStoreSample } from './store/userStore_sample';

export default function ZustandUseDemo() {
    // 解构取数据，获取状态和方法
    const { userInfo, setUserInfo } = useUserStore()

    // (1) 只订阅 userInfo 的变化(每个组件中只能实例化一个，不能写多次 useUserStoreSample)
    const userInfo_sample = useUserStoreSample((state) => state.userInfo_sample);
    // // (2) 深层获取
    // const username = useUserStoreSample(state => state.userInfo_sample.username)
    // // (3) 订阅多个变化
    // const datas = useUserStoreSample(
    //     state => ({
    //         x: state.userInfo_sample,
    //         y: state.permissions_sample
    //     })
    // )

    const handleChangeName = () => {
        // 修改username（保留其他字段）
        setUserInfo({
            ...userInfo,
            username: 'zustand'
        })
    }



    return <>
        <h4>
            {userInfo.username} around here...
        </h4>;
        {/* 修改username的按钮 */}
        <button onClick={() => handleChangeName()}>
            改变用户名
        </button>
        <hr />
        <h4>
            {userInfo_sample.username} 简版 around here...
            {/* {username} 简版 around here...
            {datas.x.username} 简版 around here...
            {datas.y} 简版 around here... */}
        </h4>;

    </>

}
