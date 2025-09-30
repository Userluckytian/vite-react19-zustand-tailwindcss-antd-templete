interface ConfettiParticle {
    frame: number;
    outer: HTMLDivElement;
    inner: HTMLDivElement;
    axis: string;
    theta: number;
    dTheta: number;
    x: number;
    y: number;
    dx: number;
    dy: number;
    splineX: number[];
    splineY: number[];
    update: (height: number, delta: number) => boolean;
}

interface ColorTheme {
    (): string;
}

interface ConfettiOptions {
    particles?: number;      // 纸屑数量
    spread?: number;         // 纸屑发射间隔
    sizeMin?: number;        // 最小尺寸
    sizeMax?: number;        // 最大尺寸
    eccentricity?: number;   // 离心率（影响运动轨迹）
    deviation?: number;      // 偏差量（初始位置偏移）
    dxThetaMin?: number;     // X轴速度最小角度
    dxThetaMax?: number;     // X轴速度最大角度
    dyMin?: number;          // Y轴最小速度
    dyMax?: number;          // Y轴最大速度
    dThetaMin?: number;      // 最小旋转速度
    dThetaMax?: number;      // 最大旋转速度
}

class ConfettiManager {
    // 数学函数和常量（优化性能，避免重复查找）
    private random: () => number = Math.random;           // 随机数生成函数
    private cos: (x: number) => number = Math.cos;        // 余弦函数
    private sin: (x: number) => number = Math.sin;        // 正弦函数
    private PI: number = Math.PI;                         // 圆周率 π
    private PI2: number = this.PI * 2;                    // 2π，用于角度计算

    // 动画控制变量
    private timer: number | undefined = undefined;        // 纸屑生成定时器
    private frame: number | undefined = undefined;        // 动画帧ID
    private confetti: ConfettiParticle[] = [];            // 存储所有纸屑对象的数组
    private isPlaying: boolean = false;                   // 播放状态标志

    // 纸屑效果配置参数
    private particles: number;        // 纸屑总数量（默认：50个）
    private spread: number;           // 纸屑发射间隔（毫秒），值越小发射越快
    private sizeMin: number;          // 纸屑最小尺寸（像素）
    private sizeMax: number;          // 纸屑最大尺寸（像素）
    private eccentricity: number;     // 离心率，影响纸屑的运动轨迹形状
    private deviation: number;        // 初始位置偏差，控制纸屑从屏幕上方多高处开始
    private dxThetaMin: number;       // X轴速度的最小角度（弧度）
    private dxThetaMax: number;       // X轴速度的最大角度（弧度）
    private dyMin: number;            // Y轴下落的最小速度
    private dyMax: number;            // Y轴下落的最大速度
    private dThetaMin: number;        // 纸屑旋转的最小角速度
    private dThetaMax: number;        // 纸屑旋转的最大角速度
    // 
    private colorThemes: ColorTheme[] = [
        (): string => {
            return this.color(200 * this.random() | 0, 200 * this.random() | 0, 200 * this.random() | 0);
        },
        (): string => {
            const black: number = 200 * this.random() | 0;
            return this.color(200, black, black);
        },
        (): string => {
            const black: number = 200 * this.random() | 0;
            return this.color(black, 200, black);
        },
        (): string => {
            const black: number = 200 * this.random() | 0;
            return this.color(black, black, 200);
        },
        (): string => {
            return this.color(200, 100, 200 * this.random() | 0);
        },
        (): string => {
            return this.color(200 * this.random() | 0, 200, 200);
        },
        (): string => {
            const black: number = 256 * this.random() | 0;
            return this.color(black, black, black);
        },
        (): string => {
            return this.colorThemes[this.random() < 0.5 ? 1 : 2]();
        },
        (): string => {
            return this.colorThemes[this.random() < 0.5 ? 3 : 5]();
        },
        (): string => {
            return this.colorThemes[this.random() < 0.5 ? 2 : 4]();
        }
    ];

    private confettiWrapper: HTMLDivElement;

