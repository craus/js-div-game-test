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