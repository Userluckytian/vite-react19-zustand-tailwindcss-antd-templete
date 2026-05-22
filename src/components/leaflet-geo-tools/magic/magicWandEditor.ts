import * as L from 'leaflet';
import { EditorState, type EditorListenerConfigs } from '../types';
import type { MagicWandOptions, MagicWandResult, TileSampleResult } from './types';
import TileSamplerProvider from './TileSamplerProvider';

/**
 * 魔棒编辑器
 *
 * 通过点击地图，从遥感影像中提取相似颜色区域的轮廓，
 * 并转换为 GeoJSON Polygon 输出到控制台。
 *
 * 接口兼容现有 Editor 体系：
 * - destroy() 清理资源
 * - getCurrentState() 返回 EditorState
 * - onStateChange(callback, options) 状态变更通知
 */
export default class MagicWandEditor {
    private map: L.Map;
    private sampler: TileSamplerProvider;
    private options: Required<Omit<MagicWandOptions, 'tileUrl' | 'tileSize'>> & { tileUrl: string; tileSize: number };
    private state: EditorState = EditorState.Idle;
    private busy: boolean = false; // 节流标志，防止连续点击导致崩溃
    private stateListeners: Array<(state: EditorState) => void> = [];
    private mapClickHandler: ((e: L.LeafletMouseEvent) => void) | null = null;
    private highlightLayer: L.GeoJSON | null = null; // 高亮图层
    private statusIndicator: HTMLDivElement | null = null; // 状态指示器

    constructor(map: L.Map, options: MagicWandOptions) {
        this.map = map;
        this.options = {
            threshold: options.threshold ?? 30,
            blurRadius: options.blurRadius ?? 2,
            stitchN: options.stitchN ?? 3,
            simplifyTolerant: options.simplifyTolerant ?? 2.0,
            simplifyCount: options.simplifyCount ?? 10,
            tileUrl: options.tileUrl,
            tileSize: options.tileSize ?? 256,
            onEnable: options.onEnable,
            messageApi: options.messageApi,
        };
        this.sampler = new TileSamplerProvider(map, {
            tileUrl: this.options.tileUrl,
            tileSize: this.options.tileSize,
        });
        this.enable();
    }

    /**
     * 启用魔棒模式
     */
    private enable = (): void => {
        this.updateState(EditorState.Drawing);
        this.map.getContainer().style.cursor = 'crosshair';
        this.mapClickHandler = this.handleMapClick;
        this.map.on('click', this.mapClickHandler);
        // 调用启用回调（切换底图、定位等）
        if (this.options.onEnable) {
            this.options.onEnable();
        }
        // 创建状态指示器
        this.createStatusIndicator();
    };

    /**
     * 禁用魔棒模式
     */
    private disable = (): void => {
        this.map.getContainer().style.cursor = 'grab';
        if (this.mapClickHandler) {
            this.map.off('click', this.mapClickHandler);
            this.mapClickHandler = null;
        }
        this.updateState(EditorState.Idle);
        // 移除状态指示器
        this.removeStatusIndicator();
    };

    /**
     * 处理地图点击事件
     */
    private handleMapClick = async (e: L.LeafletMouseEvent): Promise<void> => {
        if (this.busy) {
            this.options.messageApi?.warning('正在提取中，请稍候...');
            return;
        }

        // 判断层级是否小于等于16
        const currentZoom = this.map.getZoom();
        if (currentZoom <= 16) {
            this.options.messageApi?.warning(`当前层级为 ${currentZoom}，必须大于16层级才可以进行提取`);
            return;
        }

        this.busy = true;
        this.updateStatusIndicator('提取中...');

        try {
            await this.performExtraction(e.latlng);
            this.updateStatusIndicator('提取完成');
            setTimeout(() => {
                this.hideStatusIndicator();
            }, 2500);
        } catch (err) {
            this.options.messageApi?.error('提取失败：' + (err as Error).message);
            this.hideStatusIndicator();
        } finally {
            this.busy = false;
        }
    };

    /**
     * 执行提取流程
     */
    private performExtraction = async (latlng: L.LatLng): Promise<void> => {
        // 1. 检查 MagicWand 库是否加载
        if (!window.MagicWand) {
            throw new Error('MagicWand 库未加载，请检查 index.html 中的脚本引用');
        }

        // 2. 瓦片采样
        const sample = await this.sampler.sample(latlng, this.options.stitchN);

        // 3. 构建 MagicWand 输入图像
        const image = {
            data: sample.imageData.data,
            width: sample.canvas.width,
            height: sample.canvas.height,
            bytes: 4,
        };

        // 4. 洪水填充
        const mask = window.MagicWand.floodFill(
            image,
            sample.pixelX,
            sample.pixelY,
            this.options.threshold,
            null,
            false,
        );
        if (!mask) {
            this.options.messageApi?.info('未找到符合条件的区域');
            return;
        }

        // 5. 高斯模糊
        const blurred = window.MagicWand.gaussBlur(mask, this.options.blurRadius);

        // 6. 提取轮廓
        const contours = window.MagicWand.traceContours(blurred);
        if (!contours || contours.length === 0) {
            this.options.messageApi?.info('未提取到轮廓');
            return;
        }

        // 7. 简化轮廓
        const simplified = window.MagicWand.simplifyContours(
            contours,
            this.options.simplifyTolerant,
            this.options.simplifyCount,
        );

        // 8. 转换为 GeoJSON
        const result = this.buildGeoJSON(simplified, sample);

        // 9. 输出到控制台
        console.log('[MagicWand] 提取结果（GeoJSON）：', result.feature);
        // console.log('[MagicWand] 原始轮廓数据：', result.contours);
        // console.log('[MagicWand] 提取参数：', result.params);

        // 10. 添加高亮图层到地图
        this.addHighlightLayer(result.feature);

        // 11. 内存清理
        this.cleanup(sample, mask, blurred, contours, simplified);
    };

