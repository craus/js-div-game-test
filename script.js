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

space = {
  tickTime: 1
}

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

function initUnits() {
  units.push(tank = {
    x: 300,
    y: 300,
    vx: 0.2,
    vy: 0.2,
    d: 0,
    vd: 0.2,
    k: 0.999,
    kd: 0.999,
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
          tank.y + (detail.x * Math.cos(tank.d+Math.PI/2) + detail.y * Math.sin(tank.d+Math.PI/2)) * tank.sz,
          tank.sz
        )
      })
    },
    tick: function() {
      this.x += this.vx * space.tickTime
      this.y += this.vy * space.tickTime
      this.d += this.vd * space.tickTime
      this.vx *= this.k
      this.vy *= this.k
      this.vd *= this.kd
      this.repaint()
    },
  })
}

function rnd(min, max) {
  return min + Math.floor(Math.random()*(max-min))
}

function tick() {
  units.forEach(function(unit) { unit.tick() })
}

window.onload = function() {
  initUnits()
  setInterval(tick, 1)
}