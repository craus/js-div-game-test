function createTank(params) {
  tank = createUnit($.extend({
    maxAngularAcceleration: params.speed / params.angularSkid / params.rotateRadius,
    maxAcceleration: params.speed / params.skid,
    minAcceleration: params.canStop ? 0 : params.maxAcceleration,
    k: 1.0 / params.skid,
    kd: 1.0 / params.angularSkid,
    details: [
      {x: 2, y: 0},
      {x: 0, y: 0},
      {x: 0, y: 2},
      {x: 0, y: -2},
      {x: -2, y: 2},
      {x: -2, y: -2},
    ].map(circleDetail),
    control: function() {
      angToCursor = Math.atan2(cursorY - this.y, cursorX - this.x)
      angForTurn = normAng(angToCursor - this.d)
      this.aang = this.maxAngularAcceleration * Math.sign(angForTurn)
      
      inertialAng = this.vd / this.kd;
      if (Math.sign(this.vd) == Math.sign(angForTurn) && Math.abs(inertialAng) > Math.abs(angForTurn)) this.aang = -this.aang;


      this.a = angForTurn < Math.PI ? this.maxAcceleration : this.minAcceleration;
      
      distToCursor = dist(this.x, this.y, cursorX, cursorY);
      inertialDist = dist(0, 0, this.vx, this.vy) / this.k;
      if (inertialDist > distToCursor - 3 * this.sz) {
        this.a = this.minAcceleration; 
      }
    },

  }, params))
  return tank
}