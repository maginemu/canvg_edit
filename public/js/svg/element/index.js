define([
	'core',
	'property',
	'point',
	'boundingbox',
	'aspectratio',
	'element/core',
	'element/shape',
	'element/gradient',
	'element/filter',
	'element/text',
	'element/animate'
], funciton(
	svg,
	Property,
	Point,
	AspectRatio,
	Element,
	shape,
	gradient,
	filter,
	text,
	animate
) {
	'use strict';

	// svg element
	Element.svg = function(node) {
		this.base = svg.Element.RenderedElementBase;
		this.base(node);

		this.baseClearContext = this.clearContext;
		this.clearContext = function(ctx) {
			this.baseClearContext(ctx);
			svg.ViewPort.RemoveCurrent();
		}

		this.baseSetContext = this.setContext;
		this.setContext = function(ctx) {
			// initial values
			ctx.strokeStyle = 'rgba(0,0,0,0)';
			ctx.lineCap = 'butt';
			ctx.lineJoin = 'miter';
			ctx.miterLimit = 4;

			this.baseSetContext(ctx);

			// create new view port
			if (!this.attribute('x').hasValue()) this.attribute('x', true).value = 0;
			if (!this.attribute('y').hasValue()) this.attribute('y', true).value = 0;
			ctx.translate(this.attribute('x').toPixels('x'), this.attribute('y').toPixels('y'));

			var width = svg.ViewPort.width();
			var height = svg.ViewPort.height();

			if (!this.attribute('width').hasValue()) this.attribute('width', true).value = '100%';
			if (!this.attribute('height').hasValue()) this.attribute('height', true).value = '100%';
			if (typeof(this.root) == 'undefined') {
				width = this.attribute('width').toPixels('x');
				height = this.attribute('height').toPixels('y');

				var x = 0;
				var y = 0;
				if (this.attribute('refX').hasValue() && this.attribute('refY').hasValue()) {
					x = -this.attribute('refX').toPixels('x');
					y = -this.attribute('refY').toPixels('y');
				}

				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(width, y);
				ctx.lineTo(width, height);
				ctx.lineTo(x, height);
				ctx.closePath();
				ctx.clip();
			}
			svg.ViewPort.SetCurrent(width, height);

			// viewbox
			if (this.attribute('viewBox').hasValue()) {
				var viewBox = svg.ToNumberArray(this.attribute('viewBox').value);
				var minX = viewBox[0];
				var minY = viewBox[1];
				width = viewBox[2];
				height = viewBox[3];

				svg.AspectRatio(ctx,
								this.attribute('preserveAspectRatio').value,
								svg.ViewPort.width(),
								width,
								svg.ViewPort.height(),
								height,
								minX,
								minY,
								this.attribute('refX').value,
								this.attribute('refY').value);

				svg.ViewPort.RemoveCurrent();
				svg.ViewPort.SetCurrent(viewBox[2], viewBox[3]);
			}
		}
	}
	Element.svg.prototype = new RenderedElementBase;



	// path element
	path = function(node) {
		this.base = PathElementBase;
		this.base(node);

		var d = this.attribute('d').value;
		// TODO: convert to real lexer based on http://www.w3.org/TR/SVG11/paths.html#PathDataBNF
		d = d.replace(/,/gm,' '); // get rid of all commas
		d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([MmZzLlHhVvCcSsQqTtAa])/gm,'$1 $2'); // separate commands from commands
		d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([MmZzLlHhVvCcSsQqTtAa])/gm,'$1 $2'); // separate commands from commands
		d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([^\s])/gm,'$1 $2'); // separate commands from points
		d = d.replace(/([^\s])([MmZzLlHhVvCcSsQqTtAa])/gm,'$1 $2'); // separate commands from points
		d = d.replace(/([0-9])([+\-])/gm,'$1 $2'); // separate digits when no comma
		d = d.replace(/(\.[0-9]*)(\.)/gm,'$1 $2'); // separate digits when no comma
		d = d.replace(/([Aa](\s+[0-9]+){3})\s+([01])\s*([01])/gm,'$1 $3 $4 '); // shorthand elliptical arc path syntax
		d = svg.compressSpaces(d); // compress multiple spaces
		d = svg.trim(d);
		this.PathParser = new (function(d) {
			this.tokens = d.split(' ');

			this.reset = function() {
				this.i = -1;
				this.command = '';
				this.previousCommand = '';
				this.start = new Point(0, 0);
				this.control = new Point(0, 0);
				this.current = new Point(0, 0);
				this.points = [];
				this.angles = [];
			}

			this.isEnd = function() {
				return this.i >= this.tokens.length - 1;
			}

			this.isCommandOrEnd = function() {
				if (this.isEnd()) return true;
				return this.tokens[this.i + 1].match(/^[A-Za-z]$/) != null;
			}

			this.isRelativeCommand = function() {
				switch(this.command)
				{
				case 'm':
				case 'l':
				case 'h':
				case 'v':
				case 'c':
				case 's':
				case 'q':
				case 't':
				case 'a':
				case 'z':
					return true;
					break;
				}
				return false;
			}

			this.getToken = function() {
				this.i++;
				return this.tokens[this.i];
			}

			this.getScalar = function() {
				return parseFloat(this.getToken());
			}

			this.nextCommand = function() {
				this.previousCommand = this.command;
				this.command = this.getToken();
			}

			this.getPoint = function() {
				var p = new Point(this.getScalar(), this.getScalar());
				return this.makeAbsolute(p);
			}

			this.getAsControlPoint = function() {
				var p = this.getPoint();
				this.control = p;
				return p;
			}

			this.getAsCurrentPoint = function() {
				var p = this.getPoint();
				this.current = p;
				return p;
			}

			this.getReflectedControlPoint = function() {
				if (this.previousCommand.toLowerCase() != 'c' && this.previousCommand.toLowerCase() != 's') {
					return this.current;
				}

				// reflect point
				var p = new Point(2 * this.current.x - this.control.x, 2 * this.current.y - this.control.y);
				return p;
			}

			this.makeAbsolute = function(p) {
				if (this.isRelativeCommand()) {
					p.x += this.current.x;
					p.y += this.current.y;
				}
				return p;
			}

			this.addMarker = function(p, from, priorTo) {
				// if the last angle isn't filled in because we didn't have this point yet ...
				if (priorTo != null && this.angles.length > 0 && this.angles[this.angles.length-1] == null) {
					this.angles[this.angles.length-1] = this.points[this.points.length-1].angleTo(priorTo);
				}
				this.addMarkerAngle(p, from == null ? null : from.angleTo(p));
			}

			this.addMarkerAngle = function(p, a) {
				this.points.push(p);
				this.angles.push(a);
			}

			this.getMarkerPoints = function() { return this.points; }
			this.getMarkerAngles = function() {
				for (var i=0; i<this.angles.length; i++) {
					if (this.angles[i] == null) {
						for (var j=i+1; j<this.angles.length; j++) {
							if (this.angles[j] != null) {
								this.angles[i] = this.angles[j];
								break;
							}
						}
					}
				}
				return this.angles;
			}
		})(d);

		this.path = function(ctx) {
			var pp = this.PathParser;
			pp.reset();

			var bb = new BoundingBox();
			if (ctx != null) ctx.beginPath();
			while (!pp.isEnd()) {
				pp.nextCommand();
				switch (pp.command) {
				case 'M':
				case 'm':
					var p = pp.getAsCurrentPoint();
					pp.addMarker(p);
					bb.addPoint(p.x, p.y);
					if (ctx != null) ctx.moveTo(p.x, p.y);
					pp.start = pp.current;
					while (!pp.isCommandOrEnd()) {
						var p = pp.getAsCurrentPoint();
						pp.addMarker(p, pp.start);
						bb.addPoint(p.x, p.y);
						if (ctx != null) ctx.lineTo(p.x, p.y);
					}
					break;
				case 'L':
				case 'l':
					while (!pp.isCommandOrEnd()) {
						var c = pp.current;
						var p = pp.getAsCurrentPoint();
						pp.addMarker(p, c);
						bb.addPoint(p.x, p.y);
						if (ctx != null) ctx.lineTo(p.x, p.y);
					}
					break;
				case 'H':
				case 'h':
					while (!pp.isCommandOrEnd()) {
						var newP = new Point((pp.isRelativeCommand() ? pp.current.x : 0) + pp.getScalar(), pp.current.y);
						pp.addMarker(newP, pp.current);
						pp.current = newP;
						bb.addPoint(pp.current.x, pp.current.y);
						if (ctx != null) ctx.lineTo(pp.current.x, pp.current.y);
					}
					break;
				case 'V':
				case 'v':
					while (!pp.isCommandOrEnd()) {
						var newP = new Point(pp.current.x, (pp.isRelativeCommand() ? pp.current.y : 0) + pp.getScalar());
						pp.addMarker(newP, pp.current);
						pp.current = newP;
						bb.addPoint(pp.current.x, pp.current.y);
						if (ctx != null) ctx.lineTo(pp.current.x, pp.current.y);
					}
					break;
				case 'C':
				case 'c':
					while (!pp.isCommandOrEnd()) {
						var curr = pp.current;
						var p1 = pp.getPoint();
						var cntrl = pp.getAsControlPoint();
						var cp = pp.getAsCurrentPoint();
						pp.addMarker(cp, cntrl, p1);
						bb.addBezierCurve(curr.x, curr.y, p1.x, p1.y, cntrl.x, cntrl.y, cp.x, cp.y);
						if (ctx != null) ctx.bezierCurveTo(p1.x, p1.y, cntrl.x, cntrl.y, cp.x, cp.y);
					}
					break;
				case 'S':
				case 's':
					while (!pp.isCommandOrEnd()) {
						var curr = pp.current;
						var p1 = pp.getReflectedControlPoint();
						var cntrl = pp.getAsControlPoint();
						var cp = pp.getAsCurrentPoint();
						pp.addMarker(cp, cntrl, p1);
						bb.addBezierCurve(curr.x, curr.y, p1.x, p1.y, cntrl.x, cntrl.y, cp.x, cp.y);
						if (ctx != null) ctx.bezierCurveTo(p1.x, p1.y, cntrl.x, cntrl.y, cp.x, cp.y);
					}
					break;
				case 'Q':
				case 'q':
					while (!pp.isCommandOrEnd()) {
						var curr = pp.current;
						var cntrl = pp.getAsControlPoint();
						var cp = pp.getAsCurrentPoint();
						pp.addMarker(cp, cntrl, cntrl);
						bb.addQuadraticCurve(curr.x, curr.y, cntrl.x, cntrl.y, cp.x, cp.y);
						if (ctx != null) ctx.quadraticCurveTo(cntrl.x, cntrl.y, cp.x, cp.y);
					}
					break;
				case 'T':
				case 't':
					while (!pp.isCommandOrEnd()) {
						var curr = pp.current;
						var cntrl = pp.getReflectedControlPoint();
						pp.control = cntrl;
						var cp = pp.getAsCurrentPoint();
						pp.addMarker(cp, cntrl, cntrl);
						bb.addQuadraticCurve(curr.x, curr.y, cntrl.x, cntrl.y, cp.x, cp.y);
						if (ctx != null) ctx.quadraticCurveTo(cntrl.x, cntrl.y, cp.x, cp.y);
					}
					break;
				case 'A':
				case 'a':
					while (!pp.isCommandOrEnd()) {
						var curr = pp.current;
						var rx = pp.getScalar();
						var ry = pp.getScalar();
						var xAxisRotation = pp.getScalar() * (Math.PI / 180.0);
						var largeArcFlag = pp.getScalar();
						var sweepFlag = pp.getScalar();
						var cp = pp.getAsCurrentPoint();

						// Conversion from endpoint to center parameterization
						// http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
						// x1', y1'
						var currp = new Point(
							Math.cos(xAxisRotation) * (curr.x - cp.x) / 2.0 + Math.sin(xAxisRotation) * (curr.y - cp.y) / 2.0,
								-Math.sin(xAxisRotation) * (curr.x - cp.x) / 2.0 + Math.cos(xAxisRotation) * (curr.y - cp.y) / 2.0
						);
						// adjust radii
						var l = Math.pow(currp.x,2)/Math.pow(rx,2)+Math.pow(currp.y,2)/Math.pow(ry,2);
						if (l > 1) {
							rx *= Math.sqrt(l);
							ry *= Math.sqrt(l);
						}
						// cx', cy'
						var s = (largeArcFlag == sweepFlag ? -1 : 1) * Math.sqrt(
							((Math.pow(rx,2)*Math.pow(ry,2))-(Math.pow(rx,2)*Math.pow(currp.y,2))-(Math.pow(ry,2)*Math.pow(currp.x,2))) /
								(Math.pow(rx,2)*Math.pow(currp.y,2)+Math.pow(ry,2)*Math.pow(currp.x,2))
						);
						if (isNaN(s)) s = 0;
						var cpp = new Point(s * rx * currp.y / ry, s * -ry * currp.x / rx);
						// cx, cy
						var centp = new Point(
							(curr.x + cp.x) / 2.0 + Math.cos(xAxisRotation) * cpp.x - Math.sin(xAxisRotation) * cpp.y,
							(curr.y + cp.y) / 2.0 + Math.sin(xAxisRotation) * cpp.x + Math.cos(xAxisRotation) * cpp.y
						);
						// vector magnitude
						var m = function(v) { return Math.sqrt(Math.pow(v[0],2) + Math.pow(v[1],2)); }
						// ratio between two vectors
						var r = function(u, v) { return (u[0]*v[0]+u[1]*v[1]) / (m(u)*m(v)) }
						// angle between two vectors
						var a = function(u, v) { return (u[0]*v[1] < u[1]*v[0] ? -1 : 1) * Math.acos(r(u,v)); }
						// initial angle
						var a1 = a([1,0], [(currp.x-cpp.x)/rx,(currp.y-cpp.y)/ry]);
						// angle delta
						var u = [(currp.x-cpp.x)/rx,(currp.y-cpp.y)/ry];
						var v = [(-currp.x-cpp.x)/rx,(-currp.y-cpp.y)/ry];
						var ad = a(u, v);
						if (r(u,v) <= -1) ad = Math.PI;
						if (r(u,v) >= 1) ad = 0;

						if (sweepFlag == 0 && ad > 0) ad = ad - 2 * Math.PI;
						if (sweepFlag == 1 && ad < 0) ad = ad + 2 * Math.PI;

						// for markers
						var halfWay = new Point(
							centp.x + rx * Math.cos((a1 + (a1 + ad)) / 2),
							centp.y + ry * Math.sin((a1 + (a1 + ad)) / 2)
						);
						pp.addMarkerAngle(halfWay, (a1 + (a1 + ad)) / 2 + (sweepFlag == 0 ? -1 : 1) * Math.PI / 2);
						pp.addMarkerAngle(cp, (a1 + ad) + (sweepFlag == 0 ? -1 : 1) * Math.PI / 2);

						bb.addPoint(cp.x, cp.y); // TODO: this is too naive, make it better
						if (ctx != null) {
							var r = rx > ry ? rx : ry;
							var sx = rx > ry ? 1 : rx / ry;
							var sy = rx > ry ? ry / rx : 1;

							ctx.translate(centp.x, centp.y);
							ctx.rotate(xAxisRotation);
							ctx.scale(sx, sy);
							ctx.arc(0, 0, r, a1, a1 + ad, 1 - sweepFlag);
							ctx.scale(1/sx, 1/sy);
							ctx.rotate(-xAxisRotation);
							ctx.translate(-centp.x, -centp.y);
						}
					}
					break;
				case 'Z':
				case 'z':
					if (ctx != null) ctx.closePath();
					pp.current = pp.start;
				}
			}

			return bb;
		}

		this.getMarkers = function() {
			var points = this.PathParser.getMarkerPoints();
			var angles = this.PathParser.getMarkerAngles();

			var markers = [];
			for (var i=0; i<points.length; i++) {
				markers.push([points[i], angles[i]]);
			}
			return markers;
		}
	}
	path.prototype = new PathElementBase;

	// pattern element
	pattern = function(node) {
		this.base = ElementBase;
		this.base(node);

		this.createPattern = function(ctx, element) {
			// render me using a temporary svg element
			var tempSvg = new Element.svg();
			tempSvg.attributes['viewBox'] = new Property('viewBox', this.attribute('viewBox').value);
			tempSvg.attributes['x'] = new Property('x', this.attribute('x').value);
			tempSvg.attributes['y'] = new Property('y', this.attribute('y').value);
			tempSvg.attributes['width'] = new Property('width', this.attribute('width').value);
			tempSvg.attributes['height'] = new Property('height', this.attribute('height').value);
			tempSvg.children = this.children;

			var c = document.createElement('canvas');
			document.body.appendChild(c);
			c.width = this.attribute('width').toPixels('x') + this.attribute('x').toPixels('x');
			c.height = this.attribute('height').toPixels('y')  + this.attribute('y').toPixels('y');
			tempSvg.render(c.getContext('2d'));
			return ctx.createPattern(c, 'repeat');
		}
	}
	pattern.prototype = new ElementBase;

	// marker element
	marker = function(node) {
		this.base = ElementBase;
		this.base(node);

		this.baseRender = this.render;
		this.render = function(ctx, point, angle) {
			ctx.translate(point.x, point.y);
			if (this.attribute('orient').valueOrDefault('auto') == 'auto') ctx.rotate(angle);
			if (this.attribute('markerUnits').valueOrDefault('strokeWidth') == 'strokeWidth') ctx.scale(ctx.lineWidth, ctx.lineWidth);
			ctx.save();

			// render me using a temporary svg element
			var tempSvg = new svg.Element.svg();
			tempSvg.attributes['viewBox'] = new svg.Property('viewBox', this.attribute('viewBox').value);
			tempSvg.attributes['refX'] = new svg.Property('refX', this.attribute('refX').value);
			tempSvg.attributes['refY'] = new svg.Property('refY', this.attribute('refY').value);
			tempSvg.attributes['width'] = new svg.Property('width', this.attribute('markerWidth').value);
			tempSvg.attributes['height'] = new svg.Property('height', this.attribute('markerHeight').value);
			tempSvg.attributes['fill'] = new svg.Property('fill', this.attribute('fill').valueOrDefault('black'));
			tempSvg.attributes['stroke'] = new svg.Property('stroke', this.attribute('stroke').valueOrDefault('none'));
			tempSvg.children = this.children;
			tempSvg.render(ctx);

			ctx.restore();
			if (this.attribute('markerUnits').valueOrDefault('strokeWidth') == 'strokeWidth') ctx.scale(1/ctx.lineWidth, 1/ctx.lineWidth);
			if (this.attribute('orient').valueOrDefault('auto') == 'auto') ctx.rotate(-angle);
			ctx.translate(-point.x, -point.y);
		}
	}
	marker.prototype = new ElementBase;

	// definitions element
	var defs = function(node) {
		this.base = ElementBase;
		this.base(node);

		this.render = function(ctx) {
			// NOOP
		}
	}
	defs.prototype = new ElementBase;



		// font element
		svg.Element.font = function(node) {
			this.base = svg.Element.ElementBase;
			this.base(node);

			this.horizAdvX = this.attribute('horiz-adv-x').numValue();

			this.isRTL = false;
			this.isArabic = false;
			this.fontFace = null;
			this.missingGlyph = null;
			this.glyphs = [];
			for (var i=0; i<this.children.length; i++) {
				var child = this.children[i];
				if (child.type == 'font-face') {
					this.fontFace = child;
					if (child.style('font-family').hasValue()) {
						svg.Definitions[child.style('font-family').value] = this;
					}
				}
				else if (child.type == 'missing-glyph') this.missingGlyph = child;
				else if (child.type == 'glyph') {
					if (child.arabicForm != '') {
						this.isRTL = true;
						this.isArabic = true;
						if (typeof(this.glyphs[child.unicode]) == 'undefined') this.glyphs[child.unicode] = [];
						this.glyphs[child.unicode][child.arabicForm] = child;
					}
					else {
						this.glyphs[child.unicode] = child;
					}
				}
			}
		}
		svg.Element.font.prototype = new svg.Element.ElementBase;

		// font-face element
		svg.Element.fontface = function(node) {
			this.base = svg.Element.ElementBase;
			this.base(node);

			this.ascent = this.attribute('ascent').value;
			this.descent = this.attribute('descent').value;
			this.unitsPerEm = this.attribute('units-per-em').numValue();
		}
		svg.Element.fontface.prototype = new svg.Element.ElementBase;

		// missing-glyph element
		svg.Element.missingglyph = function(node) {
			this.base = svg.Element.path;
			this.base(node);

			this.horizAdvX = 0;
		}
		svg.Element.missingglyph.prototype = new svg.Element.path;

		// glyph element
		svg.Element.glyph = function(node) {
			this.base = svg.Element.path;
			this.base(node);

			this.horizAdvX = this.attribute('horiz-adv-x').numValue();
			this.unicode = this.attribute('unicode').value;
			this.arabicForm = this.attribute('arabic-form').value;
		}
		svg.Element.glyph.prototype = new svg.Element.path;


		// image element
		svg.Element.image = function(node) {
			this.base = svg.Element.RenderedElementBase;
			this.base(node);

			var href = this.attribute('xlink:href').value;
			var isSvg = href.match(/\.svg$/);

			svg.Images.push(this);
			this.loaded = false;
			if (!isSvg) {
				this.img = document.createElement('img');
				var self = this;
				this.img.onload = function() { self.loaded = true; }
				this.img.onerror = function() { if (console) console.log('ERROR: image "' + href + '" not found'); self.loaded = true; }
				this.img.src = href;
			}
			else {
				this.img = svg.ajax(href);
				this.loaded = true;
			}


			this.renderChildren = function(ctx) {
				var x = this.attribute('x').toPixels('x');
				var y = this.attribute('y').toPixels('y');

				var width = this.attribute('width').toPixels('x');
				var height = this.attribute('height').toPixels('y');
				if (width == 0 || height == 0) return;

				ctx.save();
				if (isSvg) {
					ctx.drawSvg(this.img, x, y, width, height);
				}
				else {
					ctx.translate(x, y);
					svg.AspectRatio(ctx,
									this.attribute('preserveAspectRatio').value,
									width,
									this.img.width,
									height,
									this.img.height,
									0,
									0);
					ctx.drawImage(this.img, 0, 0);
				}
				ctx.restore();
			}

			this.getBoundingBox = function () {
				var x = this.attribute('x').toPixels('x');
				var y = this.attribute('y').toPixels('y');

				var width = this.attribute('width').toPixels('x');
				var height = this.attribute('height').toPixels('y');

				return new svg.BoundingBox(x, y, x + width, y + height);
			};
		}
		svg.Element.image.prototype = new svg.Element.RenderedElementBase;

		// group element
		svg.Element.g = function(node) {
			this.base = svg.Element.RenderedElementBase;
			this.base(node);

			this.getBoundingBox = function() {
				var bb = new svg.BoundingBox();
				for (var i=0; i<this.children.length; i++) {
					bb.addBoundingBox(this.children[i].getBoundingBox());
				}
				return bb;
			};
		}
		svg.Element.g.prototype = new svg.Element.RenderedElementBase;

		// symbol element
		svg.Element.symbol = function(node) {
			this.base = svg.Element.RenderedElementBase;
			this.base(node);

			this.baseSetContext = this.setContext;
			this.setContext = function(ctx) {
				this.baseSetContext(ctx);

				// viewbox
				if (this.attribute('viewBox').hasValue()) {
					var viewBox = svg.ToNumberArray(this.attribute('viewBox').value);
					var minX = viewBox[0];
					var minY = viewBox[1];
					width = viewBox[2];
					height = viewBox[3];

					svg.AspectRatio(ctx,
									this.attribute('preserveAspectRatio').value,
									this.attribute('width').toPixels('x'),
									width,
									this.attribute('height').toPixels('y'),
									height,
									minX,
									minY);

					svg.ViewPort.SetCurrent(viewBox[2], viewBox[3]);
				}
			}
		}
		svg.Element.symbol.prototype = new svg.Element.RenderedElementBase;

		// style element
		svg.Element.style = function(node) {
			this.base = svg.Element.ElementBase;
			this.base(node);

			// text, or spaces then CDATA
			var css = node.childNodes[0].nodeValue + (node.childNodes.length > 1 ? node.childNodes[1].nodeValue : '');
			css = css.replace(/(\/\*([^*]|[\r\n]|(\*+([^*\/]|[\r\n])))*\*+\/)|(^[\s]*\/\/.*)/gm, ''); // remove comments
			css = svg.compressSpaces(css); // replace whitespace
			var cssDefs = css.split('}');
			for (var i=0; i<cssDefs.length; i++) {
				if (svg.trim(cssDefs[i]) != '') {
					var cssDef = cssDefs[i].split('{');
					var cssClasses = cssDef[0].split(',');
					var cssProps = cssDef[1].split(';');
					for (var j=0; j<cssClasses.length; j++) {
						var cssClass = svg.trim(cssClasses[j]);
						if (cssClass != '') {
							var props = {};
							for (var k=0; k<cssProps.length; k++) {
								var prop = cssProps[k].indexOf(':');
								var name = cssProps[k].substr(0, prop);
								var value = cssProps[k].substr(prop + 1, cssProps[k].length - prop);
								if (name != null && value != null) {
									props[svg.trim(name)] = new svg.Property(svg.trim(name), svg.trim(value));
								}
							}
							svg.Styles[cssClass] = props;
							if (cssClass == '@font-face') {
								var fontFamily = props['font-family'].value.replace(/"/g,'');
								var srcs = props['src'].value.split(',');
								for (var s=0; s<srcs.length; s++) {
									if (srcs[s].indexOf('format("svg")') > 0) {
										var urlStart = srcs[s].indexOf('url');
										var urlEnd = srcs[s].indexOf(')', urlStart);
										var url = srcs[s].substr(urlStart + 5, urlEnd - urlStart - 6);
										var doc = svg.parseXml(svg.ajax(url));
										var fonts = doc.getElementsByTagName('font');
										for (var f=0; f<fonts.length; f++) {
											var font = svg.CreateElement(fonts[f]);
											svg.Definitions[fontFamily] = font;
										}
									}
								}
							}
						}
					}
				}
			}
		}
		svg.Element.style.prototype = new svg.Element.ElementBase;

		// use element
		svg.Element.use = function(node) {
			this.base = svg.Element.RenderedElementBase;
			this.base(node);

			this.baseSetContext = this.setContext;
			this.setContext = function(ctx) {
				this.baseSetContext(ctx);
				if (this.attribute('x').hasValue()) ctx.translate(this.attribute('x').toPixels('x'), 0);
				if (this.attribute('y').hasValue()) ctx.translate(0, this.attribute('y').toPixels('y'));
			}

			this.getDefinition = function() {
				var element = this.attribute('xlink:href').getDefinition();
				if (this.attribute('width').hasValue()) element.attribute('width', true).value = this.attribute('width').value;
				if (this.attribute('height').hasValue()) element.attribute('height', true).value = this.attribute('height').value;
				return element;
			}

			this.path = function(ctx) {
				var element = this.getDefinition();
				if (element != null) element.path(ctx);
			}

			this.renderChildren = function(ctx) {
				var element = this.getDefinition();
				if (element != null) {
					// temporarily detach from parent and render
					var oldParent = element.parent;
					element.parent = null;
					element.render(ctx);
					element.parent = oldParent;
				}
			}
		}
		svg.Element.use.prototype = new svg.Element.RenderedElementBase;

		// mask element
		svg.Element.mask = function(node) {
			this.base = svg.Element.ElementBase;
			this.base(node);

			this.apply = function(ctx, element) {
				// render as temp svg
				var x = this.attribute('x').toPixels('x');
				var y = this.attribute('y').toPixels('y');
				var width = this.attribute('width').toPixels('x');
				var height = this.attribute('height').toPixels('y');

				// temporarily remove mask to avoid recursion
				var mask = element.attribute('mask').value;
				element.attribute('mask').value = '';

					var cMask = document.createElement('canvas');
					cMask.width = x + width;
					cMask.height = y + height;
					var maskCtx = cMask.getContext('2d');
					this.renderChildren(maskCtx);

					var c = document.createElement('canvas');
					c.width = x + width;
					c.height = y + height;
					var tempCtx = c.getContext('2d');
					element.render(tempCtx);
					tempCtx.globalCompositeOperation = 'destination-in';
					tempCtx.fillStyle = maskCtx.createPattern(cMask, 'no-repeat');
					tempCtx.fillRect(0, 0, x + width, y + height);

					ctx.fillStyle = tempCtx.createPattern(c, 'no-repeat');
					ctx.fillRect(0, 0, x + width, y + height);

				// reassign mask
				element.attribute('mask').value = mask;
			}

			this.render = function(ctx) {
				// NO RENDER
			}
		}
		svg.Element.mask.prototype = new svg.Element.ElementBase;

		// clip element
		svg.Element.clipPath = function(node) {
			this.base = svg.Element.ElementBase;
			this.base(node);

			this.apply = function(ctx) {
				for (var i=0; i<this.children.length; i++) {
					if (this.children[i].path) {
						this.children[i].path(ctx);
						ctx.clip();
					}
				}
			}

			this.render = function(ctx) {
				// NO RENDER
			}
		}
		svg.Element.clipPath.prototype = new svg.Element.ElementBase;


		// title element, do nothing
		svg.Element.title = function(node) {
		}
		svg.Element.title.prototype = new svg.Element.ElementBase;

		// desc element, do nothing
		svg.Element.desc = function(node) {
		}
		svg.Element.desc.prototype = new svg.Element.ElementBase;

	Element.path = path;
	Element.pattern = pattern;
	Element.marker = marker;
	Element.defs = defs;

	svg.Element = Element;

	return Element;
});
