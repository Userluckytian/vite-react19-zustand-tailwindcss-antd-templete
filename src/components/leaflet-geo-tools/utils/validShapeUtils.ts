import { kinks, lineString, polygon } from "@turf/turf";

/** [面]自相交检测（使用 turf.kinks， 一般线、面才会有）
 *
 *
 * @private
 * @param {number[][]} coords
 * @return {*}  {boolean} true=有自相交，false=无自相交
 */
export function polygonHasSelfIntersection(coords: number[][]): boolean {

    if (coords.length < 4) return false;

    try {
        // 2. 转换为GeoJSON格式 [lng, lat] ✅ 这个转换是必要的！
        const geoJsonCoords = coords.map(coord => [coord[1], coord[0]]);
        const turfPolygon = polygon([geoJsonCoords]);
        const intersections = kinks(turfPolygon);

        return intersections.features.length > 0;
    } catch (error) {
        console.warn('自相交检测失败:', error);
        return false;
    }
}

/** [线]自相交检测（使用 turf.kinks， 一般线、面才会有）
 *
 *
 * @private
 * @param {number[][]} coords
 * @return {*}  {boolean} true=有自相交，false=无自相交
 */
export function polylineHasSelfIntersection(coords: number[][]): boolean {
    // 至少需要4个点才可能形成自相交
    if (coords.length < 4) return false;

    try {
        // 转换为GeoJSON格式 [lng, lat]
        const lineCoords = coords.map(coord => [coord[1], coord[0]]);
        const line = lineString(lineCoords);

        // 使用 turf.kinks 检测自相交
        const intersections = kinks(line);

        // 如果有交点，说明自相交
        return intersections.features.length > 0;
    } catch (error) {
        console.warn('自相交检测失败:', error);
        return false;
    }
}
