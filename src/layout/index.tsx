import React, { Fragment } from 'react'
import { Outlet } from 'react-router'

export default function Layout() {
    return (
        <Fragment>
            <header className='p-1 flex justify-between items-center border-b border-gray-300 dark:border-gray-700'>
                我是标题
            </header>
            <main className='flex-1'>
                <Outlet />
            </main>
        </Fragment>
    )
}
