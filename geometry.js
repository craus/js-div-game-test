// TODO check angles NOT from I quarter
// TODO check rectangles with NO zero vertices

// rectangles = [{x1: 0, y1: 0, x2: 7, y2: 1}, {x1: 0, y1: 1, x2: 14, y2: 2}]
// ellipseSector = {rx: 35, ry: 5, startAngle: Math.atan2(1, 21), endAngle: Math.atan2(3, 14)}
// result = {x: 14, y: 1, freedom: 0}

const BREAKS_WEIGHT = 1e9
const PADDING_WEIGHT = 1
const X_TO_Y_PADDING = 1
const EPS = 1e-9

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
  return distance(point, circleSector) < circleSector.r 
}

var pointInsideSector = function(point, sector) {
  var radiusVector = minus(point, sector)
  var toTheLeftFromStart = toTheRight(sector.startRay, radiusVector)
  var toTheRightFromEnd = toTheRight(radiusVector, sector.endRay)
  if (toTheRight(sector.startRay, sector.endRay)) {
    return toTheLeftFromStart && toTheRightFromEnd
  } else {
    return toTheLeftFromStart || toTheRightFromEnd
  }
}

var pointInsideCircleSector = function(point, circleSector) {
  return distance(point, circleSector) < circleSector.r 
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
  console.log("called linesIntersection")
  console.log("line1:", line1)
  console.log("line2:", line2)
  if (!toTheRight(line1.v, line2.v) && !toTheRight(line2.v, line1.v)) {
    return null;
  }
  var eqn = lineEquation(line1)
  // kt+b = 0
  var k = line2.v.x * eqn.a + line2.v.y * eqn.b 
  var b = eqn.c + line2.x * eqn.a + line2.y * eqn.b
  if (Math.abs(k) < EPS) {
    return null
  }
  var t = -b/k
  return plus(line2, scale(line2.v, t))
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

var fitInCircleSector = function(rectangles, circleSector) {
  console.log("called fitInCircleSector")
  console.log("rectangles:", rectangles)
  console.log("circleSector:", circleSector)
  var baseLines = [circleSector.startRay, circleSector.endRay]
  console.log("baseLines:", baseLines)
  var baseCircles = [{x: circleSector.x, y: circleSector.y, r: circleSector.r}]
  console.log("baseCircles:", baseCircles)
  console.log("rectangles:", rectangles)
  var rectangleVertices = rectangles.map(function(rectangle) {
    return [
      {x: rectangle.x1, y: rectangle.y1}, 
      {x: rectangle.x2, y: rectangle.y2}
    ]
  })
  console.log("rectangleVertices:", rectangleVertices)
  var lines = baseLines.map(function(line) {
    return rectangleVertices.map(function(p) {
      return {
        x: line.x - p.x, 
        y: line.y - p.y,
        v: line.v
      }
    })
  })
  console.log("lines:", lines)
  var circles = baseCircles.map(function(circle) {
    return rectangleVertices.map(function(p) {
      return {
        x: circle.x - p.x,
        y: circle.y - p.y,
        r: circle.r
      }
    })
  })
  var points = lines.map(function(line1) {
    return lines.map(function(line2) {
      return linesIntersection(line1, line2)
    })
  })
  points = points.concat(lines.map(function(line) {
    return circles.map(function(circle) {
      return lineAndCircleIntersection(line, circle)
    })
  }))
  points = points.concat(circles.map(function(circle1) {
    return circles.map(function(circle2) {
      return circlesIntersection(circle1, circle2)
    })
  }))
  var acceptablePoint = points.find(function(p) {
    return rectangleVertices.every(function(v) {
      return pointInsideCircleSector({x: p.x+v.x, y: p.y+v.y}, circleSector)
    })
  })
  return {
    dx: acceptablePoint.x,
    dy: acceptablePoint.y
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
  console.log("called paddedRectangles")
  console.log("rectangles:", rectangles)
  console.log("paddingX:", paddingX)
  console.log("paddingY:", paddingY)
  return rectangles.map(function(rectangle) {
    return {
      x1: rectangle.x1 - paddingX,
      y1: rectangle.y1 - paddingY,
      x2: rectangle.x2 + paddingX,
      y2: rectangle.y2 + paddingY,
    }
  })
}

var fitRectanglesToEllipseSector = function(rectangles, ellipseSector) {
  console.log("called fitRectanglesToEllipseSector")
  console.log("rectangles:", rectangles)
  console.log("ellipseSector:", ellipseSector)
  var startRay = rayByAngle(ellipseSector.startAngle)
  var endRay = rayByAngle(ellipseSector.endAngle)
  
  var excentricity = ellipseSector.rx / ellipseSector.ry
  
  var circleSectorFitting = fitInCircleSector(
    rectangles.map(function(rectangle) {
      return {
        x1: rectangle.x1 / excentricity,
        y1: rectangle.y1, 
        x2: rectangle.x2 / excentricity,
        y2: rectangle.y2
      }
    }),
    {
      x: ellipseSector.x / excentricity,
      y: ellipseSector.y, 
      r: ellipseSector.ry,
      startRay: startRay,
      endRay: endRay
    }
  )
  if (circleSectorFitting == null) {
    return null
  }
  return {
    dx: circleSectorFitting.dx * excentricity,
    dy: circleSectorFitting.dy
  }
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
    return {padding: -Number.POSITIVE_INFINITY}
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
  console.log("called fitWithBreaks")
  console.log("fitTextRequest:", fitTextRequest)
  console.log("breaksMask:", breaksMask)
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
        y += fitTextRequest.lineHeight
        x = 0
        cost += fitTextRequest.words[j].breakCost
      } else {
        x = newX + fitTextRequest.spaceWidth
      }
    }
  }
  console.log("rectangles:", rectangles)
  var result = fitRectanglesToEllipseSectorWithMaxPadding(
    rectangles,
    classicEllipseSector(fitTextRequest.ellipseSector)
  )
  result.cost = cost * BREAKS_WEIGHT - result.padding * PADDING_WEIGHT
  return result
}

var fitTextToEllipseSector = function(fitTextRequest) {
  var best = {
    cost: Number.POSITIVE_INFINITY
  }
  for (var i = 0; i < (1 << (fitTextRequest.words.length - 1)); i++) {
    var cand = fitWithBreaks(fitTextRequest, i)
    if (cand.cost < best.cost) {
      best = cand
    }
  }
  if (best.cost < Number.POSITIVE_INFINITY) {
    
  }
  return best
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