    constructor(containerId: string = 'confetti-wrapper', options: ConfettiOptions = {}) {
        const wrapper = document.getElementById(containerId) as HTMLDivElement;
        if (!wrapper) {
            throw new Error(`Container element with id '${containerId}' not found`);
        }
        this.confettiWrapper = wrapper;

        // 设置默认参数，允许通过options覆盖
        this.particles = options.particles ?? 50;           // 默认50个纸屑，比原来的10个多
        this.spread = options.spread ?? 40;                 // 发射间隔（毫秒）
        this.sizeMin = options.sizeMin ?? 3;                // 最小尺寸
        this.sizeMax = (options.sizeMax ?? 12) - this.sizeMin; // 最大尺寸范围
        this.eccentricity = options.eccentricity ?? 10;     // 离心率
        this.deviation = options.deviation ?? 100;          // 初始位置偏差
        this.dxThetaMin = options.dxThetaMin ?? -0.1;       // X轴最小角度
        this.dxThetaMax = -this.dxThetaMin - this.dxThetaMin; // X轴最大角度（基于最小角度计算）
        this.dyMin = options.dyMin ?? 0.13;                 // Y轴最小速度
        this.dyMax = options.dyMax ?? 0.18;                 // Y轴最大速度
        this.dThetaMin = options.dThetaMin ?? 0.4;          // 最小旋转速度
        this.dThetaMax = (options.dThetaMax ?? 0.7) - this.dThetaMin; // 最大旋转速度范围

        this.setupContainer();
    }

    private setupContainer(): void {
        this.confettiWrapper.style.position = 'fixed';
        this.confettiWrapper.style.top = '0';
        this.confettiWrapper.style.left = '0';
        this.confettiWrapper.style.width = '100%';
        this.confettiWrapper.style.height = '0';
        this.confettiWrapper.style.overflow = 'visible';
        this.confettiWrapper.style.zIndex = '9999';
        this.confettiWrapper.style.pointerEvents = 'none';
    }

    private color(r: number, g: number, b: number): string {
        return `rgb(${r},${g},${b})`;
    }

    // 余弦插值 - 用于创建平滑的动画过渡效果
    private interpolation(a: number, b: number, t: number): number {
        return (1 - this.cos(this.PI * t)) / 2 * (b - a) + a;
    }

    // 在 [0, 1] 上创建一维最大泊松圆盘 - 用于生成纸屑的随机运动路径
    private createPoisson(): number[] {
        const radius: number = 1 / this.eccentricity;
        const radius2: number = radius + radius;
        const domain: number[] = [radius, 1 - radius];
        let measure: number = 1 - radius2;
        const spline: number[] = [0, 1];

        while (measure) {
            let dart: number = measure * this.random();
            let i: number, l: number, interval: number, a: number, b: number, c: number, d: number;

            // 找到 dart 的位置
            for (i = 0, l = domain.length, measure = 0; i < l; i += 2) {
                a = domain[i];
                b = domain[i + 1];
                interval = b - a;
                if (dart < measure + interval) {
                    spline.push(dart += a - measure);
                    break;
                }
                measure += interval;
            }
            c = dart - radius;
            d = dart + radius;

            // 更新域
            for (i = domain.length - 1; i > 0; i -= 2) {
                l = i - 1;
                a = domain[l];
                b = domain[i];
                if (a >= c && a < d) {
                    if (b > d) {
                        domain[l] = d;
                    } else {
                        domain.splice(l, 2);
                    }
                } else if (a < c && b > c) {
                    if (b <= d) {
                        domain[i] = c;
                    } else {
                        domain.splice(i, 0, c, d);
                    }
                }
            }

            // 重新测量域
            for (i = 0, l = domain.length, measure = 0; i < l; i += 2) {
                measure += domain[i + 1] - domain[i];
            }
        }

        return spline.sort((x, y) => x - y);
    }

    // 创建单个五彩纸屑
    private createConfetto(theme: ColorTheme): ConfettiParticle {
        const outer = document.createElement('div');
        const inner = document.createElement('div');
        outer.appendChild(inner);

        const outerStyle: CSSStyleDeclaration = outer.style;
        const innerStyle: CSSStyleDeclaration = inner.style;

        outerStyle.position = 'absolute';
        outerStyle.width = (this.sizeMin + this.sizeMax * this.random()) + 'px';
        outerStyle.height = (this.sizeMin + this.sizeMax * this.random()) + 'px';
        innerStyle.width = '100%';
        innerStyle.height = '100%';
        innerStyle.backgroundColor = theme();

        outerStyle.perspective = '50px';
        outerStyle.transform = 'rotate(' + (360 * this.random()) + 'deg)';

        const axis = 'rotate3D(' +
            this.cos(360 * this.random()) + ',' +
            this.cos(360 * this.random()) + ',0,';
        const theta = 360 * this.random();
        const dTheta = this.dThetaMin + this.dThetaMax * this.random();
        innerStyle.transform = axis + theta + 'deg)';

        const x = window.innerWidth * this.random();
        const y = -this.deviation;
        const dx = this.sin(this.dxThetaMin + this.dxThetaMax * this.random());
        const dy = this.dyMin + this.dyMax * this.random();
        outerStyle.left = x + 'px';
        outerStyle.top = y + 'px';

        // 创建周期性样条
        const splineX = this.createPoisson();
        const splineY: number[] = [];
        for (let i = 1, l = splineX.length - 1; i < l; ++i) {
            splineY[i] = this.deviation * this.random();
        }
        splineY[0] = splineY[splineX.length - 1] = this.deviation * this.random();

        const update = (height: number, delta: number): boolean => {
            if (!frame) frame = 0;
            frame += delta;
            currentX += dx * delta;
            currentY += dy * delta;
            currentTheta += dTheta * delta;

            // 计算样条并转换为极坐标
            const phi: number = (frame % 7777) / 7777;
            let i: number = 0;
            let j: number = 1;

            while (phi >= splineX[j]) {
                i = j++;
            }

            const rho: number = this.interpolation(
                splineY[i],
                splineY[j],
                (phi - splineX[i]) / (splineX[j] - splineX[i])
            );
            const phiScaled: number = phi * this.PI2;

            outerStyle.left = currentX + rho * this.cos(phiScaled) + 'px';
            outerStyle.top = currentY + rho * this.sin(phiScaled) + 'px';
            innerStyle.transform = axis + currentTheta + 'deg)';

            return currentY > height + this.deviation;
        };

        let frame = 0;
        let currentX = x;
        let currentY = y;
        let currentTheta = theta;

        return {
            frame,
            outer,
            inner,
            axis,
            theta: currentTheta,
            dTheta,
            x: currentX,
            y: currentY,
            dx,
            dy,
            splineX,
            splineY,
            update
        };
    }

