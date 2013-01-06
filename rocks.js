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
var score = 0;

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

function draw_lives() {
	ctx.save();
	for (var i=0; i < lives; i++) {
		draw_object({
			x: (i+1) * 10,
			y: 16,
			strokeStyle: "green",
			shape: ship
		});
	}
	ctx.restore();
}

function play_beep(freq, duration) {
	var beep = audio.createOscillator();
	beep.frequency.setValueAtTime(freq, audio.currentTime);
	beep.frequency.linearRampToValueAtTime(freq*2, audio.currentTime+duration/2);
	beep.frequency.linearRampToValueAtTime(freq, audio.currentTime+duration);
	var  vol = audio.createGainNode();
	vol.gain.setValueAtTime(0, audio.currentTime);
	vol.gain.linearRampToValueAtTime(1, audio.currentTime+duration/2);
	vol.gain.linearRampToValueAtTime(0 , audio.currentTime+duration);
	beep.connect(vol);
	vol.connect(audio.destination);
	beep.noteOn(0);
	beep.noteOff(audio.currentTime+duration);
}

function play_bullet_sound() {
	play_beep(220, 0.1);
}

var bullet_life = 3;
function spawn_bullet(ship) {
	var bullet_v = 100;
	var distance_from_ship=6;
	var dy = -Math.cos(ship.phi);
	var dx = Math.sin(ship.phi);
	var x = ship.x + dx * distance_from_ship;
	var y = ship.y + dy * distance_from_ship;
	bullets.push({
		x: x,
		y: y,
		vx: ship.vx + dx * bullet_v,
		vy: ship.vy + dy * bullet_v,
		phi: ship.phi,
		vphi: 0,
		shape: bullet,
		filled: true,
		fillStyle: "white",
		strokeStyle: "white",
		scale: 1,
		removeAfter: (lasttime+1000*bullet_life),
		onRemoved: function() {
			num_bullets--;
		}
	});
	play_bullet_sound();
}

function spawn_debris(ship) {
	var bullet_v = 100;
	for (var i=0; i < 5; i++) {
		var phi = Math.random()*Math.PI*2;
		var dy = -Math.cos(phi);
		var dx = Math.sin(phi);
		var x = ship.x;
		var y = ship.y;
		bullets.push({
			x: x,
			y: y,
			vx: ship.vx + dx * bullet_v,
			vy: ship.vy + dy * bullet_v,
			phi: phi,
			vphi: 0,
			shape: bullet,
			filled: true,
			fillStyle: "yellow",
			strokeStyle: "yellow",
			scale: 1,
			removeAfter: (lasttime+1000),
			onRemoved: function() {
				num_bullets--;
			}
		});
	}
	//play_bullet_sound();
}

function move(elapsed, objects) {
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
		if (o.removeAfter && o.removeAfter < lasttime) {
			o.onRemoved();
			dead.push(i);
		}
	}
	// remove dead objects
	for (i = 0; i < dead.length; i++) {
		objects.splice(dead[i], 1);
	}
}

function process_keys(elapsed, ship) {
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
		// "friction" in space isn't realistic, but the original did it, so...
		ship.vx *= 0.99;
		ship.vy *= 0.99;
	}
	if (held[keys.down]) {
		// shields up
	}	
	if ((pressed[keys.space] || held[keys.space]) && lasttime > bulletTime && num_bullets < max_bullets) {
		// spawn a bullet
		bulletTime = lasttime + (1000 * bullet_interval);
		num_bullets++;
		spawn_bullet(ship);
	}	
	pressed[keys.space]=false;
}

var lasttime;
var bulletTime = -1;
var bullet_interval = 0.1;
var num_bullets = 0;
var max_bullets = 20;
var num_rocks=0;
function simulate(elapsed, rocks, ship, bullets) {
	move(elapsed, rocks);
	move(elapsed, [ship]);
	move(elapsed, bullets);
	var hit;
	if (!ship.dead) {
		hit = hit_test(ship, rocks);
		if (hit) {
			lives--;
			death();
			rocks.splice(rocks.indexOf(hit), 1);
			hit.onRemoved();
		}
	} else {
		if (lasttime > ship.returnAfter) {
			ship.dead=false;
		}
	}
	for (var i=0; i < bullets.length; i++ ) {
		var bullet = bullets[i];
		hit = hit_test(bullet, rocks);
		if (hit) {
			score += 10;
			play_beep(110, 0.1);
			bullets.splice(i,1);
			bullet.onRemoved();
			rocks.splice(rocks.indexOf(hit), 1);
			hit.onRemoved();
		}
	}
	if (!ship.dead) {
		process_keys(elapsed, ship);
	}
}

var rocks=[];
var bullets=[];
var lives = 3;
var level=0;
var initial_scale = 8;
var v_max = 256;
function spawn_rocks(howmany, x, y, size, speed, radius, converge) {
	var max_r = Math.PI*8/size;
	for (var n=0; n < howmany; n++) {
		var phi = Math.random()*Math.PI*2;
		var dy = -Math.cos(phi);
		var dx = Math.sin(phi);
		var vx;
		var vy;
		if (converge && n==0) { // First rock is always aimed at the player...
			vx = -dx*speed;
			vy = -dy*speed;
		} else {
			phi = Math.random()*Math.PI*2;
			vx = Math.sin(phi)*speed;
			vy = -Math.cos(phi)*speed;
		}
		rocks.push({
			x: x + dx * radius,
			y: y + dy * radius,
			vx: vx,
			vy: vy,
			phi: Math.random()*Math.PI*2,
			vphi: Math.random()*max_r - (max_r/2),
			shape: rock,
			filled: true,
			fillStyle: "gray",
			strokeStyle: "black",
			scale: size,
			onRemoved: function() {
				num_rocks--;
				if (this.scale > 2) {
					spawn_rocks(2, this.x, this.y, this.scale/2, v_max/this.scale, 10, false);
				}
				if (num_rocks == 0) {
					level++;
					start_level(level);
				}
			}
		});
	}
	num_rocks += howmany;
}
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
//rocks.push(myship);
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
	simulate(elapsed, rocks, myship, bullets);
	clear_canvas();
	for (var i=0; i < rocks.length; i++) {
		draw_object(rocks[i]);
	}
	for (var i=0; i < bullets.length; i++) {
		draw_object(bullets[i]);
	}
	if (!myship.dead) {
		draw_object(myship);
	}
	draw_score(score, 10);
	draw_lives();
	draw_frame_counter(fps);
	lasttime = timestamp;
	if (framecount++ > 60) {
		fps = framecount / ((timestamp-lastreport)/1000);
		lastreport = timestamp;
		framecount=0;
	}
	requestAnimationFrame(frame);
}

function start_level(level) {
	spawn_rocks(level*2+4, width/2, height/2, initial_scale, v_max/initial_scale, 240, true);
}

function hit_test(needle, haystack) {
	var i;
	for (i=0; i < haystack.length; i++) {
		target = haystack[i];
		var dx = needle.x-target.x;
		var dy = needle.y-target.y;
		if (dx*dx+dy*dy < 80) {
			return target;
		}
	}
}

function death() {
	myship.dead=true;
	myship.vx=0;
	myship.vy=0;
	myship.vphi=0;
	spawn_debris(myship);
	myship.returnAfter=lasttime+1500; // return after 0.5 second
}
// start animating
start_level(level);
requestAnimationFrame(frame);
