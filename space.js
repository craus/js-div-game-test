function createSpace(params) {
  return $.extend(params, {
    tickTime: params.speed / params.ticksPerFrame,
    tick: function() {
      for (var i = 0; i < this.ticksPerFrame; i++) {
        units.forEach(function(unit) { if (unit.tick) unit.tick() })
      }
      units.forEach(function(unit) { if (unit.repaint) unit.repaint() })
    }
  })
}