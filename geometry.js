// TODO check angles NOT from I quarter
// TODO check rectangles with NO zero vertices

// rectangles = [{x1: 0, y1: 0, x2: 7, y2: 1}, {x1: 0, y1: 1, x2: 14, y2: 2}]
// ellipseSector = {rx: 35, ry: 5, startAngle: Math.atan2(1, 21), endAngle: Math.atan2(3, 14)}
// result = {x: 14, y: 1, freedom: 0}

const BREAKS_WEIGHT = 1e9
const PADDING_WEIGHT = 1
const X_TO_Y_PADDING = 1

var greatestPossible = function(a, b, acceptable) {
  var cur = a
  var step = (b-a)/2
  while (step > eps) {
    if (acceptable(cur+step)) {
      cur += step
    }
    step /= 2
  }
  return cur
}

var pointInsideCircleSector = function(point, circleSector) {
  
}

var fitInCircleSector = function(rectangles, circleSector) {
  var baseLines = [circleSector.startRay, circleSector.endRay]
  var baseCircles = [{x: circleSector.x, y: circleSector.y, r: circleSector.r}]
  var rectangleVertices = rectangles.map(function(rectangle) {
    return [
      {x: rectangle.x1, y: rectangle.y1}, 
      {x: rectangle.x2, y: rectangle.y2}
    ]
  })
  var lines = baseLines.map(function(line) {
    return rectangleVertices.map(function(p) {
      return {
        x: line.x - p.x, 
        y: line.y - p.y,
        vx: line.vx,
        vy: line.vy
      }
    })
  })
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
  })
  points = points.concat(circles.map(function(circle1) {
    return circles.map(function(circle2) {
      return circlesIntersection(circle1, circle2)
    })
  })
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
    vx: Math.cos(angle),
    vy: Math.sin(angle)
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

var fitRectanglesToEllipseSector = function(rectangles, ellipseSector) {
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
    var newX = x + fitTextRequest.words[j].width
    rectangles.push({
      x1: x,
      y1: y - fitTextRequest.lineHeight,
      x2: newX,
      y2: y
    })
    if (j < fitTextRequest.words.length - 1) {
      if (((i >> j) & 1) == 1) {
        y += fitTextRequest.lineHeight
        x = 0
        cost += fitTextRequest.words[j].breakCost
      } else {
        x = newX + fitTextRequest.spaceWidth
      }
    }
  }
  var result = fitRectanglesToEllipseSectorWithMaxPadding(
    classicEllipseSector(fitTextRequest.ellipseSector), rectangles
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
  ]
	align: 'left',
	ellipseSector: {
		rx: 35,
		ry: 5,
		startAngle: Math.atan2(2, -21),
		endAngle: 0
	}  
}))