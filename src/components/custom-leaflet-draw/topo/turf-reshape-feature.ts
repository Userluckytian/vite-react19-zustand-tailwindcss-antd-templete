/**  整形要素工具： Reshape Feature：
 * ArcMap-修整线： https://desktop.arcgis.com/zh-cn/arcmap/latest/manage-data/editing-existing-features/reshaping-lines.htm
 * ArcMap-修整面： https://desktop.arcgis.com/zh-cn/arcmap/latest/manage-data/editing-existing-features/reshaping-polygons.htm
 * ArcGIS Pro： https://pro.arcgis.com/en/pro-app/latest/help/editing/reshape-a-feature.htm?utm_source=copilot.com
 * 1: 支持线、面的重塑处理。（✔）
 * 2: 【Allow reshaping without a selection】允许无选择重塑。（目前：仅支持先选择再重塑）
 * 3: 【Show Preview】实时预览reshape效果，便于判断结果是否符合预期。（目前：不支持）
 * 4: 【Reshape with single intersection】仅限线要素，允许单一交叉点重塑。（✔）
 * 5: 【Choose result on finish】完成后，由用户来选择要保留的部分。（目前：自动保留周长最大的特征，用户想要自己选择保留的部分）
 * 挖孔面的特殊情况（暂时还没搞懂这块的行为）：
 * 1：我构建了一个挖孔的面，假设，面的外部定义为区域A，面定义为区域B，面的内环部分定义为区域C，我在区域A绘制一个起点P1，然后这条线经过A，经过B，经过C，再回到区域A，和面共有4个交点，其中外环2个，内环2个。我认为这是一分为2的行为，但通过重塑后，却得到了2部分：外环从分割线切分保留了一部分，内环区域被填充了一部分。（感觉对于arcgis来说，执行的是先只考虑外环面部分，再只考虑内环面部分，这样解释就合理了）
 * 2：还用上面的区域ABC举例，假设我的起点在区域C内，然后依次穿过区域B，区域A，再从区域A穿过区域B，再回到区域C。第一次执行（绘制一小块区域）的结果是扩充，第二次执行的结果（这次把线画的很大，在绕过环的情况下去包裹尽可能多的面）却是整个B删掉了，然后区域A和区域B围起来的部分是保留的，区域C变成了填充的。
 */

/**  线整形的逻辑：
 * 草图线与目标线有两个交点 → 用草图线中间段替换原线中对应部分
 * 草图线与目标线有一个交点 → 返回两个候选结果（前段替换 vs 后段替换）
 * 草图线无交点 → 不处理
 */
import {
  lineIntersect,
  polygonToLine,
  lineSplit,
  getCoords,
  point,
  length,
  lineString,
  polygon as turfPolygon,
  booleanPointInPolygon,
  union,
  featureCollection,
  booleanDisjoint,
  booleanPointOnLine
} from "@turf/turf";
import L from "leaflet";
import splitPolygon from "./turf-polygon-split";
import type { ReshapeOptions } from "../types";

// #region 面、多面整形工具

/** reshape 多面：逐个 polygon 判断是否相交并 reshape 
 */
