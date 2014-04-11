function circleDetail(params) {
  var element = ui.newCircle()
    
  return $.extend({ 
    place: function(x,y,r){
      element.style.left = x - r
      element.style.top = y - r
      element.style.width = 2 * r
      element.style.height = 2 * r
    },
  }, params);
}