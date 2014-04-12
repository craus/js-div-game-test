function circleDetail(params) {
  var element = ui.newCircle()
    
  return $.extend({ 
    place: function(tank){
      x = tank.x + (this.x * Math.cos(tank.d) + this.y * Math.sin(tank.d)) * tank.sz,
      y = tank.y - (this.x * Math.cos(tank.d+Math.PI/2) + this.y * Math.sin(tank.d+Math.PI/2)) * tank.sz,
      r = tank.sz
      element.style.left = x - r
      element.style.top = y - r
      element.style.width = 2 * r
      element.style.height = 2 * r
    }
  }, params);
}