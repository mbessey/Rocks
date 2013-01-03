(function() {
  var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  window.requestAnimationFrame = requestAnimationFrame;
})();

var ship = [
	[ 0, -4],
	[ 3,  4],
	[ 0,  3],
	[-3,  4],
	[ 0, -4]
];

var rock = [
	[ 0, -5],
	[ 2, -4],
	[ 1,  1],
	[ 4,  0],
	[ 2,  4],
	[ 0,  4],
	[-1,  2],
	[-3,  3],
	[-4,  0],
	[-2, -1],
	[-4, -3],
	[-2, -4],
	[-1, -3],
	[ 0, -5],
];

var bullet = [
	{},
	{},
	{},
	{},
	{},
	{},
];

var thrust = [
	{},
	{},
	{},
	{},
	{},
	{},
];

var ctx = document.getElementById("game").getContext('2d');
function clear_canvas() {
	ctx.fillRect(0,0,320,320);
}

function draw_poly(shape) {
	var n = shape.length;
	ctx.beginPath();
	ctx.moveTo(shape[0][0], shape[0][1]);
	for (var i=1; i < n; i++) {
		ctx.lineTo(shape[i][0], shape[i][1]);
	}
	ctx.closePath();
	ctx.stroke();
}

function draw_object(o) {
	ctx.save();
	ctx.translate(o.x, o.y);
	ctx.rotate(o.phi);
	ctx.scale(o.scale, o.scale);
	draw_poly(o.shape);
	ctx.restore();
}

function draw_ship(x, y) {
	ctx.strokeStyle="white";
	draw_object({
		x: x,
		y: y,
		shape: ship,
		scale: 1.0
	});
}

var lasttime;

function simulate(elapsed, objects) {
	for (var i=0; i < objects.length; i++) {
		var o = objects[i];
		o.x = o.x + o.vx * elapsed / 1000;
		o.y = o.y + o.vy * elapsed / 1000;
		o.phi = o.phi + o.vphi *elapsed / 1000;
		if (o.x > 320) {
		    o.x -= 320;
		}
		if (o.y > 320) {
	        o.y -= 320;
		}
		if (o.x < 0) {
		    o.x += 320;
		}
		if (o.y < 0) {
	        o.y += 320;
		}
	}
}

var rocks=[];
var max_r = Math.random()*Math.PI*2;
for (var n=0; n < 20; n++) {
	rocks.push({
		x: Math.random()*320,
		y: Math.random()*320,
		vx: Math.random()*16-8,
		vy: Math.random()*16-8,
		phi: Math.random()*Math.PI*2,
		vphi: Math.random()*max_r - (max_r/2),
		shape: rock,
		scale: Math.random()*4+1
	});
}
console.dir(rocks);

function frame(timestamp) {
	var elapsed;
	if (lasttime === undefined) {
		elapsed = 0;
	} else {
		elapsed = (timestamp - lasttime);
	}
	simulate(elapsed, rocks);
	clear_canvas();
	draw_ship(160, 160);
	for (var i=0; i < rocks.length; i++) {
		draw_object(rocks[i]);
	}
	lasttime = timestamp;
	requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
