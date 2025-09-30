import React, { useEffect, useRef, useState } from 'react'

// 自定义 Hook：检测元素是否进入视口
const useInView = (options = {}) => {
    const [isInView, setIsInView] = useState(false);
    const ref = useRef<any>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(([entry]) => {
            setIsInView(entry.isIntersecting);
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px',
            ...options
        });

        observer.observe(element);

        return () => {
            observer.unobserve(element);
        };
    }, [options]);

    return [ref, isInView];
};
export default useInView;