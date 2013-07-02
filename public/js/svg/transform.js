define(['svg/core', 'svg/point'], function(svg, Point) {

	// transforms
	var Transform = function(v) {
		var that = this;
		this.Type = {}

		// translate
		this.Type.translate = function(s) {
			this.p = svg.CreatePoint(s);
			this.apply = function(ctx) {
				ctx.translate(this.p.x || 0.0, this.p.y || 0.0);
			}
			this.applyToPoint = function(p) {
				p.applyTransform([1, 0, 0, 1, this.p.x || 0.0, this.p.y || 0.0]);
			}
		}

		// rotate
		this.Type.rotate = function(s) {
			var a = svg.ToNumberArray(s);
			this.angle = new svg.Property('angle', a[0]);
			this.cx = a[1] || 0;
			this.cy = a[2] || 0;
			this.apply = function(ctx) {
				ctx.translate(this.cx, this.cy);
				ctx.rotate(this.angle.toRadians());
				ctx.translate(-this.cx, -this.cy);
			}
			this.applyToPoint = function(p) {
				var a = this.angle.toRadians();
				p.applyTransform([1, 0, 0, 1, this.p.x || 0.0, this.p.y || 0.0]);
				p.applyTransform([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]);
				p.applyTransform([1, 0, 0, 1, -this.p.x || 0.0, -this.p.y || 0.0]);
			}
		}

		this.Type.scale = function(s) {
			this.p = svg.CreatePoint(s);
			this.apply = function(ctx) {
				ctx.scale(this.p.x || 1.0, this.p.y || this.p.x || 1.0);
			}
			this.applyToPoint = function(p) {
				p.applyTransform([this.p.x || 0.0, 0, 0, this.p.y || 0.0, 0, 0]);
			}
		}

		this.Type.matrix = function(s) {
			this.m = svg.ToNumberArray(s);
			this.apply = function(ctx) {
				ctx.transform(this.m[0], this.m[1], this.m[2], this.m[3], this.m[4], this.m[5]);
			}
			this.applyToPoint = function(p) {
				p.applyTransform(this.m);
			}
		}

		this.Type.SkewBase = function(s) {
			this.base = that.Type.matrix;
			this.base(s);
			this.angle = new svg.Property('angle', s);
		}
		this.Type.SkewBase.prototype = new this.Type.matrix;

		this.Type.skewX = function(s) {
			this.base = that.Type.SkewBase;
			this.base(s);
			this.m = [1, 0, Math.tan(this.angle.toRadians()), 1, 0, 0];
		}
		this.Type.skewX.prototype = new this.Type.SkewBase;

		this.Type.skewY = function(s) {
			this.base = that.Type.SkewBase;
			this.base(s);
			this.m = [1, Math.tan(this.angle.toRadians()), 0, 1, 0, 0];
		}
		this.Type.skewY.prototype = new this.Type.SkewBase;


		this.transforms = [];

		this.apply = function(ctx) {
			for (var i=0; i<this.transforms.length; i++) {
				this.transforms[i].apply(ctx);
			}
		}

		this.applyToPoint = function(p) {
			for (var i=0; i<this.transforms.length; i++) {
				this.transforms[i].applyToPoint(p);
			}
		}

		var data = svg.trim(svg.compressSpaces(v)).split(/\s(?=[a-z])/);
		for (var i=0; i<data.length; i++) {
			var type = data[i].split('(')[0];
			var s = data[i].split('(')[1].replace(')','');
			var transform = new this.Type[type](s);
			this.transforms.push(transform);
		}
	};

	return Transform;
});
