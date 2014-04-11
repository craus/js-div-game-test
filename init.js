window.onload = function() {
  space = createSpace({
    ticksPerFrame: 100, 
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
      speed: 100,
      canStop: true,
    }),
    bounds = createBounds($('#field')[0]),
  ]
  
  setInterval(space.tick.bind(space), 1)
}