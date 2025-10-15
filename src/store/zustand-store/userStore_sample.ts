// userStore简单版： 去除devTools的使用，甚至下面的类型也可以不定义
import { create } from 'zustand';


interface loginInfo {
    isRegist: boolean;
    userId: number;
    userName: string;
    userToken: string;
    userInfo: UserInfo;
    alias: string;
    avatar: string;
    dingBind: boolean;
    wxBind: boolean;
}

interface UserInfo {
    dayAccessTimes: number;
    orgTypeId: string;
    orgType: string;
    orgNameId: string;
    orgName: string;
}


interface UserState {
    permissions_sample: string[];
    userInfo_sample: loginInfo;
    setPermissions_sample: (permissions: string[]) => void;
    setUserInfo_sample: (userInfo: loginInfo) => void;
    clearInfo_sample: () => void;
}


export const useUserStoreSample = create<UserState>()(

    (set) => ({
        // 定义变量和函数均写在这里
        permissions_sample: [],
        userInfo_sample: {
            isRegist: false,
            userId: 0,
            userName: '',
            userToken: '',
            userInfo: undefined,
            alias: '',
            avatar: '',
            dingBind: false,
            wxBind: false
        },
        /** 设置用户信息 */
        setPermissions_sample: (permissions_sample) => set({ permissions_sample }),
        /** 设置权限 */
        setUserInfo_sample: (userInfo_sample) => set({ userInfo_sample }),
        /** 清除用户信息 */
        clearInfo_sample: () => set({
            userInfo_sample: {
                isRegist: false,
                userId: 0,
                userName: '',
                userToken: '',
                userInfo: undefined,
                alias: '',
                avatar: '',
                dingBind: false,
                wxBind: false
            }
        })
    }),

);
