/* 效果： 滚动到视窗位置再显示图片的效果  */
import React from 'react'
import PicCard from './components/pic-card';
import './index.scss'

export default function ScrollLoadFromComp() {

    const images = [
        {
            title: "山脉风光",
            description: "壮丽的山脉景色，云雾缭绕，令人心旷神怡。",
            image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
        },
        {
            title: "海滩日落",
            description: "金色阳光洒在海面上，形成美丽的日落景观。",
            image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
        },
        {
            title: "森林小径",
            description: "幽静的森林小径，阳光透过树叶洒下斑驳光影。",
            image: "https://images.unsplash.com/photo-1448375240586-882707db888b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
        },
        {
            title: "城市夜景",
            description: "繁华都市的夜景，灯火辉煌，充满活力。",
            image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
        },
        {
            title: "湖泊倒影",
            description: "宁静的湖泊，完美的倒影如同镜面一般。",
            image: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
        },
        {
            title: "沙漠风光",
            description: "广袤的沙漠，沙丘起伏，充满神秘感。",
            image: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
        }
    ];


    return (
        <div className='image-grid'>
            {images.map((image, index) => (
                <div className='image-grid__item'>
                    <PicCard
                        key={`SLP_${index}`}
                        image={image.image}
                        title={image.title}
                        description={image.description}
                        index={index}
                    />
                </div>
            ))}
        </div>
    )
}
