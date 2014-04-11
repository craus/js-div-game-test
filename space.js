function createSpace(params) {
  return $.extend(params, {
    tickTime: params.speed / params.ticksPerFrame,
    frameCount: 0,
    tickCount: 0,
    tick: function() {
      for (var i = 0; i < this.ticksPerFrame; i++) {
        this.tickCount++
        units.forEach(function(unit) { if (unit.tick) unit.tick() })
      }
      units.forEach(function(unit) { if (unit.repaint) unit.repaint() })
      this.frameCount++
      $('#frameCount').text(this.frameCount)
      $('#tickCount').text(this.tickCount)
    }
  })
}