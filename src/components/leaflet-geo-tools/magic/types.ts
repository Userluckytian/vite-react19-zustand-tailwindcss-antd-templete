/**
 * 魔棒工具（MagicWand）相关类型声明
 * 该工具基于 Canvas 像素数据，通过 floodFill + traceContours 算法
 * 从遥感影像中提取相似颜色区域的轮廓，并转换为 GeoJSON。
 */

// #region MagicWand 库（public/js/MagicWand.js）的类型映射

/** MagicWand 输入图像数据格式 */
export interface MagicImage {
    data: Uint8ClampedArray | Uint8Array; // 像素 RGBA 序列
    width: number;
    height: number;
    bytes: number; // 每像素字节数（RGBA 为 4）
}

/** MagicWand 掩码 (mask) 结果 */
export interface MagicMask {
    data: Uint8Array;
    width: number;
    height: number;
    bounds: {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    };
}

/** MagicWand 轮廓单元 */
export interface MagicContour {
    inner: boolean; // 是否为内环（孔洞）
    label: number;
    points: { x: number; y: number }[];
    initialCount?: number; // 简化前的点数
}

/** MagicWand 库的 API 接口 */
export interface MagicWandLib {
    floodFill: (
        image: MagicImage,
        px: number,
        py: number,
        colorThreshold: number,
        mask?: Uint8Array | null,
        includeBorders?: boolean,
    ) => MagicMask | null;
    gaussBlur: (mask: MagicMask, radius: number) => MagicMask;
    gaussBlurOnlyBorder: (mask: MagicMask, radius: number, visited?: Uint8Array) => MagicMask;
    createBorderMask: (mask: MagicMask) => { data: Uint8Array; width: number; height: number; offset: { x: number; y: number } };
    getBorderIndices: (mask: MagicMask) => number[];
    traceContours: (mask: MagicMask) => MagicContour[];
    simplifyContours: (contours: MagicContour[], simplifyTolerant: number, simplifyCount: number) => MagicContour[];
}

// 把 window.MagicWand 暴露到全局类型系统
declare global {
    interface Window {
        MagicWand?: MagicWandLib;
    }
}

// #endregion

// #region 魔棒编辑器配置/结果

/** 魔棒编辑器配置项（带默认值） */
export interface MagicWandOptions {
    /** 颜色阈值：值越大允许的色差越大（demo 默认 30） */
    threshold?: number;
    /** 高斯模糊半径：值越大边缘越平滑（demo 默认 2） */
    blurRadius?: number;
    /** 拼接瓦片范围：以点击瓦片为中心，向外扩展 n×n（demo 默认 3） */
    stitchN?: number;
    /** 道格拉斯-普克简化容差（demo 默认 2.0） */
    simplifyTolerant?: number;
    /** 简化时保留的最小点数（demo 默认 10） */
    simplifyCount?: number;
    /** 瓦片 URL 模板，必须包含 {x} {y} {z} 占位符 */
    tileUrl: string;
    /** 瓦片大小（默认 256） */
    tileSize?: number;
    /** 启用时的回调函数，用于切换底图等操作 */
    onEnable?: () => void;
    /** antd message 实例（通过 App.useApp() 获取） */
    messageApi?: any;
}

/** 瓦片采样结果 */
export interface TileSampleResult {
    canvas: HTMLCanvasElement;
    imageData: ImageData;
    baseTileX: number; // 拼接画布左上角对应的瓦片 X
    baseTileY: number; // 拼接画布左上角对应的瓦片 Y
    tileSize: number;
    zoom: number;
    pixelX: number; // 点击位置在拼接画布上的像素 X
    pixelY: number; // 点击位置在拼接画布上的像素 Y
}

/** 魔棒提取结果 */
export interface MagicWandResult {
    /** 提取生成的 GeoJSON Feature */
    feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
    /** 原始轮廓数据（已简化） */
    contours: MagicContour[];
    /** 采样使用的参数快照 */
    params: Required<Omit<MagicWandOptions, 'tileUrl' | 'tileSize'>> & { tileUrl: string; tileSize: number };
}

// #endregion
