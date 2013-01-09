
//TODO: Figure out why this is off by a smidge when compared to canvas context.translate/context.rotate
function object_to_world(o) {
	var fudge=0.5;
    var points = [];
    var cp = Math.cos(o.phi);
    var sp = Math.sin(o.phi);
    var shape = o.shape;
    for (var i = 0; i < shape.length; i++) {
        var point = shape[i];
        var x = point[0];
        var y = point[1];
        if (x === undefined) {
            break;
        }
        var nx = o.x + (x * cp - y * sp) * (o.scale+fudge);
        var ny = o.y + (x * sp + y * cp) * (o.scale+fudge);
        points.push([nx, ny]);
    }
    return points;
}

function intersects(poly1, poly2) {
	for (var i=0; i< poly1.length-1; i++) {
		var p1 = poly1[i];
		var p2 = poly1[i+1];
		for (var j=0; j < poly2.length-1; j++) {
			var p3 = poly2[j];
			var p4 = poly2[j+1];
			if (getLineIntersection(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1], p4[0], p4[1])) {
				return true;
			}
		}
	}
	return false;	
}

function getLineIntersection(p0_x, p0_y, p1_x, p1_y, p2_x, p2_y, p3_x, p3_y) {
    var s1_x,
    s1_y,
    s2_x,
    s2_y;
    s1_x = p1_x - p0_x;
    s1_y = p1_y - p0_y;
    s2_x = p3_x - p2_x;
    s2_y = p3_y - p2_y;
    var s,
    t;
    s = ( - s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / ( - s2_x * s1_y + s1_x * s2_y);
    t = (s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / ( - s2_x * s1_y + s1_x * s2_y);
    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
        // Collision detected
        var intX = p0_x + (t * s1_x);
        var intY = p0_y + (t * s1_y);
        return [intX, intY];
    }
    return null;
    // No collision 
}

function quadrant(x, y) {
	if (x>0 && y<=0) {
		return 1;
	}
	if (x>0 && y>0) {
		return 2;
	}
	if (x<=0 && y>0) {
		return 3;
	}
	if (x<=0 && y<=0) {
		return 4;
	}
}

// point-inside polygon test, winding-count
function point_in_poly(point, poly) {
	var count=0;
	var p = poly[0];
	var dx = p[0] - point.x;
	var dy = p[1] - point.y;
	var last_q = quadrant(dx, dy);
	//console.log("dx, dy, q"+dx+", "+dy+", "+last_q);
	for (var i=1; i< poly.length; i++) {
		p = poly[i];
		dx = p[0] - point.x;
		dy = p[1] - point.y;
		var q = quadrant(dx, dy);
		//console.log("dx, dy, q"+dx+", "+dy+", "+q);
		var d=(q-last_q);
		if (d==-3) {
			d=1;
		} else if (d==3) {
			d=-1;
		}
		//console.log(d);
		count += d;
		last_q=q;
	}
	//console.log(count);
	return (count==4);
}

function point_inside_test_unit(p) {
	if (!p) {
		p={x:0, y:0};
	}
	var poly=[
		[-1, -1], [1, -1], [1, 1], [-1, 1],[-1, -1]
	];
	console.log(point_inside(p, poly));
}