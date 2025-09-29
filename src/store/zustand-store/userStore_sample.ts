// userStore简单版： 去除devTools的使用，甚至下面的类型也可以不定义
import { create } from 'zustand';

interface UserInfo {
    id: number;
    username: string;
    email: string;
    phone: string;
}

interface UserState {
    permissions_sample: string[];
    userInfo_sample: UserInfo;
    setPermissions_sample: (permissions: string[]) => void;
    setUserInfo_sample: (userInfo: UserInfo) => void;
    clearInfo_sample: () => void;
}


export const useUserStoreSample = create<UserState>()(

    (set) => ({
        // 定义变量和函数均写在这里
        permissions_sample: [],
        userInfo_sample: {
            id: 0,
            username: '321',
            email: '',
            phone: ''
        },
        /** 设置用户信息 */
        setPermissions_sample: (permissions_sample) => set({ permissions_sample }),
        /** 设置权限 */
        setUserInfo_sample: (userInfo_sample) => set({ userInfo_sample }),
        /** 清除用户信息 */
        clearInfo_sample: () => set({
            userInfo_sample: { id: 0, username: '', email: '', phone: '' }
        })
    }),

);
