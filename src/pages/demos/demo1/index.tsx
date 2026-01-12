/* 练习1：点赞特效 */
import { Button } from 'antd'
import { GiftOutlined } from '@ant-design/icons'

export default function DemoOne() {
    return (
        <div className="zan">
            <br />
            <a className='text-2xl' href="https://ant-design.antgroup.com/docs/react/migration-v6-cn#api-%E8%B0%83%E6%95%B4">浏览antd6-API调整</a>
            <br />
            <br />
            <a className='text-2xl' href="https://ant-design.antgroup.com/docs/blog/semantic-beauty-cn#%E4%B8%8E-tailwind-css-%E7%BB%93%E5%90%88" target="tailwind-antd">测试tailwind类名在antd中的使用：</a>
            <Button
                classNames={{
                    root: 'bg-black text-white border-none hover:bg-[#2e2e2e]', 
                    icon: 'text-2xl',
                }}
                icon={<GiftOutlined />}
            >
                图标生效了，但是root里的没生效。。。
            </Button>
        </div>
    )
}
