import React, { Activity, useEffect } from 'react'

export default function ActivityAPI() {
    const [isShowingSidebar, setIsShowingSidebar] = React.useState(false);

    useEffect(() => {
        setTimeout(() => {
            setIsShowingSidebar(true);
        }, 2000);
    }, [])

    // API介绍地址： https://zh-hans.react.dev/reference/react/Activity#speeding-up-interactions-during-page-load
    // 询问： Activity是做什么用的，或者说有什么作用？ 好处是什么？
    // 回答： 打开上述链接，找到最右侧的【目录】中的【Usage】，列出的四点就是它的用途

    /* 对四点用途自己的理解：
    
    1：由于 <Activity> 组件是通过 display: none 来隐藏其子组件的，因此这些子组件的 DOM 元素在被隐藏时仍然保留在页面中。简言之：页面的内容都在，只是通过css控制了dom元素的显示和隐藏。
    2：可以作用在的地方： 侧边抽屉栏，每次展开和收起，我们可能并不想销毁它，（这是 Activity 的完美用例----from 官网介绍）
    3：路由缓存听过吗? 我打开a页面，然后再打开b页面， 使用tab切换俩页面，俩页面的内容都存在呐。（当然这个不能这么用，路由和这个还是有不同的。 可以研究下路由缓存）
    4：提前让其他页面的部分内容，在切换到页面之前，提前加载。
    5：加快页面加载期间的交互速度
    
    */ 

    return (
        <>
            {/* before写法：*/}
            {isShowingSidebar && <span>SidebarContents...</span>}

            {/* after写法：*/}
            <Activity mode={isShowingSidebar ? "visible" : "hidden"}>
                <span>SidebarContents...</span>
            </Activity>
        </>
    )
}