function reshapeMultiPolygonByLine(
  multi: GeoJSON.Feature<GeoJSON.MultiPolygon>,
  sketchLine: GeoJSON.Feature<GeoJSON.LineString>,
  map: L.Map,
  options: ReshapeOptions = { chooseStrategy: 'auto', AllowReshapingWithoutSelection: false }
): GeoJSON.Feature<GeoJSON.MultiPolygon>[] {
  const parts = getCoords(multi).map(rings => turfPolygon(rings));
  const reshaped: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
  for (const part of parts) {
    if (booleanDisjoint(part, sketchLine)) {
      reshaped.push(part); // 不相交，保留原样 
    } else {
      const result = reshapePolygonByLine(part, sketchLine, map, options);
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
 * （针对面）根据草图线自动判断并执行 reshape（裁剪或扩张）
 */
function reshapePolygonByLine(
  polygon: GeoJSON.Feature<GeoJSON.Polygon>,
  sketchLine: GeoJSON.Feature<GeoJSON.LineString>,
  map: L.Map,
  options: ReshapeOptions = { chooseStrategy: 'auto', AllowReshapingWithoutSelection: false }
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
    return reshapeByCut(polygon, sketchLine, options);
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
  sketchLine: GeoJSON.Feature<GeoJSON.LineString>,
  options: ReshapeOptions = { chooseStrategy: 'auto', AllowReshapingWithoutSelection: false }
): GeoJSON.Feature<GeoJSON.Polygon>[] | null {
  const results = splitPolygon(polygon, sketchLine);
  if (!results || results.length === 0) return null;
  if (options.chooseStrategy === 'manual') {
    return results as GeoJSON.Feature<GeoJSON.Polygon>[];
  } else {
    // 特征2：保留周长最大的 polygon 
    const best = pickLargestPerimeterPolygon(results as GeoJSON.Feature<GeoJSON.Polygon>[]);
    return best ? [best] : null;
  }
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

// #endregion 

// #region 线整形内容
/**
 * （针对线）根据草图线自动判断并执行 reshape（裁剪或扩张）
 */
function reshapeLineByLine(
  target: GeoJSON.Feature<GeoJSON.LineString>,
  sketch: GeoJSON.Feature<GeoJSON.LineString>,
  map: L.Map,
  options: ReshapeOptions = { chooseStrategy: 'auto', AllowReshapingWithoutSelection: false }
): GeoJSON.Feature<GeoJSON.LineString>[] | null {
  const intersections = lineIntersect(target, sketch).features;
  if (intersections.length === 0) return null;

  const targetCoords = getCoords(target);
  const sketchCoords = getCoords(sketch);

  // 多交点：取最外两个交点，替换中间段
  if (intersections.length >= 2) {
    const i1 = intersections[0];
    const i2 = intersections[intersections.length - 1];
    const reshaped = replaceSegmentBetween(targetCoords, i1, i2, sketch);
    return reshaped ? [lineString(reshaped, target.properties)] : null;
  }

  // 单交点：构造两个候选结果
  if (intersections.length === 1) {
    const i = intersections[0];
    const [before, after] = splitLineAtPoint(targetCoords, i.geometry.coordinates);
    const result1 = [...before, ...sketchCoords.slice(1)];
    const result2 = [...sketchCoords.slice(0, -1), ...after];

    if (options.chooseStrategy === 'manual') {
      return [lineString(result1, target.properties), lineString(result2, target.properties)];
    } else {
      const len1 = length(lineString(result1));
      const len2 = length(lineString(result2));
      return [lineString(len1 > len2 ? result1 : result2, target.properties)];
    }
  }

  return null;
}


/**
 *
 *
 * @param {number[][]} targetCoords
 * @param {GeoJSON.Feature<GeoJSON.Point>} i1
 * @param {GeoJSON.Feature<GeoJSON.Point>} i2
 * @param {number[][]} sketchCoords
 * @return {*}  {(number[][] | null)}
 */
function replaceSegmentBetween(
  targetCoords: number[][],
  i1: GeoJSON.Feature<GeoJSON.Point>,
  i2: GeoJSON.Feature<GeoJSON.Point>,
  sketch: GeoJSON.Feature<GeoJSON.LineString>
): number[][] | null {
  const p1 = roundCoord(i1.geometry.coordinates);
  const p2 = roundCoord(i2.geometry.coordinates);

  const [before, rest] = splitLineAtPoint(targetCoords, p1); // 获取前半段

  const [_, after] = splitLineAtPoint(rest, p2); // 获取后半段

  if (!before || !after) return null;

  const sketchSegment = extractSketchBetweenWithInsertion(sketch, p1, p2); // 获取中间段（中间段由草线图构成）

  if (!sketchSegment) return null;

  // console.log('前半段', before);
  // console.log('中间段（中间段由草线图构成）', sketchSegment);
  // console.log('后半段', after);
  return dedupeCoords([...before, ...sketchSegment, ...after]);

}


/** 坐标数组去重
 *
 *
 * @param {number[][]} coords
 * @return {*}  {number[][]}
 */
function dedupeCoords(coords: number[][]): number[][] {
  const seen = new Set<string>();
  return coords.filter(coord => {
    const key = coord.join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}


/**
 * 从草图线上提取两个交点之间的线段（自动插入交点）
 * @param sketchLine 草图线（LineString）
 * @param p1 第一个交点坐标 [x, y]
 * @param p2 第二个交点坐标 [x, y]
 * @returns 提取出的中间段坐标数组（含 p1 和 p2）
 */
function extractSketchBetweenWithInsertion(
  sketchLine: GeoJSON.Feature<GeoJSON.LineString>,
  p1: number[],
  p2: number[]
): number[][] | null {
  const pt1 = point(p1);
  const pt2 = point(p2);

  // 第一次切割：在 p1 处分割草图线
  const split1 = lineSplit(sketchLine, pt1);
  const segments1 = split1.features;

  // 找到以 p1 为起点的段索引
  const i1 = segments1.findIndex(seg => {
    const coords = seg.geometry.coordinates;
    return coords.length > 0 &&
      coords[0][0] === p1[0] &&
      coords[0][1] === p1[1];
  });
  if (i1 === -1) return null;

  // 从 p1 开始的后续线段
  const tailLine = lineString(mergeSegments(segments1.slice(i1)));

  // 第二次切割：在 p2 处分割
  const split2 = lineSplit(tailLine, pt2);
  const segments2 = split2.features;

  // 找出包含 p2 的段索引
  const i2 = segments2.findIndex(seg => booleanPointOnLine(pt2, seg));
  if (i2 === -1) return null;

  // 提取从 p1 到 p2 的段
  const selected = segments2.slice(0, i2 + 1);
  return mergeSegments(selected);
}


/** 
 * 将坐标数组四舍五入到指定位数
 *
 *
 * @param {number[]} coord
 * @param {number} [precision=6]
 * @return {*}  {number[]}
 */
function roundCoord(coord: number[], precision = 6): number[] {
  return coord.map(n => Number(n.toFixed(precision)));
}

/**
 * 合并多个 LineString 段为一个连续坐标数组
 */
function mergeSegments(
  segments: GeoJSON.Feature<GeoJSON.LineString>[]
): number[][] {
  const coords: number[][] = [];
  segments.forEach((seg, i) => {
    const c = seg.geometry.coordinates;
    if (i === 0) {
      coords.push(...c);
    } else {
      coords.push(...c.slice(1)); // 避免重复点
    }
  });
  return coords;
}

/** （假设一条线段包含5个坐标点，则说明其是4个折线段。然后这个函数就是找到与给定点相交的折线段，并返回这个折线段的两个端点）
 *
 *
 * @param {number[][]} coords
 * @param {number[]} intersection
 * @return {*}  {[number[][], number[][]]}
 */
function splitLineAtPoint(
  coords: number[][],
  intersection: number[]
): [number[][], number[][]] {
  let minDist = Infinity;
  let insertIndex = -1;

  // 假设每2个坐标点构建一个线段。下面的代码就是遍历线段，寻找交点落在哪一段上
  for (let i = 0; i < coords.length - 1; i++) {
    // 找到坐标中的某一个小段
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];

    // 构建区间信息
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    // 这是向量投影的标准公式，可以参考维基百科
    // t 表示交点在当前线段上的相对位置（0 ≤ t ≤ 1 表示在线段内部）
    const t = ((intersection[0] - x1) * dx + (intersection[1] - y1) * dy) / lenSq;

    // 计算投影点与交点的距离，找出最近的线段（如果交点在线段内部（t ∈ [0,1]），计算它到线段的投影点，记录最小距离和插入位置）
    if (t >= 0 && t <= 1) {
      const px = x1 + t * dx;
      const py = y1 + t * dy;
      const dist = Math.hypot(px - intersection[0], py - intersection[1]);
      if (dist < minDist) {
        minDist = dist;
        insertIndex = i + 1;
      }
    }
  }
  // 步骤 5：如果找不到合适的插入点，返回原始线
  if (insertIndex === -1) return [coords, []];
  // 步骤 6：构造前段和后段，并插入交点
  const before = coords.slice(0, insertIndex);
  const after = coords.slice(insertIndex); // ✅ 从 insertIndex 开始截取，避免重复前一个点

  before.push(intersection);
  after.unshift(intersection);

  // 最终返回前段和后段
  return [before, after];
}
// #endregion


export { reshapePolygonByLine, reshapeMultiPolygonByLine, reshapeLineByLine };