/* 练习1：点赞特效 */
import React from 'react'

export default function DemoOne() {
    return (
        <div className="zan">
            <span>
                点赞特效
            </span>
            <ul>
                {
                    new Array(14).fill(1).map((_, i) => <div key={'zan_' + i}></div>)
                }
            </ul>
        </div>
    )
}
