import { use } from 'react';
import { buildBase64Image } from './utils/utils';

interface UseHookProps {
    num: number;
}


export default function UseHook(props: UseHookProps) {
    const { num } = props;

    // 作用1：在useTransitionHook.tsx中，用use读取ThemeContext的值
    // 作用2: 直接用 use 读取 Promise 的结果 (世纪难题，没办法了，还是回归到之前的写法把！ 之前的写法见解译框架V2.2-北京生态的写法！)
    // 这个世纪难题在官网有介绍: https://react.dev/blog/2024/12/05/react-19#new-feature-use,点击连接，找到‘注意’部分，即英文： ‘note’部分。或者搜索` does not support promises created in render.` 这句话。
    const base64Image: any = use(buildBase64Image(num));
    // 作用3： use这个钩子函数，不可以写在其他的钩子函数里面。需要写在Render函数中，即:函数组件中。

    return (
        <>
            <img
                src={base64Image}
                alt={`图片`}
                style={{ width: '50px', height: '50px' }}
            />
        </>
    );

}