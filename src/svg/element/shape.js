define([
	'core',
	'point',
	'boundingbox',
	'element/core'
], function(
	svg,
	Point,
	BoundingBox,
	Element
) {
	'use strict';

	var PathElementBase = Element.PathElementBase;

	// rect element
	var rect = function(node) {
		this.base = PathElementBase;
		this.base(node);

		this.path = function(ctx) {
			var x = this.attribute('x').toPixels('x');
			var y = this.attribute('y').toPixels('y');
			var width = this.attribute('width').toPixels('x');
			var height = this.attribute('height').toPixels('y');
			var rx = this.attribute('rx').toPixels('x');
			var ry = this.attribute('ry').toPixels('y');
			if (this.attribute('rx').hasValue() && !this.attribute('ry').hasValue()) ry = rx;
			if (this.attribute('ry').hasValue() && !this.attribute('rx').hasValue()) rx = ry;

			if (ctx != null) {
				ctx.beginPath();
				ctx.moveTo(x + rx, y);
				ctx.lineTo(x + width - rx, y);
				ctx.quadraticCurveTo(x + width, y, x + width, y + ry)
				ctx.lineTo(x + width, y + height - ry);
				ctx.quadraticCurveTo(x + width, y + height, x + width - rx, y + height)
				ctx.lineTo(x + rx, y + height);
				ctx.quadraticCurveTo(x, y + height, x, y + height - ry)
				ctx.lineTo(x, y + ry);
				ctx.quadraticCurveTo(x, y, x + rx, y)
				ctx.closePath();
			}

			return new BoundingBox(x, y, x + width, y + height);
		}
	}
	rect.prototype = new PathElementBase;


	// circle element
	var circle = function(node) {
		this.base = PathElementBase;
		this.base(node);

		this.path = function(ctx) {
			var cx = this.attribute('cx').toPixels('x');
			var cy = this.attribute('cy').toPixels('y');
			var r = this.attribute('r').toPixels();

			if (ctx != null) {
				ctx.beginPath();
				ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
				ctx.closePath();
			}

			return new BoundingBox(cx - r, cy - r, cx + r, cy + r);
		}
	}
	circle.prototype = new PathElementBase;

	// ellipse element
	var ellipse = function(node) {
		this.base = PathElementBase;
		this.base(node);

		this.path = function(ctx) {
			var KAPPA = 4 * ((Math.sqrt(2) - 1) / 3);
			var rx = this.attribute('rx').toPixels('x');
			var ry = this.attribute('ry').toPixels('y');
			var cx = this.attribute('cx').toPixels('x');
			var cy = this.attribute('cy').toPixels('y');

			if (ctx != null) {
				ctx.beginPath();
				ctx.moveTo(cx, cy - ry);
				ctx.bezierCurveTo(cx + (KAPPA * rx), cy - ry,  cx + rx, cy - (KAPPA * ry), cx + rx, cy);
				ctx.bezierCurveTo(cx + rx, cy + (KAPPA * ry), cx + (KAPPA * rx), cy + ry, cx, cy + ry);
				ctx.bezierCurveTo(cx - (KAPPA * rx), cy + ry, cx - rx, cy + (KAPPA * ry), cx - rx, cy);
				ctx.bezierCurveTo(cx - rx, cy - (KAPPA * ry), cx - (KAPPA * rx), cy - ry, cx, cy - ry);
				ctx.closePath();
			}

			return new BoundingBox(cx - rx, cy - ry, cx + rx, cy + ry);
		}
	}
	ellipse.prototype = new PathElementBase;

	// line element
	line = function(node) {
		this.base = PathElementBase;
		this.base(node);

		this.getPoints = function() {
			return [
				new Point(this.attribute('x1').toPixels('x'), this.attribute('y1').toPixels('y')),
				new Point(this.attribute('x2').toPixels('x'), this.attribute('y2').toPixels('y'))];
		}

		this.path = function(ctx) {
			var points = this.getPoints();

			if (ctx != null) {
				ctx.beginPath();
				ctx.moveTo(points[0].x, points[0].y);
				ctx.lineTo(points[1].x, points[1].y);
			}

			return new BoundingBox(points[0].x, points[0].y, points[1].x, points[1].y);
		}

		this.getMarkers = function() {
			var points = this.getPoints();
			var a = points[0].angleTo(points[1]);
			return [[points[0], a], [points[1], a]];
		}
	}
	line.prototype = new PathElementBase;

	// polyline element
	polyline = function(node) {
		this.base = PathElementBase;
		this.base(node);

		this.points = svg.CreatePath(this.attribute('points').value);
		this.path = function(ctx) {
			var bb = new BoundingBox(this.points[0].x, this.points[0].y);
			if (ctx != null) {
				ctx.beginPath();
				ctx.moveTo(this.points[0].x, this.points[0].y);
			}
			for (var i=1; i<this.points.length; i++) {
				bb.addPoint(this.points[i].x, this.points[i].y);
				if (ctx != null) ctx.lineTo(this.points[i].x, this.points[i].y);
			}
			return bb;
		}

		this.getMarkers = function() {
			var markers = [];
			for (var i=0; i<this.points.length - 1; i++) {
				markers.push([this.points[i], this.points[i].angleTo(this.points[i+1])]);
			}
			markers.push([this.points[this.points.length-1], markers[markers.length-1][1]]);
			return markers;
		}
	}
	polyline.prototype = new PathElementBase;

	// polygon element
	polygon = function(node) {
		this.base = polyline;
		this.base(node);

		this.basePath = this.path;
		this.path = function(ctx) {
			var bb = this.basePath(ctx);
			if (ctx != null) {
				ctx.lineTo(this.points[0].x, this.points[0].y);
				ctx.closePath();
			}
			return bb;
		}
	}
	polygon.prototype = new polyline;

	Element.rect = rect;
	Element.circle = circle;
	Element.ellipse = ellipse;
	Element.line = line;
	Element.polyline = polyline;
	Element.polygon = polygon;

	return Element;

});
