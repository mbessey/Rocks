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
	if (event.keyCode == 37 || event.keyCode == 38 || event.keyCode == 39 || event.keyCode == 40 || event.keyCode == 32 || event.keyCode == 79 ) {
		held[event.keyCode]=true;
		pressed[event.keyCode]=true;
    	event.preventDefault(); // Prevent the default action
		return true;
	}
}

function keyup(event) {
	//console.log("keyup, "+event.keyCode);
	if (event.keyCode == 37 || event.keyCode == 38 || event.keyCode == 39 || event.keyCode == 40 || event.keyCode == 32 || event.keyCode == 79 ) {
		held[event.keyCode]=false;
    	event.preventDefault(); // Prevent the default action
		return true;
	}
}

function keyspressed() {
	var keys=pressed;
	pressed=[];
	return keys;
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
var audio;
if (window.AudioContext) {
	audio = new AudioContext();
}
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

var threshold=32;
function draw_object(o) {
	actually_draw_object(o, o.x, o.y);
	//TODO: Make this more-sophisticated
	if (o.x < threshold) {
		actually_draw_object(o, width+o.x, o.y);
	}
	if (o.x > width-threshold) {
		actually_draw_object(o, o.x-width, o.y);
	}
	if (o.y < threshold) {
		actually_draw_object(o, o.x, height+o.y);
	}
	if (o.y > height-threshold) {
		actually_draw_object(o, o.x, +o.y-height);
	}
}

function actually_draw_object(o, x, y) {
	ctx.save();
	ctx.translate(x, y);
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
	ctx.strokeStyle="green";
	var x = width - 2;
	var y = 16;
	draw_number(score, places, 2, x, y);
	ctx.restore();
}

function draw_frame_counter(fps, min, max) {
	ctx.save();
	ctx.lineCap="square"; //butt, round, square
	ctx.lineJoin="round"; //bevel, round, miter
	var x = width - 2;
	var y = height - 16;
	ctx.strokeStyle = "yellow";
	draw_number(fps, 3, 1, x, y);
	ctx.strokeStyle = "red";
	draw_number(min, 3, 1, x-50, y);
	ctx.strokeStyle = "green";
	draw_number(max, 3, 1, x-100, y);
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
	if (!audio) return;
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
	if (!audio) return;
	shieldsound = audio.createOscillator();
	var lfo = audio.createOscillator();
	var gain = audio.createGainNode();
	var gain2 = audio.createGainNode();
	gain2.gain.value=.5;
	shieldsound.frequency.value = 440;
	shieldsound.connect(gain2);
	gain2.connect(audio.destination);

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

function spawn_tag(target, tag) {
	var scale=2;
	var spacing = 8*scale;
	var phi = Math.random()*Math.PI*2;
	var dy = -Math.cos(phi);
	var dx = Math.sin(phi);
	var x = target.x - tag.length/2*spacing - spacing/2;
	var y = target.y;
	var tag_v = 0;
	for (var i=0; i<tag.length; i++) {
		var c=tag[i];
		particles.push({
			x: x+spacing * i,
			y: y,
			vx: target.vx + dx * tag_v,
			vy: target.vy + dy * tag_v,
			phi: 0,
			vphi: 0,
			shape: font[c],
			strokeStyle: "lightblue",
			scale: scale,
			removeAfter: (lasttime+1000),
			onRemoved: function() {
			}
		});
	}
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
	for (i = dead.length-1; i >= 0; i--) {
		objects.splice(dead[i], 1);
	}
}

function process_keys(elapsed, ship) {
	if (game_state == state.playing) {
		if (!ship.dead) {
			process_keys_game(elapsed, ship);
		}
	} else {
		var keys_pressed=keyspressed();
		if (keys_pressed[keys.space]) {
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
		if (!ship.thrusting) {
			thrust_start(10000);
		}
		ship.thrusting=true;
		var dy = -Math.cos(ship.phi);
		var dx = Math.sin(ship.phi);
		ship.vy+=(dy*elapsed/5);
		ship.vx+=(dx*elapsed/5);
	} else {
		// "friction" in space isn't realistic, but the original did it, so...
		if (ship.thrusting) {
			thrust_stop();
		}
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
	var keys_pressed=keyspressed();
	if ((keys_pressed[keys.space] || held[keys.space]) && lasttime > bulletTime && num_bullets < max_bullets) {
		// spawn a bullet
		bulletTime = lasttime + (1000 * bullet_interval);
		num_bullets++;
		spawn_bullet(ship);
	}	
	if (keys_pressed[keys.o]) {
		show_outlines = !show_outlines;
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
				for (var i=0; i < hit.length; i++) {
					var rock = hit[i];
					var phi = Math.atan2(ship.x-rock.x, ship.y-rock.y);
					var vx = ship.vx;
					var vy = ship.vy;
					ship.vx = rock.vx;
					ship.vy = rock.vy;
					rock.vx=vx;
					rock.vy=vy;
				}
			}
			ship.shieldRemaining -= (elapsed/1000);
			if (ship.shieldRemaining <= 0) {
				ship.shielded = false;
				stop_shield();
			}
		} else {
			hit = hit_test(ship, rocks, true);
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
	for (var i=bullets.length-1; i >= 0; i--) {
		var bullet = bullets[i];
		hit = hit_test_point(bullet, rocks, true);
		if (hit) {
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
				score += 80/this.scale;
				check_score(score);
				num_rocks--;
				spawn_debris(this, "gray");
				spawn_tag(this, (80/this.scale).toString());
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

function check_score(score) {
	if (score %1000 == 0) {
		lives++;
		spawn_tag(myship, "1UP");
	}
}

function draw_title(framecount) {
	draw_text("Rocks!", 4, width/2, 100, "center");
	draw_text("An HTML5 Asteroids game", 2, width/2, 132, "center");
	if (framecount < 20 || framecount > 40) {
		draw_text("Press space to start", 2, width/2, 200, "center");
	}
	draw_text("Space bar fires", 2, width/2, 240, "center");
	draw_text("Left and Right arrows turn", 2, width/2, 270, "center");
	draw_text("Up arrow fires engines", 2, width/2, 300, "center");
	draw_text("Down arrow activates shield", 2, width/2, 330, "center");
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

var fps;
var framecount=0;
var lastreport=0;
var min_fps;
var max_fps;
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
	draw_frame_counter(fps, min_fps, max_fps);
	lasttime = timestamp;
	if (framecount++ > 60) {
		fps = framecount / ((timestamp-lastreport)/1000);
		if (!min_fps || min_fps > fps) {
			min_fps=fps;
		}
		if (!max_fps || max_fps < fps) {
			max_fps=fps;
		}
		lastreport = timestamp;
		framecount=0;
	}
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

function hit_test(needle, haystack, single) {
	var i;
	var targets=[];
	var needle_translated=object_to_world(needle);
	for (i=0; i < haystack.length; i++) {
		target = haystack[i];
		if (intersects(needle_translated, object_to_world(target))) {
			targets.push(target);
			if (single) {
				return target;
			}
		}
	}
	if (single) {
		return undefined;
	}
	return targets;
}

function hit_test_point(needle, haystack) {
	for (var i=0; i < haystack.length; i++) {
		target = haystack[i];
		if (point_in_poly(needle, object_to_world(target))) {
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
	if (myship.thrusting) {
		thrust_stop();
	}
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
		if (dx*dx + dy*dy < 5000) {
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

function death_blossom() {
	var max_bullets=32;
	for (var i=0; i < num_rocks; i++) {
		myship.phi=Math.PI*2*i/max_bullets;
		spawn_bullet(myship);
	}
}

var noise;
function thrust_start(samples) {
	if (!samples) {
		samples=1024;
	}
	var buf=audio.createBuffer(1, samples, audio.sampleRate);
	var a = buf.getChannelData(0);
	for (var i=0; i<a.length; i++) {
		a[i]=Math.random()*2-1;
	}
	var source=audio.createBufferSource();
	source.buffer=buf;
	source.loop=true;
	var f=audio.createBiquadFilter();
	source.connect(f);
	noise={n:source, f:f}
	f.connect(audio.destination);
	source.noteOn(0);
	return noise;
}

function thrust_stop() {
	noise.n.noteOff(0);
}

function make_tone() {
	var beep=audio.createOscillator();
	var volume=audio.createGainNode();
	volume.gain.value=0.5;
	beep.connect(volume);
	volume.connect(audio.destination);
	beep.noteOn(0);
	return {o: beep, v: volume};
}

// start animating
start_level(level);
myship.dead=true;
requestAnimationFrame(frame);
