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
import { useEffect, useRef, useState } from "react";
import { Popover } from "antd";
const TuoYuan = () => {
  // 雷达椭圆轨道动画相关
  const radarContainerRef = useRef<HTMLDivElement | null>(null);
  const radarRefs = useRef<any[]>([]);
  const animRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const [paused, setPaused] = useState<boolean>(false);
  // 使用 ref 保持最新暂停状态，避免重新运行 useEffect 导致 startRef 被重置
  const pausedRef = useRef<boolean>(false);
  // 雷达卫星数据
  const radarItems = [
    {
      url: GF1,
      desc: "",
      name: "高分一号(GF-1)",
      load: ["全色/多光谱相机", "多光谱相机"],
      resolution: ["2m/8m", "416m"],
      field: ["在轨运行卫星及载荷工作正常"],
      style: {
        top: "50px",
        left: "180px",
      },
    },
    {
      url: GF3,
      desc: "高分三号",
      name: "高分三号(GF-3)",
      load: ["聚束", "超精细条带", "精细条带2"],
      resolution: ["1m", "3m", "10m"],
      field: ["在轨运行卫星及载荷工作正常"],
      style: {
        top: "110px",
        left: "320px",
      },
    },
    {
      url: GF4,
      desc: "高分四号",

      name: "高分四号(GF-4)",
      load: ["多光谱相机"],
      resolution: ["50m"],
      field: ["在轨运行卫星及载荷工作正常"],
      style: {
        top: "125px",
        left: "450px",
      },
    },
    {
      url: GF6,
      desc: "高分六号",

      name: "高分六号(GF-6)",
      load: ["全色/多光谱相机", "多光谱相机"],
      resolution: ["2m/8m", "16m"],
      field: ["在轨运行卫星及载荷工作正常"],
      style: {
        top: "130px",
        left: "580px",
      },
    },
    {
      url: GF7,
      desc: "高分七号",

      name: "高分七号(GF-7)",
      load: ["前视全色", "后视全色多光谱"],
      resolution: ["0.8m", "0.65m/2.6m"],
      field: ["在轨运行卫星及载荷工作正常"],
      style: {
        top: "130px",
        right: "400px",
      },
    },
    {
      url: ZY1,
      desc: "资源",

      name: "资源一号02E星(ZY-1E)",
      load: ["全色/多光谱相机", "高光谱相机"],
      resolution: ["2m/8m", "16m"],
      field: ["在轨运行卫星及载荷工作正常"],
      style: {
        top: "150px",
        right: "170px",
      },
    },
    {
      url: ZY3,
      desc: "资源三号",

      name: "资源三号03星(ZY-3 03)",
      load: ["正视相机", "多光谱相机"],
      resolution: ["2.1", "5.8"],
      field: ["在轨运行卫星及载荷工作正常"],
      style: {
        top: "80px",
        right: "100px",
      },
    },
    {
      url: ZBDQ,
      desc: "中巴地球资源卫星",

      name: "中巴地球资源卫星04A星(CBERS-04A)",
      load: ["全色/多光谱相机", "多光谱相机", "宽视场成像仪"],
      resolution: ["17", "60", "1m"],
      field: ["在轨运行卫星及载荷工作正常"],
      style: {
        top: "10px",
        right: "300px",
      },
    },
    {
      url: DQHJ,
      desc: "",

      name: "大气环境监测卫星(DQ-1)",
      load: ["高精度偏振扫描仪"],
      resolution: ["优于10"],
      field: ["在轨测试运行卫星及载荷工作正常"],
      style: {
        top: "100px",
        right: "300px",
      },
    },
    {
      url: GGPGC,
      desc: "高光谱观测卫星(GF-5B)",

      name: "高光谱观测卫星(GF-5B)",
      load: [
        "可见短波红外高光谱相机",
        "全谱段光谱成像仪",
        "多角度偏振成像仪",
        "紫外高光谱大气成分探测仪",
      ],
      resolution: ["30", "20/40", "优于3.5", "优于0.3~0.5"],
      field: ["在轨运行卫星及载荷工作正常"],
      style: {
        top: "100px",
        right: "300px",
      },
    },
    {
      url: GGPZH,
      desc: "",
      name: "高光谱综合观测卫星(GF-5（01A）)",
      load: [
        "可见短波红外高光谱相机",
        "宽幅热红外成像仪",
        "大气痕量气体差分吸收光谱仪",
      ],
      resolution: [
        "30±0.1",
        "≤100（星下点）",
        "优于 24（垂直于轨道）×13（沿轨方向）",
      ],
      field: ["在轨运行卫星及载荷工作正常"],
      style: {
        top: "100px",
        right: "300px",
      },
    },

    {
      url: HJJZAB,
      desc: "环境减灾二号A、B卫星",

      name: "环境减灾二号A、B卫星(HJ-2A/2B)",
      load: [
        "多光谱相机（5波段）",
        "高光谱相机（215波段）",
        "红外相机（9波段）",
      ],
      resolution: ["16m", "48/96", "48/96", ,],
      field: ["在轨运行卫星及载荷工作正常"],
      style: {
        top: "100px",
        right: "300px",
      },
    },
    {
      url: HJJZEF,
      desc: "",

      name: "环境减灾二号E、F卫星(HJ-2E/2F)",
      load: ["单极化条带", "双极化条带", "单极化扫描", "双极化扫描"],
      resolution: ["5", "5", "25", "25"],
      field: ["在轨运行卫星及载荷工作正常"],
      style: {
        top: "100px",
        right: "300px",
      },
    },
  ];
  // 雷达展示信息
  const radarContent = (item: any) => {
    return (
      <div>
        <div>传感器：{item.load.map((i: any) => i).join("、")}</div>
        <div>分辨率：{item.resolution.map((i: any) => i).join("、")}</div>
        <div>在轨工作状态：{item.field.map((i: any) => i).join("、")}</div>
      </div>
    );
  };
  const setRadarPaused = (v: boolean) => {
    pausedRef.current = v;
    setPaused(v);
  };
  // 雷达轨道动画
  useEffect(() => {
    const centerOffsetX = 0;
    const centerOffsetY = -30;
    const period = 35000;
    const step = (t: number) => {
      if (!startRef.current) startRef.current = t;
      const elapsed = t - startRef.current;
      const container = radarContainerRef.current;
      if (!container) {
        animRef.current = requestAnimationFrame(step);
        return;
      }
      const bbox = container.getBoundingClientRect();
      const cx = bbox.width / 2 + centerOffsetX;
      const cy = bbox.height / 2 + centerOffsetY;
      const a = Math.max(10, bbox.width / 2 - 30);
      const b = Math.max(10, bbox.height / 2 - 10);
      radarItems.forEach((_, i) => {
        const el = radarRefs.current[i];
        if (!el) return;
        // 使用 pausedRef 来判断是否暂停，避免 useEffect 重建导致 startRef 重置
        if (pausedRef.current) return;

        const phase = (i / Math.max(1, radarItems.length)) * Math.PI * 2;
        const angle =
          ((elapsed / period) * Math.PI * 2 + phase) % (Math.PI * 2);
        const x = cx + a * Math.cos(angle);
        const y = cy + b * Math.sin(angle);
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.transform = "translate(-50%, -50%)";
      });

      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    const onResize = () => {
      // 仅在容器尺寸变化时重置起始时间，以避免跳动
      startRef.current = null;
    };
    window.addEventListener("resize", onResize);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
      // 不再在 cleanup 时重置 startRef，防止暂停/恢复造成回到起点
    };
  }, []);
  return (
    <div className="HN3-home-radar">
      <div className="radar-content" ref={radarContainerRef}>
        {radarItems.map((item: any, index: number) => (
          <Popover
            key={item.name}
            content={radarContent(item)}
            title={item.name}
          >
            <img
              ref={(el) => (radarRefs.current[index] = el as any)}
              className="radar-item"
              src={item.url}
              alt={item.name}
              // style={item.style}
              onMouseEnter={() => setRadarPaused(true)}
              onMouseLeave={() => setRadarPaused(false)}
            />
          </Popover>
        ))}
      </div>
    </div>
  );
};

export default TuoYuan;
