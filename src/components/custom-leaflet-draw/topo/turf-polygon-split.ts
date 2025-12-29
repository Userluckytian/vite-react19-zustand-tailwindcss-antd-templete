import {
  booleanCrosses,
  buffer,
  difference,   // 新旧版本API不一致，若不报错，但是执行异常，请检查turf的API是否使用正确！
  intersect,   // 新旧版本API不一致，若不报错，但是执行异常，请检查turf的API是否使用正确！
  lineOffset,
  area,
  flattenEach,
  featureCollection,
} from "@turf/turf";

/**
 * 裁剪多边形（支持Polygon、MultiPolygon、带孔洞的面）
 */
function splitPolygon(
  polygonFeature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,   // 面、多面
  splitter: GeoJSON.Feature<GeoJSON.LineString | GeoJSON.Polygon> // 线段，面
): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[] | null {

  const splitterType = splitter.geometry.type;

  switch (splitterType) {
    case 'LineString':
      return splitPolygonWithLine(polygonFeature, splitter as GeoJSON.Feature<GeoJSON.LineString>);
    case 'Polygon':
      return splitPolygonWithPolygon(polygonFeature, splitter as GeoJSON.Feature<GeoJSON.Polygon>);
    default:
      console.warn('不支持的分割器类型:', splitterType);
      return null;
  }
}

/**
 * 线分割面 - 使用窄面方法
 */
function splitPolygonWithLine(
  polygonFeature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
  splitter: GeoJSON.Feature<GeoJSON.LineString>
): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[] | null {

  // 将线转换为窄面
  const thinPolygon = lineToThinPolygon(splitter);
  if (!thinPolygon) {
    console.warn('无法将线转换为窄面');
    return null;
  }

  // 使用窄面进行分割
  return splitPolygonWithPolygon(polygonFeature, thinPolygon);
}

/**
 * 将线转换为非常窄的多边形（约0.1毫米宽）
 */
function lineToThinPolygon(
  line: GeoJSON.Feature<GeoJSON.LineString>,
  width: number = 0.000001 // 约0.1毫米
): GeoJSON.Feature<GeoJSON.Polygon> | null {

  try {
    const buffered = buffer(line, width, { units: 'meters' });
    if (buffered) {
      return buffered as GeoJSON.Feature<GeoJSON.Polygon>;
    }

    return null;
  } catch (error) {
    console.warn('创建窄面失败:', error);
    return null;
  }
}

/**
 * 面分割面 - 修复MultiPolygon处理
 */
function splitPolygonWithPolygon(
  polygonFeature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
  splitter: GeoJSON.Feature<GeoJSON.Polygon>
): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[] | null {

  try {
    // 1. 快速面积检查
    const polygonArea = area(polygonFeature);
    const thinPolygonArea = area(splitter);

    if (thinPolygonArea >= polygonArea * 0.8) {
      console.warn('缓冲面过大，不进行处理');
      return [polygonFeature]; // 返回原多边形，不分割
    }

    // 2. 处理Polygon类型
    if (polygonFeature.geometry.type === 'Polygon') {
      return splitSinglePolygon(polygonFeature as GeoJSON.Feature<GeoJSON.Polygon>, splitter);
    }

    // 3. 处理MultiPolygon类型
    if (polygonFeature.geometry.type === 'MultiPolygon') {
      return splitMultiPolygon(polygonFeature as GeoJSON.Feature<GeoJSON.MultiPolygon>, splitter);
    }

    return null;

  } catch (error) {
    console.error('面分割失败:', error);
    return [polygonFeature]; // 出错时返回原多边形
  }
}

/**
 * 分割单个多边形
 */
function splitSinglePolygon(
  polygonFeature: GeoJSON.Feature<GeoJSON.Polygon>,
  splitter: GeoJSON.Feature<GeoJSON.Polygon>
): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[] | null {

  try {
    // 检查是否相交 
    const intersection = intersect(featureCollection([polygonFeature as any, splitter]));
    if (!intersection) {
      // 不相交，返回原多边形
      return [polygonFeature];
    }

    // 计算差集
    const diff = difference(featureCollection([polygonFeature, splitter]));

    if (!diff) {
      // 没有差集，说明多边形完全在分割器内
      return [polygonFeature];
    }

    const results: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[] = [];

    if (diff.geometry.type === 'Polygon') {
      // 单个多边形 - 分割失败或不需要分割
      results.push(diff as GeoJSON.Feature<GeoJSON.Polygon>);
    } else if (diff.geometry.type === 'MultiPolygon') {
      // 成功分割成多个部分
      diff.geometry.coordinates.forEach((coords: number[][][]) => {
        results.push({
          type: 'Feature',
          properties: polygonFeature.properties || {},
          geometry: {
            type: 'Polygon',
            coordinates: coords
          }
        } as GeoJSON.Feature<GeoJSON.Polygon>);
      });
    }

    return results.length > 0 ? results : [polygonFeature];

  } catch (error) {
    console.warn('分割单个多边形失败:', error);
    return [polygonFeature];
  }
}

/**
 * 分割MultiPolygon - 关键修复
 */
function splitMultiPolygon(
  multiPolygonFeature: GeoJSON.Feature<GeoJSON.MultiPolygon>,
  splitter: GeoJSON.Feature<GeoJSON.Polygon>
): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[] | null {

  const results: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[] = [];

  try {
    // 遍历MultiPolygon中的每个多边形
    multiPolygonFeature.geometry.coordinates.forEach((coords: number[][][]) => {
      const singlePolygon: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: 'Feature',
        properties: { ...multiPolygonFeature.properties },
        geometry: {
          type: 'Polygon',
          coordinates: coords
        }
      };

      // 对每个多边形单独处理
      const splitResult = splitSinglePolygon(singlePolygon, splitter);

      if (splitResult && splitResult.length > 0) {
        results.push(...splitResult);
      } else {
        // 如果分割失败，保留原多边形
        results.push(singlePolygon);
      }
    });

    return results.length > 0 ? results : null;

  } catch (error) {
    console.warn('分割MultiPolygon失败:', error);
    // 出错时返回原MultiPolygon
    return [multiPolygonFeature];
  }
}

export default splitPolygon;