    // 清理所有五彩纸屑
    private cleanup(): void {
        // 清除定时器
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }

        // 清除动画帧
        if (this.frame) {
            cancelAnimationFrame(this.frame);
            this.frame = undefined;
        }

        // 移除所有纸屑元素
        while (this.confettiWrapper.firstChild) {
            this.confettiWrapper.removeChild(this.confettiWrapper.firstChild);
        }

        // 清空数组
        this.confetti.length = 0;
        this.isPlaying = false;
    }

    // 播放五彩纸屑效果
    public play(): void {
        if (this.isPlaying) {
            return; // 如果正在播放，则不再触发新的播放
        }

        this.cleanup(); // 先清理之前的
        this.isPlaying = true;

        const theme: ColorTheme = this.colorThemes[0];
        let confettiCount = 0;
        const maxConfetti = this.particles;

        const addConfetto = (): void => {
            if (confettiCount < maxConfetti) {
                const confetto: ConfettiParticle = this.createConfetto(theme);
                this.confetti.push(confetto);
                this.confettiWrapper.appendChild(confetto.outer);
                confettiCount++;
                this.timer = window.setTimeout(addConfetto, this.spread * this.random());
            }
        };

        addConfetto();

        // 开始动画循环
        let prev: number | undefined = undefined;

        const loop = (timestamp: number): void => {
            const delta: number = prev ? timestamp - prev : 0;
            prev = timestamp;
            const height: number = window.innerHeight;

            for (let i = this.confetti.length - 1; i >= 0; --i) {
                if (this.confetti[i].update(height, delta)) {
                    this.confettiWrapper.removeChild(this.confetti[i].outer);
                    this.confetti.splice(i, 1);
                }
            }

            // 如果还有纸屑在屏幕上，继续动画
            if (this.confetti.length > 0) {
                this.frame = requestAnimationFrame(loop);
            } else {
                // 所有纸屑都消失后，清理并重置状态
                this.cleanup();
            }
        };

        this.frame = requestAnimationFrame(loop);
    }

    // 停止播放
    public stop(): void {
        this.cleanup();
    }

    // 获取播放状态
    public getIsPlaying(): boolean {
        return this.isPlaying;
    }

    // 更新配置（可以在运行时调整参数）
    public updateOptions(options: ConfettiOptions): void {
        if (options.particles !== undefined) this.particles = options.particles;
        if (options.spread !== undefined) this.spread = options.spread;
        if (options.sizeMin !== undefined) this.sizeMin = options.sizeMin;
        if (options.sizeMax !== undefined) this.sizeMax = options.sizeMax - this.sizeMin;
        if (options.eccentricity !== undefined) this.eccentricity = options.eccentricity;
        if (options.deviation !== undefined) this.deviation = options.deviation;
        if (options.dxThetaMin !== undefined) {
            this.dxThetaMin = options.dxThetaMin;
            this.dxThetaMax = -this.dxThetaMin - this.dxThetaMin;
        }
        if (options.dyMin !== undefined) this.dyMin = options.dyMin;
        if (options.dyMax !== undefined) this.dyMax = options.dyMax;
        if (options.dThetaMin !== undefined) this.dThetaMin = options.dThetaMin;
        if (options.dThetaMax !== undefined) this.dThetaMax = options.dThetaMax - this.dThetaMin;
    }
}
export default ConfettiManager;  