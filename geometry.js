globalDebug = {
  profileTime: {},
  timePart: {},
  info: {},
  profileStart: function(type = 'default') {
    this.timePart[type] = Date.now()
  },
  profileEnd: function(type = 'default') {
    if (this.profileTime[type] == undefined) {
      this.profileTime[type] = 0
    }
    this.profileTime[type] += Date.now() - this.timePart[type]
  } 
}


const { fitTextToEllipseSector, projectAngle, degreeToRad, radToDeg, toEllipseCoords, isAngleBetween } = (function() {
  const BREAKS_WEIGHT = 1e9
  const PADDING_WEIGHT = 1
  const X_TO_Y_PADDING = 1
  const EPS = 1e-9
  const DISABLE_BINARY_SEARCH = false

  var debug

  try {
    debug = globalDebug 
  }
  catch(e) {
    if(e.name == "ReferenceError") {
      debug = {
        profileTime: {},
        timePart: {},
        info: {},
        profileStart: function(type = 'default') {
          this.timePart[type] = Date.now()
        },
        profileEnd: function(type = 'default') {
          if (this.profileTime[type] == undefined) {
            this.profileTime[type] = 0
          }
          this.profileTime[type] += Date.now() - this.timePart[type]
        } 
      }
    }
  }

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

  var leastPossible = function(a, b, acceptable) {
    return -greatestPossible(-b, -a, x => acceptable(-x))
  }

  var minus = function(a, b) {
    return {x: a.x-b.x, y: a.y-b.y}
  }

  var plus = function(a, b) {
    return {x: a.x+b.x, y: a.y+b.y}
  }

  var mult = function(a, k) {
    return {x: a.x*k, y: a.y*k}
  }

  var round = function(a) {
    return {x: Math.round(a.x), y: Math.round(a.y)}
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

  var scalp = function(a, b) {
    return a.x * b.x + a.y * b.y
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

  var sqrDistance = function(a, b) {
    if (b == undefined) {
      return sqrDistance(a, {x: 0, y: 0})
    }
    return sqr(a.x-b.x)+sqr(a.y-b.y)
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
    return sqrDistance(point, circle) < sqr(circle.r) + EPS
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

  // copypasted from https://github.com/indy256/convexhull-js/blob/master/convexhull.js
  var convexHull = function(points) {
    points.sort(function (a, b) {
        return a.x != b.x ? a.x - b.x : a.y - b.y;
    });

    var n = points.length;
    var hull = [];

    for (var i = 0; i < 2 * n; i++) {
        var j = i < n ? i : 2 * n - 1 - i;
        while (hull.length >= 2 && removeMiddle(hull[hull.length - 2], hull[hull.length - 1], points[j]))
            hull.pop();
        hull.push(points[j]);
    }

    hull.pop();
    return hull;
  }

  var removeMiddle = function(a, b, c) {
    var cross = (a.x - b.x) * (c.y - b.y) - (a.y - b.y) * (c.x - b.x);
    var dot = (a.x - b.x) * (c.x - b.x) + (a.y - b.y) * (c.y - b.y);
    return cross < 0 || cross == 0 && dot <= 0;
  }
  // end https://github.com/indy256/convexhull-js/blob/master/convexhull.js

  var swipeVector = function(ray) {
    return {
      x: -ray.v.y,
      y: ray.v.x
    }
  }

  var minBy = function(array, criteria) {
    var best = null
    var bestCriteria = Number.POSITIVE_INFINITY
    array.forEach(function(element) {
      var newCriteria = criteria(element)
      if (newCriteria < bestCriteria) {
        bestCriteria = newCriteria
        best = element
      }
    })
    return best
  }

  var fitInCircleSector = function(rectangles, circleSector) {
    var baseLines = [circleSector.startRay, {
      x: circleSector.endRay.x, 
      y: circleSector.endRay.y, 
      v: mult(circleSector.endRay.v, -1)
    }]
    debug.info.circleSector = circleSector
    var baseCircles = [{x: circleSector.x, y: circleSector.y, r: circleSector.r}]

    var rectangleVertices = mapConcat(rectangles, function(rectangle) {
      return [
        {x: rectangle.x1, y: rectangle.y1},
        {x: rectangle.x1, y: rectangle.y2},
        {x: rectangle.x2, y: rectangle.y1},
        {x: rectangle.x2, y: rectangle.y2}
      ]
    })
    rectangleVertices = convexHull(rectangleVertices)

    var lines = baseLines.map(function(line) {
      var closestPoint = minBy(rectangleVertices, function(p) { return scalp(p, swipeVector(line))})
      return {
        x: line.x - closestPoint.x,
        y: line.y - closestPoint.y,
        v: line.v
      }
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


    debug.profileStart('line-line')
    var points = mapConcat(lines, function(line1) {
      return mapConcat(lines, function(line2) {
        return linesIntersection(line1, line2)
      })
    })
    debug.profileEnd('line-line')
    debug.profileStart('line-circle')
    points = points.concat(mapConcat(lines, function(line) {
      return mapConcat(circles, function(circle) {
        return lineAndCircleIntersection(line, circle)
      })
    }))
    debug.profileEnd('line-circle')
    debug.profileStart('circle-circle')
    points = points.concat(mapConcat(circles, function(circle1) {
      return mapConcat(circles, function(circle2) {
        return circlesIntersection(circle1, circle2)
      })
    }))
    debug.profileEnd('circle-circle')
    debug.profileStart('acceptablePoint')
    var acceptablePoint = points.find(function(p) {
      return rectangleVertices.every(function(v) {
        return pointInsideCircleSector({x: p.x+v.x, y: p.y+v.y}, circleSector)
      })
    })
    debug.profileEnd('acceptablePoint')
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

  var angleByRay = function(ray) {
    return Math.atan2(ray.v.y, ray.v.x)
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

  var normalizeAngle = function(angle) {
    while (angle < 0) {
      angle += 2*Math.PI
    }
    while (angle > 2*Math.PI) {
      angle -= 2*Math.PI
    }
    return angle
  }

  var ellipseSectorSquare = function(ellipseSector) {
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

    var startAngle = angleByRay(circleSector.startRay)
    var endAngle = angleByRay(circleSector.endRay)
    var deltaAngle = normalizeAngle(endAngle - startAngle)

    var circleSectorSquare = sqr(circleSector.r) * deltaAngle / 2
    return excentricity * circleSectorSquare
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

    if (DISABLE_BINARY_SEARCH) {
      var maxPadding = 0
    } else {
      var maxPadding = greatestPossible(0, 1e9, function(paddingY) {
        return fitRectanglesToEllipseSector(
                paddedRectangles(rectangles, paddingY * X_TO_Y_PADDING, paddingY),
                ellipseSector
            ) != null
      })
    }

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

  var fitWithBreaks = function(fitTextRequest, breaksMask, best) {
    var cost = 0
    var rectangles = []
    var rowRectangles = []
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
      if (j == fitTextRequest.words.length - 1 || ((breaksMask >> j) & 1) == 1) {
        rowRectangles.push({
          x1: 0,
          y1: y - fitTextRequest.lineHeight,
          x2: newX,
          y2: y
        })
        y -= fitTextRequest.lineHeight
        x = 0
        if (j < fitTextRequest.words.length - 1) {
          cost += fitTextRequest.words[j].breakCost
        }
      } else {
        x = newX + fitTextRequest.spaceWidth       
        if (j < fitTextRequest.words.length - 1) {
          cost -= fitTextRequest.words[j].breakCost
        }
      }
    }
    var boundRectangles = [
      rowRectangles.reduce((acc, cur) => {
        return {
          x1: Math.min(acc.x1, cur.x1),
          y1: Math.min(acc.y1, cur.y1),
          x2: Math.max(acc.x2, cur.x2),
          y2: Math.max(acc.y2, cur.y2)
        }
      })
    ]
    var fittingRectangles = fitTextRequest.boundBox ? boundRectangles : rowRectangles
    var maxPossiblePadding = Math.max(fitTextRequest.ellipseSector.rx, fitTextRequest.ellipseSector.ry)
    var breaksCost = cost * BREAKS_WEIGHT
    var bestPossibleCost = breaksCost - PADDING_WEIGHT * maxPossiblePadding
    if (best != null && best.cost < bestPossibleCost) {
      return null;
    }
    var result = fitRectanglesToEllipseSectorWithMaxPadding(
        fittingRectangles,
        classicEllipseSector(fitTextRequest.ellipseSector)
    )
    if (result == null || result.padding < fitTextRequest.minFieldWidth) {
      return null
    }
    result.request = fitTextRequest
    result.breaksMask = breaksMask
    result.breaksCost = breaksCost
    result.paddingCost = - result.padding * PADDING_WEIGHT
    result.cost = result.breaksCost + result.paddingCost
    result.offsets = rectangles.map(function(rectangle) {
      return round(plus({
        x: rectangle.x1,
        y: rectangle.y2
      }, result.fitting))
    })
    return result
  }

  var isBetterFitting = function(cand, best) {
    if (cand != null) {
      if (best == null || cand.cost < best.cost || cand.cost == best.cost && cand.paddingCost < best.paddingCost) {
        return true
      }
    }
    return false
  }

  var lineCountGivenWidth = function(fitTextRequest, lineWidth, greedy = false) {
    var breaks = 0
    var currentLineWidth = 0
    for (var j = 0; j < fitTextRequest.words.length; j++) {
      currentLineWidth += fitTextRequest.words[j].length
      var breakCost = j > 0 ? fitTextRequest.words[j-1].breakCost : 0
      if (!greedy) {
        breakCost = 0
      }
      if (currentLineWidth > lineWidth && breakCost <= 0 || breakCost < 0) {
        breaks += 1
        currentLineWidth = fitTextRequest.words[j].length
      }
      currentLineWidth += fitTextRequest.spaceWidth 
    }   
    return breaks+1
  }

  var minLineWidthGivenLineCount = function(fitTextRequest, lines, greedy = false) {
    var minLineWidth = fitTextRequest.words.reduce((maxWidth, word) => Math.max(maxWidth, word.length), 0)
    var maxLineWidth = fitTextRequest.words.reduce((totalWidth, word) => totalWidth + word.length, 0) + (fitTextRequest.words.length-1)*fitTextRequest.spaceWidth 
    var answer = leastPossible(minLineWidth, maxLineWidth, lineWidth => lineCountGivenWidth(fitTextRequest, lineWidth, greedy) < lines)
    return answer
  }

  var maskGivenLineWidth = function(fitTextRequest, lineWidth, greedy = false) {
    //console.log('masking for ', lineWidth)
    var mask = 0
    var cursor = 1
    var currentLineWidth = 0
    for (var j = 0; j < fitTextRequest.words.length; j++) {
      currentLineWidth += fitTextRequest.words[j].length
      //console.log('added', fitTextRequest.words[j].length)
      var breakCost = j > 0 ? fitTextRequest.words[j-1].breakCost : 0
      if (!greedy) {
        breakCost = 0
      }
      if (currentLineWidth > lineWidth && breakCost <= 0 || breakCost < 0) {
        //console.log('need break')
        mask = mask | (cursor>>1)
        //mask = mask | 1
        currentLineWidth = fitTextRequest.words[j].length
      }
      currentLineWidth += fitTextRequest.spaceWidth 
      cursor = cursor << 1
      //mask = mask << 1
    }   
    //console.log("mask for width ", lineWidth, " = ", mask)
    return mask
  }

  // console.log(maskGivenLineWidth({
  //   words: [
  //     {length: 20},
  //     {length: 30},
  //   ],
  //   spaceWidth: 1
  // }, 50))

  var greedyFit = function(fitTextRequest, best, greedy = false) {
    for (var lines = 1; lines <= fitTextRequest.words.length; lines++) {
      var lineWidth = minLineWidthGivenLineCount(fitTextRequest, lines, greedy)
      var mask = maskGivenLineWidth(fitTextRequest, lineWidth, greedy)
      var cand = fitWithBreaks(fitTextRequest, mask, best)
      if (isBetterFitting(cand, best)) {
        best = cand
        //console.log("better width: ", lineWidth)
      }
    }
    return best
  }

  var greedyGreedyFit = function(fitTextRequest, best) {
    var cand = greedyFit(fitTextRequest, best, true)
    if (isBetterFitting(cand, best)) {
      best = cand
    }
    cand = greedyFit(fitTextRequest, best, false)
    if (isBetterFitting(cand, best)) {
      best = cand
    }
    return best
  }

  var fitTextToConvexEllipseSector = function(fitTextRequest) {
    var totalSquare = 0
    var maxWordLength = 0
    for (var j = 0; j < fitTextRequest.words.length; j++) {
      totalSquare += fitTextRequest.words[j].length * fitTextRequest.lineHeight
      maxWordLength = Math.max(maxWordLength, fitTextRequest.words[j].length)
    }
    var sectorSquare = ellipseSectorSquare(classicEllipseSector(fitTextRequest.ellipseSector))
    if (sectorSquare < totalSquare) {
      return null
    }
    if (fitWithBreaks(Object.assign({}, fitTextRequest, {words: [{length: maxWordLength}]})) == null) {
      return null
    }
    var best = null

    if (fitTextRequest.words.length > 8) {
      best = greedyGreedyFit(fitTextRequest, null)
    } else {
      var maxMask = (1 << (fitTextRequest.words.length - 1)) - 1
      for (var i = maxMask; i >= 0; i--) {
        var cand = fitWithBreaks(fitTextRequest, i, best)
        if (isBetterFitting(cand, best)) {
          best = cand
        }
      }
    }
    if (best != null) {
      if (best.cost == Number.POSITIVE_INFINITY) {
        return null
      }
      best.offsets = best.offsets.map(function(p) {
        return scale(p, {x:1, y:-1})
      })
      return best
    }
    return null
  };

  var fitTextToEllipseSectorPreferBoundBox = function(fitTextRequest) {
    var cand = fitTextToEllipseSector(Object.assign({}, fitTextRequest, {
      boundBox: true
    }))
    if (cand != null) {
      return cand
    }
    return fitTextToEllipseSector(fitTextRequest)
  }

  const fitTextToEllipseSector = function(fitTextRequest) {
    if (normalizeAngle(fitTextRequest.ellipseSector.endAngle - fitTextRequest.ellipseSector.startAngle) < Math.PI + EPS) {
      return fitTextToConvexEllipseSector(fitTextRequest)
    }
    if (fitTextRequest.ellipseSector.startAngle < Math.PI/2 + EPS) {
      var cand = fitTextToEllipseSectorPreferBoundBox(Object.assign({}, fitTextRequest, {
        ellipseSector: Object.assign({}, fitTextRequest.ellipseSector, {
          startAngle: Math.PI/2,
          endAngle: 3*Math.PI/2
        }),
        preferBoundBox: true
      }))
      if (cand != null) {
        return cand
      }
    }
    return fitTextToEllipseSectorPreferBoundBox(Object.assign({}, fitTextRequest, {
      ellipseSector: Object.assign({}, fitTextRequest.ellipseSector, {
        startAngle: Math.PI,
        endAngle: 2*Math.PI
      }),
      preferBoundBox: true
    }))
  }

  const degreeToRad = (angle) => angle * Math.PI / 180;
  const radToDeg = (rad) => {
    const angle = rad * 180 / Math.PI;
    return angle < 0 ? 360 - Math.abs(angle) : angle;
  };

  const toEllipseCoords = (alpha, ratio) => {
    let beta = Math.PI / 2 - alpha;
    let x = Math.cos(beta);
    let y = Math.sin(beta);
    let dx = ratio * x;
    let g = Math.atan2(y, dx);
    return Math.PI / 2 - g;
  };

  const isAngleBetween = ({ startAngle, endAngle }, { from = 0, to = 2 * Math.PI }) => {
    const actualFrom = radToDeg(from);
    const actualTo = radToDeg(to);
    const actualStart = radToDeg(startAngle);
    const actualEnd = radToDeg(endAngle);
    const isInRange = (from, to, angle) => {
      const actualFrom = from % 360;
      const actualTo = to % 360;

      if (actualFrom > actualTo) {
        return ((angle >= actualFrom) || ( angle <= actualTo));
      } else if (actualTo > actualFrom) {
        return ((angle <= actualTo) && ( angle >= actualFrom));
      } else{ // to == from
        return (angle == actualTo);
      }
    };

    return isInRange(actualFrom, actualTo, actualStart) && isInRange(actualFrom, actualTo, actualEnd);
  };

  return { fitTextToEllipseSector, projectAngle, degreeToRad, radToDeg, toEllipseCoords, isAngleBetween };
})();


console.log("Start calculations")
var t0 = Date.now()

// one big word
// console.log(fitTextToEllipseSector({
//   spaceWidth: 2,
//   lineHeight: 0.5,
//   words: [
//     {length: 6, breakCost: 10},
//     {length: 7, breakCost: 10},
//     {length: 3, breakCost: -10},
//     {length: 40}
//   ],
//   align: 'left',
//   ellipseSector: {
//     rx: 35,
//     ry: 5,
//     startAngle: projectAngle(Math.atan2(2, -21)),
//     endAngle: 0
//   }  
// }))

// fit to left half 
// console.log(fitTextToEllipseSector({
//   spaceWidth: 3872,
//   lineHeight: 8,
//   words: [
//     {length: 6}
//   ],
//   align: 'left',
//   ellipseSector: {
//     rx: 10,
//     ry: 5,
//     startAngle: Math.PI / 3,
//     endAngle: 2 * Math.PI
//   }  
// }))


//fit to bottom half 
// console.log(fitTextToEllipseSector({
//   spaceWidth: 3872,
//   lineHeight: 4,
//   words: [
//     {length: 12}
//   ],
//   align: 'left',
//   ellipseSector: {
//     rx: 10,
//     ry: 5,
//     startAngle: Math.PI / 3,
//     endAngle: 2 * Math.PI
//   }  
// }))

//fit to left half, despite able to fit to bottom half, because bottom half is not present whole 
// console.log(fitTextToEllipseSector({
//   spaceWidth: 3872,
//   lineHeight: 1,
//   words: [
//     {length: 4}
//   ],
//   align: 'left',
//   ellipseSector: {
//     rx: 10,
//     ry: 5,
//     startAngle: Math.PI / 2 + 0.01,
//     endAngle: 2 * Math.PI
//   }  
// }))

//test
// console.log(fitTextToEllipseSector({
//    "ellipseSector": {
//       "rx": 212,
//       "ry": 106,
//       "startAngle": 0.5762623,
//       "endAngle": -4.440892E-16
//    },
//    "minFieldWidth": 2.5,
//    "align": "left",
//    "value": "Yes, but with some reservations* 95%",
//    "attrs": {
//       "class": "slice-title",
//       "fill": "#FFF"
//    },
//    "spaceWidth": 4,
//    "lineHeight": 17,
//    "words": [
//       {
//          "length": 29,
//          "breakCost": 0,
//          "value": "Yes,",
//          "attrs": {
//             "x": 161.96507,
//             "y": 95.5
//          }
//       },
//       {
//          "length": 25,
//          "breakCost": 0,
//          "value": "but",
//          "attrs": {
//             "x": 194.96507,
//             "y": 95.5
//          }
//       },
//       {
//          "length": 34,
//          "breakCost": 0,
//          "value": "with",
//          "attrs": {
//             "x": 223.96507,
//             "y": 95.5
//          }
//       },
//       {
//          "length": 39,
//          "breakCost": 0,
//          "value": "some",
//          "attrs": {
//             "x": 161.96507,
//             "y": 112.5
//          }
//       },
//       {
//          "length": 98,
//          "breakCost": -10000000000,
//          "value": "reservations*",
//          "attrs": {
//             "x": 204.96507,
//             "y": 112.5
//          }
//       },
//       {
//          "length": 29,
//          "breakCost": 0,
//          "value": "95%",
//          "attrs": {
//             "x": 161.96507,
//             "y": 129.5
//          }
//       }
//    ]
// }))

// the strongest performance test
console.log(fitTextToEllipseSector({
  "ellipseSector": {
    "rx": 212,
    "ry": 106,
    "startAngle": 3.141592653589793,
    "endAngle": 6.283185307179586
  },
  "minFieldWidth": 2.5,
  "align": "left",
  "value": "B2B Marketers in North America Who Agree that a Steady Flow of Ideas is important to Marketing Success, March 2015 3,000,000%",
  "attrs": {
    "class": "slice-title",
    "fill": "#FFF"
  },
  "spaceWidth": 4,
  "lineHeight": 17,
  "words": [
    {
      "length": 27,
      "breakCost": 0,
      "value": "B2B"
    },
    {
      "length": 76,
      "breakCost": 0,
      "value": "Marketers"
    },
    {
      "length": 14,
      "breakCost": 0,
      "value": "in"
    },
    {
      "length": 42,
      "breakCost": 0,
      "value": "North"
    },
    {
      "length": 60,
      "breakCost": 0,
      "value": "America"
    },
    {
      "length": 33,
      "breakCost": 0,
      "value": "Who"
    },
    {
      "length": 43,
      "breakCost": 0,
      "value": "Agree"
    },
    {
      "length": 30,
      "breakCost": 0,
      "value": "that"
    },
    {
      "length": 9,
      "breakCost": 0,
      "value": "a"
    },
    {
      "length": 50,
      "breakCost": 0,
      "value": "Steady"
    },
    {
      "length": 36,
      "breakCost": 0,
      "value": "Flow"
    },
    {
      "length": 15,
      "breakCost": 0,
      "value": "of"
    },
    {
      "length": 39,
      "breakCost": 0,
      "value": "Ideas"
    },
    {
      "length": 12,
      "breakCost": 0,
      "value": "is"
    },
    {
      "length": 73,
      "breakCost": 0,
      "value": "important"
    },
    {
      "length": 15,
      "breakCost": 0,
      "value": "to"
    },
    {
      "length": 75,
      "breakCost": 0,
      "value": "Marketing"
    },
    {
      "length": 62,
      "breakCost": 0,
      "value": "Success,"
    },
    {
      "length": 46,
      "breakCost": 0,
      "value": "March"
    },
    {
      "length": 33,
      "breakCost": -10000000000,
      "value": "2015"
    },
    {
      "length": 78,
      "breakCost": 0,
      "value": "3,000,000%"
    }
  ],
  "preferBoundBox": true,
  "boundBox": true
}))

//main precision test (padding should be 0.5)
// console.log(fitTextToEllipseSector({
//   spaceWidth: 2,
// 	lineHeight: 0.5,
//   words: [
//     {length: 6, breakCost: 10},
//     {length: 7, breakCost: 10},
//     {length: 3, breakCost: -10},
//     {length: 5}
//   ],
// 	align: 'left',
// 	ellipseSector: {
// 		rx: 35,
// 		ry: 5,
// 		startAngle: projectAngle(Math.atan2(2, -21)),
// 		endAngle: 0
// 	}  
// }))

// console.log(fitTextToEllipseSector({
//   spaceWidth: 13874,
//   lineHeight: 33,
//   words: [
//     {length: 8}
//   ],
//   align: 'left',
//   ellipseSector: {
//     rx: 5,
//     ry: 55,
//     startAngle: projectAngle(Math.atan2(11, 5)),
//     endAngle: projectAngle(Math.atan2(11, -5))
//   }  
// }))

// performance test
// for (var i = 0; i < 1; i++) {
//   console.log(fitTextToEllipseSector({
//     "ellipseSector": {
//       "rx": 212,
//       "ry": 106,
//       "startAngle": 1.6658887606644996,
//       "endAngle": -1.3305786076815007
//     },
//     "minFieldWidth": 1.25,
//     "align": "left",
//     "value": "Digital payment platform providers 17%",
//     "attrs": {
//       "class": "slice-title"
//     },
//     "spaceWidth": 4,
//     "lineHeight": 17,
//     "words": [
//       {
//         "length": 47,
//         "breakCost": 0,
//         "value": "Digital",
//         "attrs": {
//           "x": 101.78131129094973,
//           "y": 154.087556683385
//         }
//       },
//       {
//         "length": 64,
//         "breakCost": 0,
//         "value": "payment",
//         "attrs": {
//           "x": 152.78131129094973,
//           "y": 154.087556683385
//         }
//       },
//       {
//         "length": 63,
//         "breakCost": 0,
//         "value": "platform",
//         "attrs": {
//           "x": 220.78131129094973,
//           "y": 154.087556683385
//         }
//       },
//       {
//         "length": 70,
//         "breakCost": -Number.POSITIVE_INFINITY,
//         "value": "providers",
//         "attrs": {
//           "x": 287.7813112909497,
//           "y": 154.087556683385
//         }
//       },
//       {
//         "length": 29,
//         "breakCost": 0,
//         "value": "17%",
//         "attrs": {
//           "x": 101.78131129094973,
//           "y": 171.087556683385
//         }
//       },
//       {
//         "length": 29,
//         "breakCost": 0,
//         "value": "17%",
//         "attrs": {
//           "x": 101.78131129094973,
//           "y": 171.087556683385
//         }
//       },
//       {
//         "length": 29,
//         "breakCost": 0,
//         "value": "17%",
//         "attrs": {
//           "x": 101.78131129094973,
//           "y": 171.087556683385
//         }
//       },
//       {
//         "length": 29,
//         "breakCost": 0,
//         "value": "17%",
//         "attrs": {
//           "x": 101.78131129094973,
//           "y": 171.087556683385
//         }
//       },
//       {
//         "length": 29,
//         "breakCost": 0,
//         "value": "17%",
//         "attrs": {
//           "x": 101.78131129094973,
//           "y": 171.087556683385
//         }
//       },
//     ]
//   }))
// }

var t1 = Date.now()
console.log("Time: " + (t1-t0) + " ms")
console.log("Profile Time: ", globalDebug.profileTime)
console.log(globalDebug.info)
//console.log("pointInsideCircleSector calls: " + cnt)
