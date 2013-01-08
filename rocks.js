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
	space: 32,
	o: 79
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
			if (filled) {
				ctx.fill();
				ctx.stroke();
				ctx.beginPath();
			}
			i++;
			ctx.moveTo(shape[i][0]*scale, shape[i][1]*scale);
		}
	}
	if (filled) {
		ctx.fill();
	}
	ctx.stroke();
}

function draw_object(o) {
	ctx.save();
	ctx.translate(o.x, o.y);
	ctx.rotate(o.phi);
	if (o.scale) {
		//ctx.scale(o.scale, o.scale); //scale seems pretty useless: it scales the size of the lines, too
	}
	ctx.lineWidth = o.lineWidth;
	ctx.fillStyle = o.fillStyle;
	ctx.strokeStyle = o.strokeStyle;
	if (o.shape.length >0) {
		draw_poly(o.shape, o.filled, o.scale|1);
	}
	ctx.restore();
	if (o.shape.length > 0 && show_outlines) {
		draw_object_transformed(o);
	}
}

function draw_object_transformed(o) {
	ctx.save();
	ctx.strokeStyle = "red";
	draw_poly(object_to_world(o), false, 1);
	ctx.restore();
}

function draw_number(number, places, scale, x, y) {
	ctx.save();
	var spacing=8*scale;
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
			filled: true,
			strokeStyle: "green",
			fillStyle: "green",
			shape: ship
		});
	}
	ctx.restore();
}

