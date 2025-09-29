// userStore规范版： 包含devTools的使用
import { create } from 'zustand';

import { devtools } from 'zustand/middleware';

/**
    从上面可以看到，我们引入了`devtools`这个东西。那它是什么呢? 

    答： devtools 是 Zustand 提供的中间件，主要用于增强开发调试能力。其核心作用包括：
        1. ‌集成 Redux DevTools 支持‌
        自动连接浏览器 Redux DevTools 扩展，实现状态变更的可视化追踪和时间旅行调试

        ‌2. 状态变更记录‌
        记录每次状态更新的动作类型、前后状态快照和调用栈信息

        ‌3. 时间旅行调试‌
        支持在 DevTools 中回放/跳转到任意历史状态，便于复现问题

        ‌4. Action 命名优化‌
        自动为异步操作生成可读的 action 名称（如 fetchData/pending)

        具体使用，就见下面的devTool函数（注意，那是个函数哦，接收两个参数，第二个是devTool的配置项，即： 启用：只在开发环境启用，）
*/


interface UserInfo {
    id: number;
    username: string;
    email: string;
    phone: string;
}

interface UserState {
    permissions: string[];
    userInfo: UserInfo;
    setPermissions: (permissions: string[]) => void;
    setUserInfo: (userInfo: UserInfo) => void;
    clearInfo: () => void;
}


export const useUserStore = create<UserState>()(
    devtools(
        (set) => ({
            // 定义变量和函数均写在这里
            permissions: [],
            userInfo: {
                id: 0,
                username: '123',
                email: '',
                phone: ''
            },
            /** 设置用户信息 */
            setPermissions: (permissions) => set({ permissions }),
            /** 设置权限 */
            setUserInfo: (userInfo) => set({ userInfo }),
            /** 清除用户信息 */
            clearInfo: () => set({
                userInfo: { id: 0, username: '', email: '', phone: '' }
            })
        }),
        {
            enabled: process.env.NODE_ENV === 'development',  //  启用devTools ？  仅开发环境，
            name: 'userStore' // 为了区分多个sotre，而定义的唯一值
        }
    )
);
