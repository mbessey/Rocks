(function() {
  var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  window.requestAnimationFrame = requestAnimationFrame;
})();

var keys={
	left: 37,
	up: 38,
	right: 39,
	down: 40,
	space: 32
};
var held=[];
function keydown(event) {
	//console.log("keydown, "+event.keyCode);
	held[event.keyCode]=true;
}

function keyup(event) {
	held[event.keyCode]=false;
	//console.log("keyup, "+event.keyCode);
}

document.onkeydown=keydown;
document.onkeyup=keyup;

var canvas = document.getElementById("game");
var ctx = canvas.getContext('2d');
// This is supposed to disable some anti-aliasing, but doesn't seem to work for lines
ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
var width = canvas.width;
var height = canvas.height;
function clear_canvas() {
	ctx.fillRect(0, 0, width, height);
}

function draw_poly(shape) {
	var n = shape.length;
	ctx.beginPath();
	ctx.moveTo(shape[0][0], shape[0][1]);
	for (var i=1; i < n; i++) {
		ctx.lineTo(shape[i][0], shape[i][1]);
	}
	ctx.stroke();
	ctx.fill();
}

function draw_object(o) {
	ctx.save();
	ctx.translate(o.x, o.y);
	ctx.rotate(o.phi);
	//ctx.scale(o.scale, o.scale); //scale seems pretty useless: it scales the size of the lines, too
	draw_poly(o.shape);
	ctx.restore();
}

function draw_ship(s) {
	ctx.save();
	ctx.strokeStyle="lightblue";
	draw_object(s);
	if (held[keys.up]) {
		ctx.strokeStyle="red";
		draw_object({
			x: s.x,
			y: s.y,
			shape: thrust
		});
	}
	ctx.restore();
}

function draw_score(score) {
	ctx.save();
	ctx.strokeStyle="green";
	var places = 6;
	var spacing = 6;
	for (var place=0; place < places; place++) {
		draw_object({
			x: width - spacing * (place+1),
			y: 16,
			shape:font[3]
		});
	}
	ctx.restore();
}

var lasttime;

function simulate(elapsed, objects, ship) {
	for (var i=0; i < objects.length; i++) {
		var o = objects[i];
		o.x = o.x + o.vx * elapsed / 1000;
		o.y = o.y + o.vy * elapsed / 1000;
		o.phi = o.phi + o.vphi *elapsed / 1000;
		if (o.x > width) {
		    o.x -= width;
		}
		if (o.y > height) {
	        o.y -= height;
		}
		if (o.x < 0) {
		    o.x += width;
		}
		if (o.y < 0) {
	        o.y += height;
		}
	}
	if (held[keys.left]) {
		ship.vphi = -4;
	} else if (held[keys.right]) {
		ship.vphi = 4;
	} else {
		ship.vphi = 0;
	}
	if (held[keys.up]) {
		//thrust
		var dy = -Math.cos(ship.phi);
		var dx = Math.sin(ship.phi);
		ship.vy+=(dy*elapsed/5);
		ship.vx+=(dx*elapsed/5);
	} else {
		// "friction" isn't realistic, but the original did it...
		ship.vx *= 0.95;
		ship.vy *= 0.95;
	}
	if (held[keys.down]) {
		// shields up
	}	
	if (held[keys.space]) {
		// spawn a bullet
	}	
}

var rocks=[];
var numrocks=50;
var max_r = Math.random()*Math.PI*2;
for (var n=0; n < numrocks; n++) {
	rocks.push({
		x: Math.random()*width,
		y: Math.random()*height,
		vx: Math.random()*16-8,
		vy: Math.random()*16-8,
		phi: Math.random()*Math.PI*2,
		vphi: Math.random()*max_r - (max_r/2),
		shape: rock,
		scale: Math.random()*4+1
	});
}
console.dir(rocks);
var myship={
	x: width/2,
	y: height/2,
	phi: 0,
	vx: 0,
	vy: 0,
	vphi: 0,
	shape: ship
};
rocks.push(myship);
var framecount=0;
var lastreport=0;
function frame(timestamp) {
	var elapsed;
	if (lasttime === undefined) {
		elapsed = 0;
		lastreport = timestamp;
	} else {
		elapsed = (timestamp - lasttime);
	}
	simulate(elapsed, rocks, myship);
	clear_canvas();
	draw_ship(myship);
	draw_score();
	for (var i=0; i < rocks.length; i++) {
		ctx.strokeStyle="lightgray";
		draw_object(rocks[i]);
	}
	lasttime = timestamp;
	if (framecount++ > 60) {
		console.log(framecount / ((timestamp-lastreport)/1000) + " FPS");
		lastreport = timestamp;
		framecount=0;
	}
	requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
