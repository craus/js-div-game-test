(function() {
  const BREAKS_WEIGHT = 1e9
  const PADDING_WEIGHT = 1
  const X_TO_Y_PADDING = 1
  const EPS = 1e-9

  mask = 0

  var greatestPossible = function(a, b, acceptable) {
    var cur = a
    var step = (b-a)/2
    while (step > EPS) {
      if (acceptable(cur+step)) {
        cur += step
      }
      step /= 2
    }
    return cur
  }

  var minus = function(a, b) {
    return {x: a.x-b.x, y: a.y-b.y}
  }

  var plus = function(a, b) {
    return {x: a.x+b.x, y: a.y+b.y}
  }

  var scale = function(a, b) {
    if (b.x == undefined) {
      return scale(a, {x: b, y: b})
    }
    return {x: a.x*b.x, y: a.y*b.y}
  }

  var cosp = function(a, b) {
    return a.x * b.y - a.y * b.x
  }

  var sqr = function(x) {
    return x*x
  }

  var distance = function(a, b) {
    if (b == undefined) {
      return distance(a, {x: 0, y: 0})
    }
    return Math.sqrt(Math.abs(sqr(a.x-b.x)+sqr(a.y-b.y)))
  }

  var normalize = function(v) {
    var dist = distance(v, {x: 0, y: 0})
    if (dist < EPS) {
      return v
    }
    return {
      x: v.x / dist,
      y: v.y / dist
    }
  }

  var toTheRight = function(a, b) {
    return cosp(a,b) > EPS
  }

  var pointInsideCircle = function(point, circle) {
    return distance(point, circle) < circle.r + EPS
  }

  var pointInsideSector = function(point, sector) {
    var radiusVector = minus(point, sector)
    var toTheNonRightFromStart = !toTheRight(radiusVector, sector.startRay.v)
    var toTheNonLeftFromEnd = !toTheRight(sector.endRay.v, radiusVector)
    if (toTheRight(sector.startRay.v, sector.endRay.v)) {
      return toTheNonRightFromStart && toTheNonLeftFromEnd
    } else {
      return toTheNonRightFromStart || toTheNonLeftFromEnd
    }
  }

  var pointInsideCircleSector = function(point, circleSector) {
    var result = pointInsideSector(point, circleSector) && pointInsideCircle(point, circleSector)
    return result
  }

  var lineEquation = function(line) {
    var eqn = {
      a: -line.v.y,
      b: line.v.x
    }
    eqn.c = -(eqn.a*line.x+eqn.b*line.y)
    return eqn
  }

  var linePointDistance = function(line, point) {
    var eqn = lineEquation(line)
    var denom = Math.sqrt(sqr(eqn.a) + sqr(eqn.b))
    return Math.abs((eqn.a * point.x + eqn.b * point.y + eqn.c) / denom)
  }

  var linesIntersection = function(line1, line2) {
    var eqn = lineEquation(line1)
    // kt+b = 0
    var k = line2.v.x * eqn.a + line2.v.y * eqn.b 
    var b = eqn.c + line2.x * eqn.a + line2.y * eqn.b
    if (Math.abs(k) < EPS) {
      return []
    }
    var t = -b/k
    return [plus(line2, scale(line2.v, t))]
  }

  var lineAndCircleIntersection = function(line, circle) {
    var dist = distance(line, circle)
    var lineDist = linePointDistance(line, circle)
    if (lineDist > circle.r + EPS) {
      return []
    }
    var closingDist = Math.sqrt(Math.abs(sqr(dist)-sqr(lineDist)))
    var normalizedV = normalize(line.v)
    var movedPoint1 = plus(line, normalizedV * closingDist)
    var movedPoint2 = minus(line, normalizedV * closingDist)
    if (distance(circle, movedPoint1) < distance(circle, movedPoint2)) {
      var closestPoint = movedPoint1
    } else {
      var closestPoint = movedPoint2
    }
    if (lineDist > circle.r - EPS) {
      return [closestPoint]
    }
    var delta = Math.sqrt(sqr(circle.r) - sqr(lineDist))
    return [
      plus(closestPoint, normalizedV * delta),
      minus(closestPoint, normalizedV * delta),
    ]
  }

  // this version works only for circles of same radius
  var circlesIntersection = function(circle1, circle2) {
    var averagePoint = scale(plus(circle1, circle2), 0.5)

    var halfDist = distance(circle1, averagePoint)
    if (halfDist > circle1.r + EPS) {
      return []
    }
    if (halfDist > circle1.r - EPS) {
      return [averagePoint]
    }
    var direction = minus(circle2, circle1)
    var perpendicular = {
      x: -direction.y,
      y: direction.x
    }
    perpendicular = normalize(perpendicular)
    var perpendicularDist = Math.sqrt(sqr(circle1.r) - sqr(halfDist))
    perpendicular = scale(perpendicular, perpendicularDist)
    return [
      plus(averagePoint, perpendicular),
      minus(averagePoint, perpendicular)
    ]
  }

  var mapConcat = function(array, callback) {
    return array.map(callback).reduce(function(a,b) { return a.concat(b)})
  }

  var fitInCircleSector = function(rectangles, circleSector) {
    var baseLines = [circleSector.startRay, circleSector.endRay]
    var baseCircles = [{x: circleSector.x, y: circleSector.y, r: circleSector.r}]
    
    var rectangleVertices = mapConcat(rectangles, function(rectangle) {
      return [
        {x: rectangle.x1, y: rectangle.y1},
        {x: rectangle.x1, y: rectangle.y2},
        {x: rectangle.x2, y: rectangle.y1},
        {x: rectangle.x2, y: rectangle.y2}
      ]
    })
    var lines = mapConcat(baseLines, function(line) {
      return mapConcat(rectangleVertices, function(p) {
        return [{
          x: line.x - p.x, 
          y: line.y - p.y,
          v: line.v
        }]
      })
    })
    var circles = mapConcat(baseCircles, function(circle) {
      return mapConcat(rectangleVertices, function(p) {
        return [{
          x: circle.x - p.x,
          y: circle.y - p.y,
          r: circle.r
        }]
      })
    })
    var points = mapConcat(lines, function(line1) {
      return mapConcat(lines, function(line2) {
        return linesIntersection(line1, line2)
      })
    })
    points = points.concat(mapConcat(lines, function(line) {
      return mapConcat(circles, function(circle) {
        return lineAndCircleIntersection(line, circle)
      })
    }))
    points = points.concat(mapConcat(circles, function(circle1) {
      return mapConcat(circles, function(circle2) {
        return circlesIntersection(circle1, circle2)
      })
    }))
    var acceptablePoint = points.find(function(p) {
      return rectangleVertices.every(function(v) {
        return pointInsideCircleSector({x: p.x+v.x, y: p.y+v.y}, circleSector)
      })
    })
    if (acceptablePoint == null) {
      return null;
    }
    return {
      x: acceptablePoint.x,
      y: acceptablePoint.y
    }
  }

  var rayByAngle = function(angle) {
    return {
      x: 0,
      y: 0,
      v: {
        x: Math.cos(angle),
        y: Math.sin(angle)
      }
    }
  }

  var paddedRectangles = function(rectangles, paddingX, paddingY) {
    return rectangles.map(function(rectangle) {
      return {
        x1: rectangle.x1 - paddingX,
        y1: rectangle.y1 - paddingY,
        x2: rectangle.x2 + paddingX,
        y2: rectangle.y2 + paddingY,
      }
    })
  }

  var zoomRay = function(ray, zoom) {
    var zoomedRay = scale(ray, zoom)
    zoomedRay.v = scale(ray.v, zoom)
    return zoomedRay
  }

  var fitRectanglesToEllipseSector = function(rectangles, ellipseSector) {
    ellipseSector.x = 0
    ellipseSector.y = 0
    var startRay = rayByAngle(ellipseSector.startAngle)
    var endRay = rayByAngle(ellipseSector.endAngle)
    var excentricity = ellipseSector.rx / ellipseSector.ry
    var zoom = {
      x: 1/excentricity,
      y: 1
    }

    var circleSector = {
      x: ellipseSector.x / excentricity,
      y: ellipseSector.y, 
      r: ellipseSector.ry,
      startRay: zoomRay(startRay, zoom),
      endRay: zoomRay(endRay, zoom)
    }

    var circleSectorFitting = fitInCircleSector(
      rectangles.map(function(rectangle) {
        return {
          x1: rectangle.x1 / excentricity,
          y1: rectangle.y1, 
          x2: rectangle.x2 / excentricity,
          y2: rectangle.y2
        }
      }),
      circleSector
    )
    if (circleSectorFitting == null) {
      return null
    }
    return scale(circleSectorFitting, {x: excentricity, y: 1})
  }

  var fitRectanglesToEllipseSectorWithMaxPadding = function(rectangles, ellipseSector) {

    var maxPadding = greatestPossible(0, 1e9, function(paddingY) {
      return fitRectanglesToEllipseSector(
        paddedRectangles(rectangles, paddingY * X_TO_Y_PADDING, paddingY),
        ellipseSector
      ) != null
    })
    var fitting = fitRectanglesToEllipseSector(
      paddedRectangles(rectangles, maxPadding * X_TO_Y_PADDING, maxPadding),
      ellipseSector
    )
    if (fitting == null) {
      return null
    }
    return {
      padding: maxPadding,
      fitting: fitting
    }
  }

  var classicAngle = function(angle) {
    return Math.PI/2 - angle
  }

  var projectAngle = function(angle) {
    return Math.PI/2 - angle 
    // YES, it is the same formula as for classicAngle! :D
    // But this is just a coincidence
  }

  var classicEllipseSector = function(ellipseSector) {
    return {
      rx: ellipseSector.rx,
  		ry: ellipseSector.ry,
  		startAngle: classicAngle(ellipseSector.endAngle),
  		endAngle: classicAngle(ellipseSector.startAngle)
    }
  }

  var fitWithBreaks = function(fitTextRequest, breaksMask) {
    var cost = 0
    var rectangles = []
    var x = 0
    var y = 0
    for (var j = 0; j < fitTextRequest.words.length; j++) {
      var newX = x + fitTextRequest.words[j].length
      rectangles.push({
        x1: x,
        y1: y - fitTextRequest.lineHeight,
        x2: newX,
        y2: y
      })
      if (j < fitTextRequest.words.length - 1) {
        if (((breaksMask >> j) & 1) == 1) {
          y -= fitTextRequest.lineHeight
          x = 0
          cost += fitTextRequest.words[j].breakCost
        } else {
          x = newX + fitTextRequest.spaceWidth
        }
      }
    }
    var result = fitRectanglesToEllipseSectorWithMaxPadding(
      rectangles,
      classicEllipseSector(fitTextRequest.ellipseSector)
    )
    if (result == null) {
      return null
    }
    result.cost = cost * BREAKS_WEIGHT - result.padding * PADDING_WEIGHT
    result.offsets = rectangles.map(function(rectangle) {
      return plus({
        x: rectangle.x1,
        y: rectangle.y2
      }, result.fitting)
    })
    return result
  }

  fitTextToEllipseSector = function(fitTextRequest) {
    var best = null
    for (var i = 0; i < (1 << (fitTextRequest.words.length - 1)); i++) {
      var cand = fitWithBreaks(fitTextRequest, i)
      if (cand != null) {
        if (best == null || cand.cost < best.cost) {
          best = cand
        }
      }
    }
    if (best != null) {
      return best.offsets.map(function(p) {
        return scale(p, {x:1, y:-1})
      })  
    }
    return null
  }
})()


var projectAngle = function(angle) {
  return Math.PI/2 - angle 
  // YES, it is the same formula as for classicAngle! :D
  // But this is just a coincidence
}

console.log(fitTextToEllipseSector({
  spaceWidth: 2,
	lineHeight: 0.5,
  words: [
    {length: 6, breakCost: 10},
    {length: 7, breakCost: 10},
    {length: 3, breakCost: -10},
    {length: 5}
  ],
	align: 'left',
	ellipseSector: {
		rx: 35,
		ry: 5,
		startAngle: projectAngle(Math.atan2(2, -21)),
		endAngle: 0
	}  
}))

console.log(fitTextToEllipseSector({
  spaceWidth: 13874,
  lineHeight: 33,
  words: [
    {length: 8}
  ],
  align: 'left',
  ellipseSector: {
    rx: 5,
    ry: 55,
    startAngle: projectAngle(Math.atan2(5, 11)),
    endAngle: projectAngle(Math.atan2(-5, 11))
  }  
}))