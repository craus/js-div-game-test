var N = 10
units = []

cursorX = 0
cursorY = 0

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

units.push(tank = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  d: 0,
  vd: 0,
  k: 0.99,
  kd: 0.99,
  details: [
    {x: 2, y: 0},
    {x: 0, y: 0},
    {x: 0, y: 2},
    {x: 0, y: -2},
    {x: -2, y: 2},
    {x: -2, y: -2},
  ],
  init: function() {
    
  },
  repaint: function() {
  },
  tick: function() {
    x += vx * space.tickTime
    y += vy * space.tickTime
    d += vd * space.tickTime
    vx *= k
    vy *= k
    vd *= kd
    repaint()
  },
})

for (var i = 0; i < N; i++) {
  units.push({
    x: i*10,
    y: i*20,
    r: 5,
    c: '#FF0000'
  })
}

function watchCursor(event) {
  cursorX = event.clientX
  cursorY = event.clientY
}

function drawUnit(unit) {
  unit.element.style.left = unit.x-unit.r
  unit.element.style.top = unit.y-unit.r
  unit.element.style.width = unit.r*2
  unit.element.style.height = unit.r*2
}

function frame() {
  units.forEach(drawUnit)
}

function rnd(min, max) {
  return min + Math.floor(Math.random()*(max-min))
}

function tick() {
  units.forEach(function(unit){
    unit.x += rnd(-1,2)
    unit.y += rnd(-1,2)
  })
  units[0].x = cursorX
  units[0].y = cursorY
  frame()
}

window.onload = function() {
  units.forEach(function(unit){
    unit.element = ui.newCircle()
  })
  setInterval(tick, 1);
}