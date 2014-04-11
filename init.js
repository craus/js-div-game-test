window.onload = function() {
  space = createSpace({
    ticksPerFrame: 300, 
    speed: 1,
    inc: function(current, derivative) {
      return current + derivative * this.tickTime
    }
  })

  units = [
    tank = createTank({
      skid: 0.1, 
      angularSkid: 0.1, 
      rotateRadius: 10,
      speed: 300,
      canStop: true,
    }),
    bounds = createBounds($('#field')[0]),
  ]
  
  setInterval(space.tick.bind(space), 1)
  
  realTime = 0
  setInterval(function() {
    realTime++
    $('#realTime').text(realTime)
    $('#fps').text(space.frameCount / realTime)
  }, 1000)
}