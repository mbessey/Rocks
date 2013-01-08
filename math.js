function object_to_world(o) {
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
        var nx = o.x + (x * cp - y * sp) * o.scale;
        var ny = o.y + (x * sp + y * cp) * o.scale;
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
