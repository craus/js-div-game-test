function createSpace(params) {
  return $.extend(params, {
    tickTime: params.speed / params.ticksPerFrame,
    frameCount: 0,
    tickCount: 0,
    tick: function() {
      for (var i = 0; i < this.ticksPerFrame; i++) {
        this.tickCount++
        units.forEach(call('tick'))
      }
      units.forEach(call('repaint'))
      this.frameCount++
      $('#frameCount').text(this.frameCount)
      $('#tickCount').text(this.tickCount)
    }
  })
}