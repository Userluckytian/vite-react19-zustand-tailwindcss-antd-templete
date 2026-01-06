/**  整形要素工具： Reshape Feature：
 * ArcMap-修整线： https://desktop.arcgis.com/zh-cn/arcmap/latest/manage-data/editing-existing-features/reshaping-lines.htm
 * ArcMap-修整面： https://desktop.arcgis.com/zh-cn/arcmap/latest/manage-data/editing-existing-features/reshaping-polygons.htm
 * ArcGIS Pro： https://pro.arcgis.com/en/pro-app/latest/help/editing/reshape-a-feature.htm?utm_source=copilot.com
 * 1: 支持线、面的重塑处理。（目前：仅支持面）
 * 2: 【Allow reshaping without a selection】允许无选择重塑。（目前：仅支持先选择再重塑）
 * 3: 【Show Preview】实时预览reshape效果，便于判断结果是否符合预期。（目前：不支持）
 * 4: 【Reshape with single intersection】仅限线要素，允许单一交叉点重塑。（目前：我们暂时只做了支持面）
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


export { reshapePolygonByLine, reshapeMultiPolygonByLine, reshapeLineByLine };