    /**
     * 将轮廓转换为 GeoJSON Feature
     */
    private buildGeoJSON = (contours: typeof window.MagicWand.traceContours extends (...args: any) => infer R ? R : never, sample: TileSampleResult): MagicWandResult => {
        // 按内/外环分组
        const outerRings: L.LatLng[][] = [];
        const innerRings: L.LatLng[][] = [];

        contours.forEach((c) => {
            const latlngs = c.points.map((p) => this.sampler.unprojectPixel(sample, p.x, p.y));
            if (c.inner) {
                innerRings.push(latlngs);
            } else {
                outerRings.push(latlngs);
            }
        });

        // 如果有多个外环，返回 MultiPolygon；否则返回 Polygon
        let geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
        if (outerRings.length === 0) {
            throw new Error('没有提取到外环');
        } else if (outerRings.length === 1) {
            // Polygon: 外环 + 内环
            const coordinates: GeoJSON.Position[][] = [
                outerRings[0].map((ll) => [ll.lng, ll.lat]),
                ...innerRings.map((ring) => ring.map((ll) => [ll.lng, ll.lat])),
            ];
            geometry = { type: 'Polygon', coordinates };
        } else {
            // MultiPolygon: 每个外环 + 对应内环（这里简化处理，直接把所有内环塞到第一个外环）
            const coordinates: GeoJSON.Position[][][] = outerRings.map((outer, idx) => {
                const inners = idx === 0 ? innerRings : [];
                return [
                    outer.map((ll) => [ll.lng, ll.lat]),
                    ...inners.map((ring) => ring.map((ll) => [ll.lng, ll.lat])),
                ];
            });
            geometry = { type: 'MultiPolygon', coordinates };
        }

        const feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> = {
            type: 'Feature',
            geometry,
            properties: {
                source: 'magic-wand',
                threshold: this.options.threshold,
                blurRadius: this.options.blurRadius,
                stitchN: this.options.stitchN,
                simplifyTolerant: this.options.simplifyTolerant,
                simplifyCount: this.options.simplifyCount,
            },
        };

        return {
            feature,
            contours,
            params: { ...this.options },
        };
    };

    /**
     * 添加高亮图层到地图
     */
    private addHighlightLayer = (feature: GeoJSON.Feature): void => {
        // 销毁上一次的高亮图层
        if (this.highlightLayer) {
            this.map.removeLayer(this.highlightLayer);
            this.highlightLayer = null;
        }

        // 创建新的高亮图层
        this.highlightLayer = L.geoJSON(feature, {
            style: {
                color: '#ff0000',
                weight: 2,
                opacity: 1,
                fillColor: '#ff0000',
                fillOpacity: 0.3,
            },
        }).addTo(this.map);
    };

    /**
     * 清理内存
     */
    private cleanup = (...refs: any[]): void => {
        refs.forEach((ref) => {
            if (ref && typeof ref === 'object') {
                if (ref.canvas) {
                    const ctx = ref.canvas.getContext('2d');
                    if (ctx) ctx.clearRect(0, 0, ref.canvas.width, ref.canvas.height);
                }
                if (ref.data) ref.data = null;
            }
        });
    };

    /**
     * 更新状态并通知监听器
     */
    private updateState = (newState: EditorState): void => {
        this.state = newState;
        this.stateListeners.forEach((listener) => listener(newState));
    };

    // #region 兼容 EditorInstance 接口

    /**
     * 获取当前状态
     */
    public getCurrentState = (): EditorState => {
        return this.state;
    };

    /**
     * 注册状态变更监听器
     */
    public onStateChange = (callback: (state: EditorState) => void, options?: EditorListenerConfigs): void => {
        this.stateListeners.push(callback);
        if (options?.immediateNotify) {
            callback(this.state);
        }
    };

    /**
     * 销毁编辑器
     */
    public destroy = (): void => {
        this.disable();
        this.stateListeners = [];
        this.busy = false;
    };

    // #endregion

    // #region 状态指示器

    /**
     * 创建状态指示器
     */
    private createStatusIndicator = (): void => {
        if (this.statusIndicator) return;

        const indicator = document.createElement('div');
        indicator.className = 'magic-wand-status-indicator';
        indicator.innerHTML = '<span class="status-text">魔棒模式</span>';

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .magic-wand-status-indicator {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                z-index: 9999;
                display: none;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(8px);
            }
            .magic-wand-status-indicator.visible {
                display: block;
            }
            .magic-wand-status-indicator .status-text.breathing {
                animation: breathe 1.5s ease-in-out infinite;
            }
            @keyframes breathe {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(indicator);

        this.statusIndicator = indicator;
    };

    /**
     * 更新状态指示器文本
     */
    private updateStatusIndicator = (text: string): void => {
        if (!this.statusIndicator) return;
        const textEl = this.statusIndicator.querySelector('.status-text');
        if (textEl) {
            textEl.textContent = text;
            // 只有"提取中..."时才添加呼吸动画
            if (text === '提取中...') {
                textEl.classList.add('breathing');
            } else {
                textEl.classList.remove('breathing');
            }
        }
        this.statusIndicator.classList.add('visible');
    };

    /**
     * 隐藏状态指示器
     */
    private hideStatusIndicator = (): void => {
        if (!this.statusIndicator) return;
        this.statusIndicator.classList.remove('visible');
    };

    /**
     * 移除状态指示器
     */
    private removeStatusIndicator = (): void => {
        if (this.statusIndicator) {
            this.statusIndicator.remove();
            this.statusIndicator = null;
        }
    };

    // #endregion
}
