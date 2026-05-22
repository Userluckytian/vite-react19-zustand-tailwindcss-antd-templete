import * as L from 'leaflet';
import type { TileSampleResult } from './types';

/**
 * 瓦片采样配置
 */
export interface TileSamplerOptions {
    /** 瓦片 URL 模板，需包含 {z} {x} {y} 占位符（不区分大小写） */
    tileUrl: string;
    /** 单瓦片尺寸（默认 256） */
    tileSize?: number;
    /** {s} 占位符候选子域名（默认 ['a', 'b', 'c']） */
    subdomains?: string[];
    /** 单瓦片加载超时毫秒（默认 8000） */
    tileTimeoutMs?: number;
}

/**
 * 瓦片采样器
 *
 * 职责：把点击位置周围的 n×n 瓦片拼接到一张 canvas 上，
 * 并取出 ImageData，供 MagicWand 算法处理。
 */
export default class TileSamplerProvider {
    private map: L.Map;
    private tileUrl: string;
    private tileSize: number;
    private subdomains: string[];
    private tileTimeoutMs: number;

    constructor(map: L.Map, options: TileSamplerOptions) {
        this.map = map;
        this.tileUrl = options.tileUrl;
        this.tileSize = options.tileSize ?? 256;
        this.subdomains = options.subdomains ?? ['a', 'b', 'c'];
        this.tileTimeoutMs = options.tileTimeoutMs ?? 8000;
    }

    /**
     * 以 latlng 为中心采样 n×n 瓦片
     *
     * @param latlng 点击位置
     * @param n 拼接范围（建议 2~4）
     */
    public sample = async (latlng: L.LatLng, n: number): Promise<TileSampleResult> => {
        const zoom = this.map.getZoom();
        const tileSize = this.tileSize;

        // 用当前 CRS 把经纬度投影到「世界像素坐标系」
        const point = this.map.project(latlng, zoom);

        const clickedTileX = Math.floor(point.x / tileSize);
        const clickedTileY = Math.floor(point.y / tileSize);
        const half = Math.floor(n / 2);
        const baseTileX = clickedTileX - half;
        const baseTileY = clickedTileY - half;

        // 创建拼接画布
        const canvas = document.createElement('canvas');
        canvas.width = tileSize * n;
        canvas.height = tileSize * n;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('无法获取 2D 上下文，浏览器可能不支持 Canvas');
        }

        // 并发加载所有瓦片
        const tasks: Promise<void>[] = [];
        for (let dx = 0; dx < n; dx++) {
            for (let dy = 0; dy < n; dy++) {
                const tileX = baseTileX + dx;
                const tileY = baseTileY + dy;
                const url = this.buildTileUrl(tileX, tileY, zoom);
                tasks.push(this.loadTile(url, ctx, dx * tileSize, dy * tileSize));
            }
        }
        await Promise.all(tasks);

        // 取出像素数据
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // 点击位置在拼接画布上的像素坐标
        const pixelX = Math.floor(point.x - baseTileX * tileSize);
        const pixelY = Math.floor(point.y - baseTileY * tileSize);

        return {
            canvas,
            imageData,
            baseTileX,
            baseTileY,
            tileSize,
            zoom,
            pixelX,
            pixelY,
        };
    };

    /**
     * 把 baseTile 坐标 + 画布像素坐标 还原成 leaflet latlng
     *
     * @param sample sample() 的返回值
     * @param x 画布像素 x
     * @param y 画布像素 y
     */
    public unprojectPixel = (sample: TileSampleResult, x: number, y: number): L.LatLng => {
        const worldX = sample.baseTileX * sample.tileSize + x;
        const worldY = sample.baseTileY * sample.tileSize + y;
        return this.map.unproject(L.point(worldX, worldY), sample.zoom);
    };

    /**
     * 替换 URL 模板中的占位符
     */
    private buildTileUrl = (x: number, y: number, z: number): string => {
        const s = this.subdomains[Math.abs(x + y) % this.subdomains.length];
        return this.tileUrl
            .replace(/\{s\}/g, s)
            .replace(/\{x\}/gi, String(x))
            .replace(/\{y\}/gi, String(y))
            .replace(/\{z\}/gi, String(z));
    };

    /**
     * 加载单张瓦片并绘制到指定位置
     *
     * 容错策略：与 demo 一致，单张瓦片加载失败不抛错，仅留白
     */
    private loadTile = (
        url: string,
        ctx: CanvasRenderingContext2D,
        dx: number,
        dy: number,
    ): Promise<void> => {
        return new Promise((resolve) => {
            const img = new Image();
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                resolve();
            };
            const timer = window.setTimeout(() => {
                console.warn(`[MagicWand] 瓦片加载超时：${url}`);
                finish();
            }, this.tileTimeoutMs);

            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                window.clearTimeout(timer);
                try {
                    ctx.drawImage(img, dx, dy);
                } catch (err) {
                    console.warn(`[MagicWand] 绘制瓦片失败：${url}`, err);
                }
                finish();
            };
            img.onerror = () => {
                window.clearTimeout(timer);
                console.warn(`[MagicWand] 瓦片加载失败：${url}`);
                finish();
            };
            img.src = url;
        });
    };
}
