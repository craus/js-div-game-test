var N = 10
units = []

cursorX = 0
cursorY = 0

function watchCursor(event) {
  cursorX = event.clientX
  cursorY = event.clientY
}

ui = {
  newCircle: function() {
    result = $('#circle')[0].cloneNode(true)
    $('#field')[0].appendChild(result)
    return result
  }
}

function createSpace(params) {
  return $.extend(params, {
    tickTime: params.speed / params.ticksPerFrame,
    tick: function() {
      for (var i = 0; i < this.ticksPerFrame; i++) {
        units.forEach(function(unit) { unit.tick() })
      }
      units.forEach(function(unit) { unit.repaint() })
    }
  })
}

space = createSpace({
  ticksPerFrame: 100, 
  speed: 1,
  inc: function(current, derivative) {
    return current + derivative * this.tickTime
  }
})

function circleDetail(params) {
  return $.extend({
    element: ui.newCircle(), 
    place: function(x,y,r){
      this.element.style.left = x - r
      this.element.style.top = y - r
      this.element.style.width = 2 * r
      this.element.style.height = 2 * r
    },
  }, params);
}

function createTank(params) {
  return $.extend(params, {
    x: 300,
    y: 300,
    vx: 0.002,
    vy: 0.002,
    d: 0,
    vd: 0.002,
    k: 1.0 / params.skid,
    kd: 1.0 / params.angularSkid,
    maxAngularAcceleration: params.speed / params.angularSkid / params.rotateRadius,
    maxAcceleration: params.speed / params.skid,
    minAcceleration: params.canStop ? 0 : params.maxAcceleration,
    sz: 10,
    details: [
      {x: 2, y: 0},
      {x: 0, y: 0},
      {x: 0, y: 2},
      {x: 0, y: -2},
      {x: -2, y: 2},
      {x: -2, y: -2},
    ].map(circleDetail),
    repaint: function() {
      tank = this
      this.details.forEach(function(detail){
        detail.place(
          tank.x + (detail.x * Math.cos(tank.d) + detail.y * Math.sin(tank.d)) * tank.sz,
          tank.y - (detail.x * Math.cos(tank.d+Math.PI/2) + detail.y * Math.sin(tank.d+Math.PI/2)) * tank.sz,
          tank.sz
        )
      })
    },
    control: function() {
      angToCursor = Math.atan2(cursorY - this.y, cursorX - this.x)
      angForTurn = normAng(angToCursor - this.d)
      this.aang = this.maxAngularAcceleration * Math.sign(angForTurn)
      
      inertialAng = this.vd / this.kd;
      if (Math.sign(this.vd) == Math.sign(angForTurn) && Math.abs(inertialAng) > Math.abs(angForTurn)) this.aang = -this.aang;


      this.a = angForTurn < Math.PI ? this.maxAcceleration : this.minAcceleration;
      
      distToCursor = dist(this.x, this.y, cursorX, cursorY);
      inertialDist = dist(0, 0, this.vx, this.vy) / this.k;
      if (inertialDist > distToCursor - 3 * this.sz) {
        this.a = this.minAcceleration; 
      }
    },
    tick: function() {
      this.control()
      
      this.x += this.vx * space.tickTime
      this.y += this.vy * space.tickTime
      this.d += this.vd * space.tickTime

      this.vx += this.a * Math.cos(this.d) * space.tickTime
      this.vy += this.a * Math.sin(this.d) * space.tickTime
      this.vd += this.aang * space.tickTime
      
      this.vx -= this.vx * this.k * space.tickTime
      this.vy -= this.vy * this.k * space.tickTime
      this.vd -= this.vd * this.kd * space.tickTime
    },    
  })
}

function initUnits() {
  units.push(tank = createTank({
    skid: 0.1, 
    angularSkid: 0.1, 
    rotateRadius: 10,
    speed: 100,
    canStop: true,
  }))
}

function rnd(min, max) {
  return min + Math.floor(Math.random()*(max-min))
}

function tick() {
  space.tick()
}

window.onload = function() {
  initUnits()
  setInterval(tick, 1)
}