/*  欢迎页： 五彩纸屑效果：https://codepen.io/userluckytian/pen/PwZzobQ  */
import ConfettiManager from "@/utils/confetti";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import "./index.scss";
export default function Welcome() {
  const navigate = useNavigate();
  const [confettiObj, setConfettiObj] = useState<any>(null);
  /** 实例化背景效果：https://www.finisher.co/lab/header/
   *
   */
  function initFinisherHeader() {
    new FinisherHeader({
      count: 5,
      size: {
        min: 2,
        max: 40,
        pulse: 0,
      },
      speed: {
        x: {
          min: 0,
          max: 0.8,
        },
        y: {
          min: 0,
          max: 0.2,
        },
      },
      colors: {
        background: "#15182e",
        particles: ["#ff926b", "#87ddfe", "#acaaff", "#1bffc2", "#f9a5fe"],
      },
      blending: "screen",
      opacity: {
        center: 1,
        edge: 1,
      },
      skew: 0,
      shapes: ["c", "s", "t"],
    });
  }

  /** 播放五彩纸屑
   *
   */
  function playConFetti(confettiInstance: any) {
    if (!confettiInstance.getIsPlaying()) {
      confettiInstance.play();
    } else {
      console.error("confetti is playing");
    }
  }
  useEffect(() => {
    initFinisherHeader(); // 构建背景
    const confettiInstance = new ConfettiManager("confetti-wrapper", {
      particles: 100, // 增加到100个纸屑
      spread: 20, // 加快发射速度
      sizeMin: 4, // 稍微大一点
      sizeMax: 15, // 最大尺寸
    });
    confettiInstance && setConfettiObj(confettiInstance);
    confettiInstance && playConFetti(confettiInstance); // 构建五彩纸屑
  }, []);
  return (
    <div
      className="w-full h-full flex align-center justify-center flex-col gap-8 relative"
      id="welcomeContainerId"
    >
      {/* 底层：背景 */}
      <div
        className="header finisher-header"
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          left: 0,
          top: 0,
          zIndex: 0,
        }}
      ></div>
      {/* 内容部分 */}
      <div
        className="flex align-center justify-center flex-col gap-8 absolute w-full h-full z-1 
            "
        style={{
          textAlign: "center",
        }}
      >
        <div className="text-6xl">🎉</div>
        <h1 className="text-white">项目启动成功</h1>
        <p className="text-white text-xl">一切准备就绪，开始您的精彩旅程吧！</p>
        <div className="action-buttons">
          <div className="btn" onClick={() => navigate("/login")}>
            查看文档
          </div>
          <div className="btn" onClick={() => navigate("/login")}>
            进入主页
          </div>
          <div className="btn" onClick={() => playConFetti(confettiObj)}>
            播放纸屑
          </div>
        </div>
      </div>
      {/* 顶层:五彩纸屑 */}
      <div id="confetti-wrapper"></div>
    </div>
  );
}
