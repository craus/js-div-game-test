function createTank(params) {
  return $.extend(params, {
    x: 300,
    y: 300,
    vx: 0.002,
    vy: 0.002,
    d: 0,
    vd: 0.002,
    k: 1.0 / params.skid,
    kd: 1.0 / params.angularSkid,
    maxAngularAcceleration: params.speed / params.angularSkid / params.rotateRadius,
    maxAcceleration: params.speed / params.skid,
    minAcceleration: params.canStop ? 0 : params.maxAcceleration,
    sz: 10,
    details: [
      {x: 2, y: 0},
      {x: 0, y: 0},
      {x: 0, y: 2},
      {x: 0, y: -2},
      {x: -2, y: 2},
      {x: -2, y: -2},
    ].map(circleDetail),
    repaint: function() {
      tank = this
      this.details.forEach(function(detail){
        detail.place(tank)
      })
    },
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
    collide: function() {
      // this.details.forEach(function(detail){
        // if (tank.x 
      // })
    },
    tick: function() {
      this.control()
      this.collide()
      
      this.x += this.vx * space.tickTime
      this.y += this.vy * space.tickTime
      this.d += this.vd * space.tickTime

      this.vx += this.a * Math.cos(this.d) * space.tickTime
      this.vy += this.a * Math.sin(this.d) * space.tickTime
      this.vd += this.aang * space.tickTime
      
      this.vx -= this.vx * this.k * space.tickTime
      this.vy -= this.vy * this.k * space.tickTime
      this.vd -= this.vd * this.kd * space.tickTime
    },    
  })
}