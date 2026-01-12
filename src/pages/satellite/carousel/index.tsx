import "./index.scss";
import GF1 from "@/assets/images/高分一号.png";
import GF3 from "@/assets/images/高分三号.png";
import GF4 from "@/assets/images/高分四号.png";
import GF6 from "@/assets/images/高分六号.png";
import GF7 from "@/assets/images/高分七号.png";
import ZY1 from "@/assets/images/资源一号02Epng.png";
import ZY3 from "@/assets/images/资源三号03.png";
import ZBDQ from "@/assets/images/中巴地球资源卫星04A.png";
import DQHJ from "@/assets/images/大气环境监测卫星.png";
import GGPGC from "@/assets/images/高光谱观测卫星.png";
import GGPZH from "@/assets/images/高光谱综合观测卫星.png";
import HJJZAB from "@/assets/images/环境减灾二号A、B卫星.png";
import HJJZEF from "@/assets/images/环境减灾二号E、F卫星.png";
const Carousel = () => {
    // 雷达卫星数据
    const radarItems = [
        {
            id: "1",
            url: GF1,
            name: "高分一号(GF-1)",
            load: ["全色/多光谱相机", "多光谱相机"],
        },
        {
            url: GF3,
            name: "高分三号(GF-3)",
            load: ["聚束", "超精细条带", "精细条带2"],
        },
        {
            id: "2",
            url: GF4,
            name: "高分四号(GF-4)",
            load: ["多光谱相机"],
        },
        {
            id: "3",
            url: GF6,
            name: "高分六号(GF-6)",
            load: ["全色/多光谱相机", "多光谱相机"],
        },
        {
            id: "4",
            url: GF7,
            name: "高分七号(GF-7)",
            load: ["前视全色", "后视全色多光谱"],
        },
        {
            id: "5",
            url: ZY1,
            name: "资源一号02E星(ZY-1E)",
            load: ["全色/多光谱相机", "高光谱相机"],
        },
        {
            id: "6",
            url: ZY3,
            name: "资源三号03星(ZY-3 03)",
            load: ["正视相机", "多光谱相机"],
        },
        {
            id: "7",
            url: ZBDQ,
            name: "中巴地球资源卫星04A星(CBERS-04A)",
            load: ["全色/多光谱相机", "多光谱相机", "宽视场成像仪"],
        },
        {
            id: "8",
            url: DQHJ,
            name: "大气环境监测卫星(DQ-1)",
            load: ["高精度偏振扫描仪"],
        },
        {
            id: "9",
            url: GGPGC,
            name: "高光谱观测卫星(GF-5B)",
            load: [
                "可见短波红外高光谱相机",
                "全谱段光谱成像仪",
                "多角度偏振成像仪",
                "紫外高光谱大气成分探测仪",
            ],
        },
        {
            id: "10",
            url: GGPZH,
            name: "高光谱综合观测卫星(GF-5（01A）)",
            load: [
                "可见短波红外高光谱相机",
                "宽幅热红外成像仪",
                "大气痕量气体差分吸收光谱仪",
            ],
        },
        {
            id: "11",
            url: HJJZAB,
            name: "环境减灾二号A、B卫星(HJ-2A/2B)",
            load: [
                "多光谱相机（5波段）",
                "高光谱相机（215波段）",
                "红外相机（9波段）",
            ],
        },
        {
            id: "12",
            url: HJJZEF,
            name: "环境减灾二号E、F卫星(HJ-2E/2F)",
            load: ["单极化条带", "双极化条带", "单极化扫描", "双极化扫描"],
        },
    ];
    return (
        <div className="carousel-box">
            <div className="carousel-tilt">
                <div className="carousel-origin">
                    <div className="ring"></div>
                    {radarItems.map((s, i) => (
                        <div
                            className="satellite-carousel"
                            key={'carousel-' + (s.id ?? i)}
                            style={{ '--i': i } as React.CSSProperties}
                        >
                            <img src={s.url} alt={s.name} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Carousel;
