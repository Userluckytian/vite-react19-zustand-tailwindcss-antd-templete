/** 
 * 1: （外部逻辑）勾选或取消勾选“允许无选择重塑”复选框。
 * 2: 只有当新形状在两个或更多地方穿过或接触特征时，才会重塑线条特征。
 * 3: (暂时不处理)如果重塑线将单个多边形分割成两个或多个特征，选择要保留的多边形特征。将鼠标悬停在你想保留的多边形上，当虚线高亮其周边时点击它。
 * 4: 如果重塑线将多边形特征分割成两个或多个特征，自动保留周长最大的特征。
 */
import {
  lineIntersect,
  polygonToLine,
  lineSplit,
  getCoords,
  distance,
  point,
  length,
  lineString,
  polygon as turfPolygon,
  booleanPointInPolygon,
  union,
  featureCollection,
  booleanDisjoint
} from "@turf/turf";
import L from "leaflet";
import splitPolygon from "./turf-polygon-split";


/** reshape 多面：逐个 polygon 判断是否相交并 reshape 
 */
function reshapeMultiPolygonByLine(
  multi: GeoJSON.Feature<GeoJSON.MultiPolygon>,
  sketchLine: GeoJSON.Feature<GeoJSON.LineString>,
  map: L.Map
): GeoJSON.Feature<GeoJSON.MultiPolygon>[] {
  const parts = getCoords(multi).map(rings => turfPolygon(rings));
  const reshaped: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
  for (const part of parts) {
    if (booleanDisjoint(part, sketchLine)) {
      reshaped.push(part); // 不相交，保留原样 
    } else {
      const result = reshapePolygonByLine(part, sketchLine, map);
      if (result) reshaped.push(...result);
    }
  }
  // console.log('只看最后一个reshaped', reshaped);
  
  // 提取每个 polygon 
  const multiCoords = reshaped.map(f => getCoords(f));
  return [{
    type: 'Feature',
    properties: multi.properties || {},
    geometry: {
      type: 'MultiPolygon',
      coordinates: multiCoords.map(ring => ring)
    }
  }]
}

/**
 * 根据草图线自动判断并执行 reshape（裁剪或扩张）
 */
function reshapePolygonByLine(
  polygon: GeoJSON.Feature<GeoJSON.Polygon>,
  sketchLine: GeoJSON.Feature<GeoJSON.LineString>,
  map: L.Map
): GeoJSON.Feature<GeoJSON.Polygon>[] | null {
  const sketchCoords = getCoords(sketchLine);
  const start = point(sketchCoords[0]);
  const end = point(sketchCoords[sketchCoords.length - 1]);

  const startInside = booleanPointInPolygon(start, polygon);
  const endInside = booleanPointInPolygon(end, polygon);

  const intersections = lineIntersect(sketchLine, polygon);

  // 情况 1：扩张（起点终点都在 polygon 内部）
  if (startInside && endInside) {
    return reshapeByExpansion(polygon, sketchLine);
  }

  // 情况 2：裁剪（草图线穿过 polygon，形成两个交点）
  if (intersections.features.length >= 2) {
    return reshapeByCut(polygon, sketchLine);
  }

  return null;
}


/** 起点终点在内部时，将（面 和 【面和线围起来的部分】） 执行合并操作
 *
 *
 * @param {GeoJSON.Feature<GeoJSON.Polygon>} polygon
 * @param {GeoJSON.Feature<GeoJSON.LineString>} sketchLine
 * @return {*}  {(GeoJSON.Feature<GeoJSON.Polygon>[] | null)}
 */
function reshapeByExpansion(
  polygon: GeoJSON.Feature<GeoJSON.Polygon>,
  sketchLine: GeoJSON.Feature<GeoJSON.LineString>
): GeoJSON.Feature<GeoJSON.Polygon>[] | null {
  const ring = [...getCoords(sketchLine)];
  if (
    ring.length > 0 &&
    (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
  ) {
    ring.push(ring[0]);
  }
  const sketchPolygon = turfPolygon([ring]);
  const merged: any = union(featureCollection([polygon, sketchPolygon]));
  console.log('起点和终点都在内部时：', merged);

  return merged ? [merged] : null;
}

/** 起点终点在外部时，草图线穿过 polygon，形成两个交点 → 构建新 polygon
 * 遵循默认规则：自动保留周长最大的 polygon
 *
 * @param {GeoJSON.Feature<GeoJSON.Polygon>} polygon
 * @param {GeoJSON.Feature<GeoJSON.LineString>} sketchLine
 * @return {*}  {(GeoJSON.Feature<GeoJSON.Polygon>[] | null)}
 */
function reshapeByCut(
  polygon: GeoJSON.Feature<GeoJSON.Polygon>,
  sketchLine: GeoJSON.Feature<GeoJSON.LineString>
): GeoJSON.Feature<GeoJSON.Polygon>[] | null {
  const results = splitPolygon(polygon, sketchLine);
  if (!results || results.length === 0) return null;
  // 特征2：保留周长最大的 polygon 
  const best = pickLargestPerimeterPolygon(results as GeoJSON.Feature<GeoJSON.Polygon>[]);
  console.log('起点和终点都在外部时：', best);
  return best ? [best] : null;
}

/** 选出周长最大的 polygon 
 * 
 */
function pickLargestPerimeterPolygon(
  polygons: GeoJSON.Feature<GeoJSON.Polygon>[]
): GeoJSON.Feature<GeoJSON.Polygon> {
  let max = -Infinity;
  let best = polygons[0];
  for (const poly of polygons) {
    const perimeter = length(polygonToLine(poly));
    if (perimeter > max) {
      max = perimeter;
      best = poly;
    }
  }
  return best;
}



/** 找到与指定点最近的线段
 * 
 */
function findNearestSegment(
  segments: GeoJSON.Feature<GeoJSON.LineString>[],
  pt: number[]
): GeoJSON.Feature<GeoJSON.LineString> | null {
  let minDist = Infinity;
  let nearest: GeoJSON.Feature<GeoJSON.LineString> | null = null;

  for (const seg of segments) {
    for (const coord of getCoords(seg)) {
      const d = Math.hypot(coord[0] - pt[0], coord[1] - pt[1]);
      if (d < minDist) {
        minDist = d; nearest = seg;
      }
    }
  }
  return nearest;
}




function buildNewRing(
  segments: GeoJSON.Feature<GeoJSON.LineString>[],
  startSeg: GeoJSON.Feature<GeoJSON.LineString>,
  endSeg: GeoJSON.Feature<GeoJSON.LineString>,
  sketchCoords: number[][]
): number[][] | null {
  const ring: number[][] = [];

  const startIndex = segments.findIndex(s => s === startSeg);
  const endIndex = segments.findIndex(s => s === endSeg);
  if (startIndex === -1 || endIndex === -1) return null;

  // 顺时针拼接边界段
  let i = endIndex;
  while (true) {
    i = (i + 1) % segments.length;
    if (i === startIndex) break;
    ring.push(...getCoords(segments[i]));
  }

  // 拼接：startSeg → sketch → endSeg → 其他段
  ring.unshift(...getCoords(startSeg));
  ring.push(...sketchCoords);
  ring.push(...getCoords(endSeg));

  // 闭合
  if (
    ring.length > 0 &&
    (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
  ) {
    ring.push(ring[0]);
  }

  return ring;
}




export { reshapePolygonByLine, reshapeMultiPolygonByLine };