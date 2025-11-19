/* eslint-disable */

import { booleanDisjoint, buffer, center, difference, featureCollection, intersect, lineIntersect, lineOffset, multiPolygon, pointToLineDistance, polygon, polygonToLine, union } from "@turf/turf";


function splitPolygon(polygon: any, splitter: any) {
  let splitterType = splitter.geometry.type
  switch (splitterType) {
    case 'LineString':
      return splitPolygonWithLine(polygon, splitter);
    case 'Polygon':
      return splitPolygonWithPolygon(polygon, splitter);
  }
}

/**
 * 合并多边形
 */
function unionPolygon(polygons: any) {
  var polygon = polygons[0]
  for (var i = 1; i < polygons.length; i++) {
    if (polygons[i]) {
      polygon = union(polygon, polygons[i])
    }
  };
  return polygon;
}

/**
 * 线分割面
 * 面类型只能是polygon 但可以是环
 * 注:线与多边形必须有两个交点
 */
function splitPolygonWithLine(polygonFeature: any, splitter: any) {
  let p1 = null
  let p2 = null
  // 判断线与面的交点个数
  let intersects = lineIntersect(polygonToLine(polygonFeature), splitter)
  if (!intersects || intersects.features.length < 2) { return }

  let bufferPolygon = buffer(splitter, 0.0001, { units: 'meters' })
  const newPoly: any = featureCollection([polygonFeature, bufferPolygon])
  let poly: any = difference(newPoly);
  
  if (poly.geometry.coordinates.length < 2) {
    return
  } else if (poly.geometry.coordinates.length === 2) {
    let poly1 = polygon(poly.geometry.coordinates[0])
    let poly2 = polygon(poly.geometry.coordinates[1])

    let res: any = combinePolygons([poly1, poly2], splitter)
    p1 = res.p1[0]
    p2 = res.p2[0]

  } else if (poly.geometry.coordinates.length > 2) {
    let polygons: any = []
    poly.geometry.coordinates.map((item: any) => {
      polygons.push(polygon(item))
    })

    let res: any = combinePolygons(polygons, splitter)
    p1 = polygons2MultiPolygon(res.p1)
    p2 = polygons2MultiPolygon(res.p2)
  }
  return [p1, p2]
}

function splitPolygonWithPolygon(polygon: any, splitter: any) {
  if (polygon.geometry.type === 'Polygon') {
    return splitSinglePolygon(polygon, splitter)
  } else if (polygon.geometry.type === 'MultiPolygon') {
    return splitMultiPolygon(polygon, splitter)
  }
}

function combinePolygons(polygons: any, splitter: any) {
  if (polygons.length === 0) { return }
  let p1: any = []
  let p2: any = []

  polygons.map((item: any) => {
    let leftOffsetLine = lineOffset(splitter, -0.0001, { units: 'meters' })
    let rightOffsetLine = lineOffset(splitter, 0.0001, { units: 'meters' })
    
    let isLeftDisjoint = booleanDisjoint(leftOffsetLine, item)
    let isRightDisjoint = booleanDisjoint(rightOffsetLine, item)

    if (!isLeftDisjoint) {
      p2.push(item)
    } else if (!isRightDisjoint) {
      p1.push(item)
    } else {
      let turfCenter = center(item)
      let dis1 = pointToLineDistance(turfCenter, leftOffsetLine)
      let dis2 = pointToLineDistance(turfCenter, rightOffsetLine)
      if (dis1 > dis2) {
        p1.push(item)
      } else {
        p2.push(item)
      }
    }
  })

  return { p1: p1, p2: p2 }
}


function splitSinglePolygon(polygon: any, splitter: any) {
  // 选中多边形和绘制多边形之间的公共部分
  let intersection = intersect(polygon, splitter)
  if (!intersection) { return }

  // 选中多边形和绘制多边形中不一样的部分
  let turfDifference = difference(featureCollection([polygon, splitter]))
  if (!turfDifference) { return }

  return [turfDifference, intersection]
}

function splitMultiPolygon(polygon: any, splitter: any) {
  let polygons: any = multiPolygon2polygons(polygon)
  let intersectArr: any = []
  polygons.forEach(function (poly: any) {
    let intersection = intersect(poly, splitter)
    if (intersection) {
      intersectArr.push(intersection)
    }
  })
  // 选中多边形和绘制多边形中不一样的部分
  let turfDifference = difference(featureCollection([polygon, splitter]));
  let uPolygon = (union as any)(featureCollection(intersectArr))

  if (!turfDifference || !uPolygon) { return }
  return [turfDifference, uPolygon]
}

/**
 * multiPolygon转polygons,不涉及属性
 */
function multiPolygon2polygons(multiPolygon: any) {
  if (multiPolygon.geometry.type !== 'MultiPolygon') {
    return
  }
  const polygons: any = [];
  multiPolygon.geometry.coordinates.forEach((item: any) => {
    const polygon = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: []
      }
    };
    polygon.geometry.coordinates = item;
    polygons.push(polygon)
  });
  return polygons;
}


/**
* polygons转multiPolygon,不涉及属性，只输出属性为{}
* 考虑polygons中就存在多面的情况
*/
function polygons2MultiPolygon(polygons: any) {
  if (polygons.length === 0) { return }
  let coords: any = []

  polygons.forEach((item: any) => {
    if (item.geometry.type === 'Polygon') {
      coords.push(item.geometry.coordinates)
    } else {
      item.geometry.coordinates.forEach((item: any) => {
        coords.push(item)
      })
    }
  })
  let turfMultiPolygon = multiPolygon(coords)
  return turfMultiPolygon
}

export default splitPolygon