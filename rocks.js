/* 
	rocks.js
	Main game code
*/


(function() {
  var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  window.requestAnimationFrame = requestAnimationFrame;
})();
(function() {
  var audioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
  window.AudioContext = audioContext;
})();

var keys={
	left: 37,
	up: 38,
	right: 39,
	down: 40,
	space: 32
};
var held=[];
var pressed=[];
function keydown(event) {
	//console.log("keydown, "+event.keyCode);
	if (event.keyCode == 37 || event.keyCode == 38 || event.keyCode == 39 || event.keyCode == 40 || event.keyCode == 32 ) {
		held[event.keyCode]=true;
		pressed[event.keyCode]=true;
    	event.preventDefault(); // Prevent the default action
		return true;
	}
}

function keyup(event) {
	//console.log("keyup, "+event.keyCode);
	if (event.keyCode == 37 || event.keyCode == 38 || event.keyCode == 39 || event.keyCode == 40 || event.keyCode == 32 ) {
		held[event.keyCode]=false;
    	event.preventDefault(); // Prevent the default action
		return true;
	}
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
var audio = new AudioContext();

function clear_canvas() {
	ctx.fillRect(0, 0, width, height);
}

function draw_poly(shape, filled, scale) {
	var n = shape.length;
	ctx.beginPath();
	ctx.moveTo(shape[0][0]*scale, shape[0][1]*scale);
	for (var i=1; i < n; i++) {
		var x=shape[i][0];
		var y=shape[i][1];
		if (x !== undefined) {
			ctx.lineTo(x*scale, y*scale);
		} else {
		}
	}
	ctx.stroke();
	if (filled) {
		ctx.fill();
	}
}

function draw_object(o) {
	ctx.save();
	ctx.translate(o.x, o.y);
	ctx.rotate(o.phi);
	if (o.scale) {
		//ctx.scale(o.scale, o.scale); //scale seems pretty useless: it scales the size of the lines, too
	}
	ctx.fillStyle = o.fillStyle;
	ctx.strokeStyle = o.strokeStyle;
	draw_poly(o.shape, o.filled, o.scale|1);
	ctx.restore();
}

function draw_number(number, places, scale, x, y) {
	ctx.save();
	var spacing=16;
	for (var place=0; place < places; place++) {
		var digit = ~~(number % 10);
		number = ~~(number / 10);
		draw_object({
			x: x - spacing * (place+1),
			y: y,
			shape:font[digit],
			strokeStyle: "green",
			scale: scale
		});
	}
	ctx.restore();
}

function draw_score(score, places) {
	ctx.save();
	ctx.lineWidth=2;
	ctx.lineCap="square"; //butt, round, square
	ctx.lineJoin="round"; //bevel, round, miter
	var x = width - 2;
	var y = 16;
	draw_number(score, places, 2, x, y);
	ctx.restore();
}

function draw_frame_counter(fps) {
	ctx.save();
	ctx.lineCap="square"; //butt, round, square
	ctx.lineJoin="round"; //bevel, round, miter
	var x = width - 2;
	var y = height - 16;
	draw_number(fps, 3, 1, x, y);
	ctx.restore();
}

function play_bullet_sound() {
	var beep = audio.createOscillator();
	beep.connect(audio.destination);
	beep.noteOn(0);
	beep.noteOff(audio.currentTime+0.1);
}

var bullet_life = 2;
function spawn_bullet(ship) {
	var bullet_v = 100;
	var distance_from_ship=6;
	var dy = -Math.cos(ship.phi);
	var dx = Math.sin(ship.phi);
	var x = ship.x + dx * distance_from_ship;
	var y = ship.y + dy * distance_from_ship;
	rocks.push({
		x: x,
		y: y,
		vx: ship.vx + dx * bullet_v,
		vy: ship.vy + dy * bullet_v,
		phi: ship.phi,
		vphi: 0,
		shape: bullet,
		filled: true,
		fillStyle: "white",
		lineStyle: "white",
		scale: 1,
		removeAfter: (performance.webkitNow()+1000*bullet_life),
		removed: function() {
			num_bullets--;
		}
	});
}

var lasttime;
var bulletTime = -1;
var bullet_interval = 0.1;
var num_bullets = 0;
var max_bullets = 10;
function simulate(elapsed, objects, ship) {
	var dead = [];
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
		if (o.removeAfter && o.removeAfter < performance.webkitNow()) {
			o.removed();
			dead.push(i);
		}
	}
	// remove dead objects
	for (i = 0; i < dead.length; i++) {
		objects.splice(dead[i], 1);
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
	if ((pressed[keys.space] || held[keys.space]) && performance.webkitNow() > bulletTime && num_bullets < max_bullets) {
		// spawn a bullet
		bulletTime=performance.webkitNow() + (1000 * bullet_interval);
		play_bullet_sound();
		num_bullets++;
		spawn_bullet(ship);
	}	
	pressed[keys.space]=false;
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
		filled: true,
		fillStyle: "gray",
		lineStyle: "darkgray",
		scale: 2
	});
}
//console.dir(rocks);
var myship={
	x: width/2,
	y: height/2,
	phi: 0,
	vx: 0,
	vy: 0,
	vphi: 0,
	shape: ship,
	filled: true,
	fillStyle: "yellow",
	strokeStyle: "darkyellow",
	scale: 2
};
rocks.push(myship);
var fps = 0;
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
	for (var i=0; i < rocks.length; i++) {
		draw_object(rocks[i]);
	}
	draw_score(9876543210, 10);
	draw_frame_counter(fps);
	lasttime = timestamp;
	if (framecount++ > 60) {
		fps = framecount / ((timestamp-lastreport)/1000);
		lastreport = timestamp;
		framecount=0;
	}
	requestAnimationFrame(frame);
}

function hit_test(needle, haystack) {
	var i;
	for (i=0; i < haystack.length; i++) {
		
	} 
}

requestAnimationFrame(frame);
