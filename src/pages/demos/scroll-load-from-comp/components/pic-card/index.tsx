
import useInView from '@/hooks/useInView';

import React, { useRef } from 'react'
import './index.scss';

interface PicCardProps {
    image: string;
    title: string;
    description: string;
    index: number
}
export default function PicCard(props: PicCardProps) {
    const { image, title, description, index } = props;
    const [ref, isInView] = useInView();
    /* 追踪元素是否在视窗内的第二种方式（已知库）：   
        // import { useInView } from "motion/react"
        // const ref = useRef(null)
        // const isInView = useInView(ref)
        // console.log('isInView', isInView);
        然后根据isInView来控制className，设置显示的动画效果！所以最后还是要到css属性的设置上面
    */

    return (
        <div
            ref={ref as any}
            className={`image-card ${isInView ? 'visible' : ''}`}
            style={{
                animationDelay: isInView ? `${index * 0.1}s` : '0s',
                transitionDelay: isInView ? `${index * 0.1}s` : '0s'
            }}
        >
            <img
                src={image}
                alt={title}
                loading="lazy"
            />
            <div className="image-content">
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
        </div>
    )
}
