define(['svg/core'], function(svg) {


	var atan2 = Math.atan2;

	var Point = function(x, y) {
		this.x = x;
		this.y = y;
	}

	Point.prototype.angleTo = function(p) {
		return atan2(p.y - this.y, p.x - this.x);
	}

	Point.prototype.applyTransform = function(v) {
		var xp = this.x * v[0] + this.y * v[2] + v[4];
		var yp = this.x * v[1] + this.y * v[3] + v[5];
		this.x = xp;
		this.y = yp;
	}



	// points and paths
	var ToNumberArray = function(s) {
		var a = svg.trim(svg.compressSpaces((s || '').replace(/,/g, ' '))).split(' ');
		for (var i=0; i<a.length; i++) {
			a[i] = parseFloat(a[i]);
		}
		return a;
	}

	var CreatePoint = function(s) {
		var a = ToNumberArray(s);
		return new Point(a[0], a[1]);
	}

	var CreatePath = function(s) {
		var a = ToNumberArray(s);
		var path = [];
		for (var i=0; i<a.length; i+=2) {
			path.push(new Point(a[i], a[i+1]));
		}
		return path;
	}

	svg.ToNumberArray = ToNumberArray;
	svg.CreatePoint = CreatePoint;
	svg.CreatePath = CreatePath;
	svg.Point = Point;

	return Point;
});
