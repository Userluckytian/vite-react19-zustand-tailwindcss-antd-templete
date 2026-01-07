import { cn } from '@/utils/tailwind'
import { App, Avatar, Dropdown } from 'antd'
import React, { Fragment } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { UserOutlined } from "@ant-design/icons";
import { useUserStoreSample } from '@/store/zustand-store/userStore_sample';
import { clearLocalInfo } from '@/store/session-store';
import { logout } from '@/request/services/login';

export default function Layout() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const exit = () => {
        // const trueAPI = logout();
        const mockAPI = Promise.resolve({status: 200})
        mockAPI.then((res: any) => {
            if (res.status === 200) {
                clearLocalInfo();
                navigate('/login')
            } else {
                message.error('退出失败, 请重试')
            }
        })
    }
    const userInfo_sample = useUserStoreSample((state) => state.userInfo_sample);
    const dropMenus = [
        {
            label: <span onClick={() => exit()}>退出登录</span>,
            key: 'exit',
        }
    ];

    return (
        <Fragment>
            <header className={cn('flex justify-between items-center bg-white border-b border-gray-300 dark:border-gray-700 h-16', 'system-header')}>
                <div className={cn('w-fit h-full flex items-center', 'system-logo-title')}>
                    <div className={cn('flex gap-2.5 items-center m-2')}>
                        <img src="/vite.svg" alt="" />
                        <span className={cn('font-bold text-3xl')}>Vite React</span>
                    </div>
                    <ul className={cn('flex gap-3 items-center m-3.5')}>
                        {/* 地图模块应该包括绘制、地图切换、缩放、测量、底图切换等功能 */}
                        <li className={cn('w-25 text-[1rem] hover:cursor-pointer hover:opacity-80 hover:text-amber-600')} onClick={() => navigate('/layout/map')}>地图模块</li>
                        <li className={cn('w-25 text-[1rem] hover:cursor-pointer hover:opacity-80 hover:text-amber-600')} onClick={() => navigate('/layout/satellite')}>卫星旋转模块</li>
                        {/* react 19 练习 */}
                        <li className={cn('w-25 text-[1rem] hover:cursor-pointer hover:opacity-80 hover:text-amber-600')} onClick={() => navigate('/layout/demoOne')}>react19</li>
                        {/* zustand 练习 */}
                        <li className={cn('w-25 text-[1rem] hover:cursor-pointer hover:opacity-80 hover:text-amber-600')} onClick={() => navigate('/layout/DemoTwo')}>zustand</li>
                        {/* 构建左右结构 */}
                        <li className={cn('w-25 text-[1rem] hover:cursor-pointer hover:opacity-80 hover:text-amber-600')} onClick={() => navigate('/layout/demoThree')}>其他</li>
                    </ul>
                </div>
                <Dropdown menu={{ items: dropMenus }} trigger={['click']}>
                    <div className={cn('w-fit pr-3 h-full flex justify-end-safe items-center gap-2 hover:cursor-pointer hover:text-amber-600', 'system-userinfo')}>
                        <Avatar style={{ backgroundColor: '#87d068' }} icon={<UserOutlined />} />
                        <span className='text-xl'>{userInfo_sample.userName}</span>
                    </div>
                </Dropdown>
            </header>
            <main className={cn('flex-1  m-2 h-[calc(100vh-5rem)] bg-white overflow-hidden', 'system-context')}>
                <Outlet />
            </main>
        </Fragment>
    )
}
