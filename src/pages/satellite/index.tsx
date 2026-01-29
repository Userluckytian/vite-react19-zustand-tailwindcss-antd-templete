import {Tabs } from 'antd';
import type { TabsProps } from 'antd/lib';
import Carousel from './carousel';
import PreserveThreeD from './preserve-3d';
import TuoYuan from './tuoyuan';
const Satellite = () => {
    const items: TabsProps['items'] = [
        {
            key: '1',
            label: '椭圆轨迹卫星',
            children: (
                <TuoYuan></TuoYuan>

            ),
        },
        {
            key: '2',
            label: '旋转木马',
            children: (
                <Carousel></Carousel>
            ),
        },
        {
            key: '3',
            label: 'preserve-3D',
            children: (
                <PreserveThreeD></PreserveThreeD>
            ),
        },
    ];
    const onChange = (key: string) => {
        console.log(key);
    }
    return (
        <div className='HN3-home-content'>
            <Tabs defaultActiveKey="1" items={items} onChange={onChange} />
        </div>
    );
}
export default Satellite