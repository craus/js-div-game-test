window.onload = function() {
  
  space = createSpace({
    ticksPerFrame: 300, 
    speed: 0.1,
    inc: function(current, derivative) {
      return current + derivative * this.tickTime
    }
  })

  units = [
    
    bounds = createBounds($('#field')[0]),
    
    tank = createTank({
      skid: 0.1, 
      angularSkid: 0.1, 
      rotateRadius: 10,
      speed: 300,
      canStop: true,
      x: (bounds.left + bounds.right)/2,
      y: (bounds.top + bounds.bottom)/2,
    }),
    
    ball = createUnit({
      details: [
        circleDetail(),
      ],
      vx: 2,
      vy: 1,
    }),
    
  ]
  
  spaceTick = setInterval(space.tick.bind(space), 5)
  
  realTime = 0
  setInterval(function() {
    realTime++
    $('#realTime').text(realTime)
    $('#fps').text(space.frameCount / realTime)
    $('#debugInfo').text(JSON.stringify(debugInfo))
  }, 1000)
}