function draw_text(text, scale, x, y, align) {
	var string = text.toUpperCase();
	var spacing=scale*8;
	ctx.save();
	if (align[0].toLowerCase() === 'c') {
		x = x - text.length / 2 * spacing;
	} else if (align[0].toLowerCase() === 'r') {
		x = x - text.length * spacing;
	}
	for (var i=0; i < string.length; i++) {
		var letter = string.substring(i, i+1);
		draw_object({
			x: x + spacing * i + spacing/2, //wacky +1/2 because "0,0" is center of character
			y: y,
			shape:font[letter],
			strokeStyle: "yellow",
			scale: scale
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

var shieldsound;
function play_shield() {
	shieldsound = audio.createOscillator();
	var lfo = audio.createOscillator();
	var gain = audio.createGainNode();
	shieldsound.frequency.value = 440;
	shieldsound.connect(audio.destination);

	lfo.frequency.value = 2;
	lfo.connect(gain);

	gain.gain.value=100;
	gain.connect(shieldsound.detune);
	lfo.noteOn(0);
	shieldsound.noteOn(0);
}

function stop_shield() {
	shieldsound.noteOff(0);
}

var bullet_life = 1;
function spawn_bullet(ship) {
	var bullet_v = 200;
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

function spawn_debris(target, color) {
	var bullet_v = 100;
	for (var i=0; i < 5; i++) {
		var phi = Math.random()*Math.PI*2;
		var dy = -Math.cos(phi);
		var dx = Math.sin(phi);
		var x = target.x;
		var y = target.y;
		particles.push({
			x: x,
			y: y,
			vx: target.vx + dx * bullet_v,
			vy: target.vy + dy * bullet_v,
			phi: phi,
			vphi: 0,
			shape: debris,
			filled: true,
			fillStyle: color,
			strokeStyle: color,
			scale: 1,
			removeAfter: (lasttime+1000),
			onRemoved: function() {
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
	if (game_state == state.playing) {
		if (!ship.dead) {
			process_keys_game(elapsed, ship);
		}
	} else {
		if (held[keys.space]) {
			start();
		}
	}
}

function process_keys_game(elapsed, ship) {
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
		ship.thrusting=true;
	} else {
		// "friction" in space isn't realistic, but the original did it, so...
		ship.thrusting=false;
		ship.vx *= 0.995;
		ship.vy *= 0.995;
	}
	if (held[keys.down]) {
		if (ship.shieldRemaining >0) {
			// shields up
			if (! ship.shielded) {
				play_shield();
			}
			ship.shielded = true;
		}
	} else {
		if (ship.shielded) {
			stop_shield();
		}
		ship.shielded = false;
	}
	if ((pressed[keys.space] || held[keys.space]) && lasttime > bulletTime && num_bullets < max_bullets) {
		// spawn a bullet
		bulletTime = lasttime + (1000 * bullet_interval);
		num_bullets++;
		spawn_bullet(ship);
	}	
	pressed[keys.space]=false;
	if (held[keys.o]) {
		show_outlines=true;
	} else {
		show_outlines=false;
	}
}

var lasttime;
var bulletTime = -1;
var bullet_interval = 0.2;
var num_bullets = 0;
var max_bullets = 20;
var num_rocks=0;
function simulate(elapsed, rocks, ship, bullets) {
	move(elapsed, rocks);
	move(elapsed, [ship]);
	shield.x = ship.x;
	shield.y = ship.y;
	shield.phi = Math.random()*Math.PI*2;
	mythrust.x = ship.x;
	mythrust.y = ship.y;
	mythrust.phi = ship.phi;
	move(elapsed, bullets);
	move(elapsed, particles);
	var hit;
	if (!ship.dead) {
		if (ship.shielded) {
			hit = hit_test(shield, rocks);
			if (hit) {
				var vx = ship.vx;
				var vy = ship.vy;
				ship.vx = hit.vx;
				ship.vy = hit.vy;
				hit.vx=vx;
				hit.vy=vy;
			}
			ship.shieldRemaining -= (elapsed/1000);
			if (ship.shieldRemaining <= 0) {
				ship.shielded = false;
				stop_shield();
			}
		} else {
			hit = hit_test(ship, rocks);
			if (hit) {
				death();
				rocks.splice(rocks.indexOf(hit), 1);
				hit.onRemoved();
			}
		}
	} else {
		if (lasttime > ship.returnAfter && game_state == state.playing && center_safe()) {
			reset_ship();
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
	process_keys(elapsed, ship);
}

var rocks=[];
var bullets=[];
var particles=[];
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
		if (converge && n==0) { // Fix: First rock should always be aimed at the player, not the center...
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
			shape: rock_shape(size),
			filled: true,
			fillStyle: "gray",
			strokeStyle: "black",
			lineWidth: 0.5,
			scale: size,
			onRemoved: function() {
				num_rocks--;
				spawn_debris(this, "gray");
				if (this.scale > 2) {
					spawn_rocks(2, this.x, this.y, this.scale/2, v_max/this.scale*(Math.random()+0.5), 10, false);
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

function draw_title(framecount) {
	draw_text("Rocks!", 4, width/2, 100, "center");
	draw_text("An HTML5 Asteroids game", 2, width/2, 132, "center");
	if (framecount < 20 || framecount > 40) {
		draw_text("Press space to start", 2, width/2, 200, "center");
	}
}

function draw_gameover(framecount) {
	draw_text("Game Over", 2, width/2, 132, "center");
	if (framecount < 20 || framecount > 40) {
		draw_text("Press space to play again", 2, width/2, 200, "center");
	}
}

function draw_game() {
	ctx.save();
	for (var i=0; i < rocks.length; i++) {
		draw_object(rocks[i]);
	}
	for (var i=0; i < bullets.length; i++) {
		draw_object(bullets[i]);
	}
	for (var i=0; i < particles.length; i++) {
		draw_object(particles[i]);
	}
	if (!myship.dead) {
		draw_object(myship);
		if (myship.shielded) {
			draw_object(shield);
		}
		if (myship.thrusting) {
			draw_object(mythrust);
		}
	}
	draw_score(score, 10);
	draw_lives();
	//draw_text("!2345678901234567890123456789012345678!", 2, width/2, height/2, "center");
	ctx.restore();
}

var fps = 0;
var framecount=0;
var lastreport=0;
function frame(timestamp) {
	var elapsed;
	clear_canvas();
	draw_game();
	if (game_state == state.attract) {
		draw_title(framecount);
	} else if (game_state == state.over) {
		draw_gameover(framecount);
	}
	if (lasttime === undefined) {
		elapsed = 0;
		lastreport = timestamp;
	} else {
		elapsed = (timestamp - lasttime);
	}
	simulate(elapsed, rocks, myship, bullets);
	draw_frame_counter(fps);
	lasttime = timestamp;
	if (framecount++ > 60) {
		fps = framecount / ((timestamp-lastreport)/1000);
		lastreport = timestamp;
		framecount=0;
	}
	//draw_text("ABCDEFGHIJKLMNOPQRSTUVWXYZ!.?", 1, 16, 32);
	//draw_text("ABCDEFGHIJKLMNOPQRSTUVWXYZ!.?", 4, 16, 64);
	//draw_number(9876543210, 10, 2, 320, 48);
	requestAnimationFrame(frame);
}

function start_level(level) {
	rocks=[];
	bullets=[];
	num_rocks=0;
	num_bullets=0;
	reset_ship();
	spawn_rocks(level*2+4, width/2, height/2, initial_scale, v_max/initial_scale, 240, true);
}

function hit_test(needle, haystack) {
	var i;
	for (i=0; i < haystack.length; i++) {
		target = haystack[i];
		if (intersects(object_to_world(needle), object_to_world(target))) {
			return target;
		}
	}
}

function death() {
	lives--;
	myship.dead=true;
	myship.vx=0;
	myship.vy=0;
	myship.vphi=0;
	spawn_debris(myship, myship.fillStyle);
	if (lives === 0) {
		game_state = state.over;
	} else {
		myship.returnAfter=lasttime+1500; // return after 1.5 second
	}
}

function rock_shape(scale) {
	var jaggedness = 0.5; // 0==smooth, 1==spiky
	var vertices = [];
	var num_v = 11;
	var max_r = 4;
	for (var i=0; i < num_v; i++) {
		var phi = Math.PI*2/num_v*i;
		var r = max_r + Math.random()*jaggedness*max_r - jaggedness*max_r;
		var y = -Math.cos(phi) * r;
		var x = Math.sin(phi) * r;
		vertices.push([x, y]);
	}
	vertices.push([vertices[0][0], vertices[0][1]]);
	return vertices;
}

function reset_ship() {
	myship={
		x: width/2,
		y: height/2,
		phi: 0,
		vx: 0,
		vy: 0,
		vphi: 0,
		shape: ship,
		filled: true,
		fillStyle: "yellow",
		strokeStyle: "#808000",
		lineWidth: 1,
		scale: 2,
		shieldRemaining: 5
	};
}

function center_safe() {
	for (var i=0; i < rocks.length; i++) {
		var dx = rocks[i].x - width/2;
		var dy = rocks[i].y - height/2;
		if (dx*dx + dy*dy < 10000) {
			return false;
		}
	}
	return true;
}

// set up
var myship;
var shield = {
	phi: 0,
	strokeStyle: "purple",
	fillStyle: "rgba(255, 0, 255, 0.2)",
	filled: true,
	shape: shield,
	scale: 4
};
var mythrust= {
	phi: 0,
	strokeStyle: "red",
	fillStyle: "rgba(255, 128, 0, 0.2)",
	filled: true,
	shape: thrust,
	scale: 2
};
var state = {
	attract: 0,
	playing: 1,
	over: 2
};
var game_state=state.attract;
var lives = 3;
var level=0;
var show_outlines=false;

function start() {
	lives = 3;
	level = 0;
	score = 0;
	game_state=state.playing;
	start_level(level);
}

// start animating
start_level(level);
myship.dead=true;
requestAnimationFrame(frame);
