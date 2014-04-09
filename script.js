		var N = 1
		units = []

		x=3

		for (var i = 0; i < N; i++) {
			units.push({
				x: i*10,
				y: i*20,
				r: 5,
				c: '#FF0000'
			})
		}

		function watchCursor(event) {
			units[0].x = event.clientX
			units[0].y = event.clientY
		}

		function line(x1,y1,x2,y2,c) {
			context.strokeStyle= c || '#ffffff' 
			context.moveTo(x1,y1)
			context.lineTo(x2,y2)
			context.stroke()
		}

		function circle(x,y,r,c) {
			context.fillStyle = c || '#ffffff' 
			context.arc(x,y,r,0,2*Math.PI);
			context.fill();
		}

		function clear() {
			context.clearRect(0,0,canvas.width, canvas.height)
		}

		function drawUnit(unit) {
			unit.element.style.left = unit.x-unit.r
			unit.element.style.top = unit.y-unit.r
			unit.element.style.width = unit.r*2
			unit.element.style.height = unit.r*2
		}

		function frame() {
			units.forEach(drawUnit)
		}

		function rnd(min, max) {
			return min + Math.floor(Math.random()*(max-min))
		}

		function tick() {
			units.forEach(function(unit){
				unit.x += rnd(-1,2)
				unit.y += rnd(-1,2)
			})
			frame()
		}

		window.onload = function() {
			units.forEach(function(unit){
				unit.element = $('#circle')[0].cloneNode(true)
				$('#field')[0].appendChild(unit.element);
			})
			setInterval(tick, 1);
		}