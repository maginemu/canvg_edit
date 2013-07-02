define([
	'svg/core',
	'svg/property',
	'svg/font',
	'svg/transform',
	'svg/boundingbox',
	'svg/point'
], function(
	svg,
	Property,
	Font,
	Transform,
	BoundingBox,
	Point
) {
	'use strict'

	var Element = {};

	var ElementBase = function(node) {
		this.attributes = {};
		this.styles = {};
		this.children = [];

		if (node != null && node.nodeType == 1) { //ELEMENT_NODE
			// add children
			for (var i=0; i<node.childNodes.length; i++) {
				var childNode = node.childNodes[i];
				if (childNode.nodeType == 1) this.addChild(childNode, true); //ELEMENT_NODE
			}

			// add attributes
			for (var i=0; i<node.attributes.length; i++) {
				var attribute = node.attributes[i];
				this.attributes[attribute.nodeName] = new Property(attribute.nodeName, attribute.nodeValue);
			}

			// add tag styles
			var styles = svg.Styles[node.nodeName];
			if (styles != null) {
				for (var name in styles) {
					this.styles[name] = styles[name];
				}
			}

			// add class styles
			if (this.attribute('class').hasValue()) {
				var classes = svg.compressSpaces(this.attribute('class').value).split(' ');
				for (var j=0; j<classes.length; j++) {
					styles = svg.Styles['.'+classes[j]];
					if (styles != null) {
						for (var name in styles) {
							this.styles[name] = styles[name];
						}
					}
					styles = svg.Styles[node.nodeName+'.'+classes[j]];
					if (styles != null) {
						for (var name in styles) {
							this.styles[name] = styles[name];
						}
					}
				}
			}

			// add id styles
			if (this.attribute('id').hasValue()) {
				var styles = svg.Styles['#' + this.attribute('id').value];
				if (styles != null) {
					for (var name in styles) {
						this.styles[name] = styles[name];
					}
				}
			}

			// add inline styles
			if (this.attribute('style').hasValue()) {
				var styles = this.attribute('style').value.split(';');
				for (var i=0; i<styles.length; i++) {
					if (svg.trim(styles[i]) != '') {
						var style = styles[i].split(':');
						var name = svg.trim(style[0]);
						var value = svg.trim(style[1]);
						this.styles[name] = new Property(name, value);
					}
				}
			}

			// add id
			if (this.attribute('id').hasValue()) {
				if (svg.Definitions[this.attribute('id').value] == null) {
					svg.Definitions[this.attribute('id').value] = this;
				}
			}
		}
	};

	// get or create attribute
	ElementBase.prototype.attribute = function(name, createIfNotExists) {
		var a = this.attributes[name];
		if (a != null) return a;

		if (createIfNotExists == true) { a = new Property(name, ''); this.attributes[name] = a; }
		return a || svg.EmptyProperty;
	}

	// get or create style, crawls up node tree
	ElementBase.prototype.style = function(name, createIfNotExists) {
		var s = this.styles[name];
		if (s != null) return s;

		var a = this.attribute(name);
		if (a != null && a.hasValue()) {
			this.styles[name] = a; // move up to me to cache
			return a;
		}

		var p = this.parent;
		if (p != null) {
			var ps = p.style(name);
			if (ps != null && ps.hasValue()) {
				return ps;
			}
		}

		if (createIfNotExists == true) { s = new Property(name, ''); this.styles[name] = s; }
		return s || svg.EmptyProperty;
	}

	// base render
	ElementBase.prototype.render = function(ctx) {
		// don't render display=none
		if (this.style('display').value == 'none') return;

		// don't render visibility=hidden
		if (this.attribute('visibility').value == 'hidden') return;

		ctx.save();
		this.setContext(ctx);
		// mask
		if (this.attribute('mask').hasValue()) {
			var mask = this.attribute('mask').getDefinition();
			if (mask != null) mask.apply(ctx, this);
		}
		else if (this.style('filter').hasValue()) {
			var filter = this.style('filter').getDefinition();
			if (filter != null) filter.apply(ctx, this);
		}
		else this.renderChildren(ctx);
		this.clearContext(ctx);
		ctx.restore();
	};

	// base set context
	ElementBase.prototype.setContext = function(ctx) {
		// OVERRIDE ME!
	};

	// base clear context
	ElementBase.prototype.clearContext = function(ctx) {
		// OVERRIDE ME!
	};

	// base render children
	ElementBase.prototype.renderChildren = function(ctx) {
		for (var i=0; i<this.children.length; i++) {
			this.children[i].render(ctx);
		}
	};

	ElementBase.prototype.addChild = function(childNode, create) {
		var child = childNode;
		if (create) child = svg.CreateElement(childNode);
		child.parent = this;
		this.children.push(child);
	};



	var RenderedElementBase = function(node) {
		this.base = ElementBase;
		this.base(node);

		this.setContext = function(ctx) {
			// fill
			if (this.style('fill').isUrlDefinition()) {
				var fs = this.style('fill').getFillStyleDefinition(this);
				if (fs != null) ctx.fillStyle = fs;
			}
			else if (this.style('fill').hasValue()) {
				var fillStyle = this.style('fill');
				if (fillStyle.value == 'currentColor') fillStyle.value = this.style('color').value;
				ctx.fillStyle = (fillStyle.value == 'none' ? 'rgba(0,0,0,0)' : fillStyle.value);
			}
			if (this.style('fill-opacity').hasValue()) {
				var fillStyle = new Property('fill', ctx.fillStyle);
				fillStyle = fillStyle.addOpacity(this.style('fill-opacity').value);
				ctx.fillStyle = fillStyle.value;
			}

			// stroke
			if (this.style('stroke').isUrlDefinition()) {
				var fs = this.style('stroke').getFillStyleDefinition(this);
				if (fs != null) ctx.strokeStyle = fs;
			}
			else if (this.style('stroke').hasValue()) {
				var strokeStyle = this.style('stroke');
				if (strokeStyle.value == 'currentColor') strokeStyle.value = this.style('color').value;
				ctx.strokeStyle = (strokeStyle.value == 'none' ? 'rgba(0,0,0,0)' : strokeStyle.value);
			}
			if (this.style('stroke-opacity').hasValue()) {
				var strokeStyle = new Property('stroke', ctx.strokeStyle);
				strokeStyle = strokeStyle.addOpacity(this.style('stroke-opacity').value);
				ctx.strokeStyle = strokeStyle.value;
			}
			if (this.style('stroke-width').hasValue()) ctx.lineWidth = this.style('stroke-width').toPixels();
			if (this.style('stroke-linecap').hasValue()) ctx.lineCap = this.style('stroke-linecap').value;
			if (this.style('stroke-linejoin').hasValue()) ctx.lineJoin = this.style('stroke-linejoin').value;
			if (this.style('stroke-miterlimit').hasValue()) ctx.miterLimit = this.style('stroke-miterlimit').value;

			// font
			if (typeof(ctx.font) != 'undefined') {
				ctx.font = Font.CreateFont(
					this.style('font-style').value,
					this.style('font-variant').value,
					this.style('font-weight').value,
					this.style('font-size').hasValue() ? this.style('font-size').toPixels() + 'px' : '',
					this.style('font-family').value).toString();
			}

			// transform
			if (this.attribute('transform').hasValue()) {
				var transform = new Transform(this.attribute('transform').value);
				transform.apply(ctx);
			}

			// clip
			if (this.attribute('clip-path').hasValue()) {
				var clip = this.attribute('clip-path').getDefinition();
				if (clip != null) clip.apply(ctx);
			}

			// opacity
			if (this.style('opacity').hasValue()) {
				ctx.globalAlpha = this.style('opacity').numValue();
			}
		}
	}
	RenderedElementBase.prototype = new ElementBase;


	var PathElementBase = function(node) {
		this.base = RenderedElementBase;
		this.base(node);

		this.path = function(ctx) {
			if (ctx != null) ctx.beginPath();
			return new BoundingBox();
		}

		this.renderChildren = function(ctx) {
			this.path(ctx);
			if (ctx.fillStyle != '') ctx.fill();
			if (ctx.strokeStyle != '') ctx.stroke();

			var markers = this.getMarkers();
			if (markers != null) {
				if (this.style('marker-start').isUrlDefinition()) {
					var marker = this.style('marker-start').getDefinition();
					marker.render(ctx, markers[0][0], markers[0][1]);
				}
				if (this.style('marker-mid').isUrlDefinition()) {
					var marker = this.style('marker-mid').getDefinition();
					for (var i=1;i<markers.length-1;i++) {
						marker.render(ctx, markers[i][0], markers[i][1]);
					}
				}
				if (this.style('marker-end').isUrlDefinition()) {
					var marker = this.style('marker-end').getDefinition();
					marker.render(ctx, markers[markers.length-1][0], markers[markers.length-1][1]);
				}
			}
		}

		this.getBoundingBox = function() {
			return this.path();
		}

		this.getMarkers = function() {
			return null;
		}
	}
	PathElementBase.prototype = new RenderedElementBase;

	// text base
	var TextElementBase = function(node) {
		this.base = RenderedElementBase;
		this.base(node);

		this.getGlyph = function(font, text, i) {
			var c = text[i];
			var glyph = null;
			if (font.isArabic) {
				var arabicForm = 'isolated';
				if ((i==0 || text[i-1]==' ') && i<text.length-2 && text[i+1]!=' ') arabicForm = 'terminal';
				if (i>0 && text[i-1]!=' ' && i<text.length-2 && text[i+1]!=' ') arabicForm = 'medial';
				if (i>0 && text[i-1]!=' ' && (i == text.length-1 || text[i+1]==' ')) arabicForm = 'initial';
				if (typeof(font.glyphs[c]) != 'undefined') {
					glyph = font.glyphs[c][arabicForm];
					if (glyph == null && font.glyphs[c].type == 'glyph') glyph = font.glyphs[c];
				}
			}
			else {
				glyph = font.glyphs[c];
			}
			if (glyph == null) glyph = font.missingGlyph;
			return glyph;
		}

		this.renderChildren = function(ctx) {
			var customFont = this.parent.style('font-family').getDefinition();
			if (customFont != null) {
				var fontSize = this.parent.style('font-size').numValueOrDefault(Font.Parse(svg.ctx.font).fontSize);
				var fontStyle = this.parent.style('font-style').valueOrDefault(Font.Parse(svg.ctx.font).fontStyle);
				var text = this.getText();
				if (customFont.isRTL) text = text.split("").reverse().join("");

				var dx = svg.ToNumberArray(this.parent.attribute('dx').value);
				for (var i=0; i<text.length; i++) {
					var glyph = this.getGlyph(customFont, text, i);
					var scale = fontSize / customFont.fontFace.unitsPerEm;
					ctx.translate(this.x, this.y);
					ctx.scale(scale, -scale);
					var lw = ctx.lineWidth;
					ctx.lineWidth = ctx.lineWidth * customFont.fontFace.unitsPerEm / fontSize;
					if (fontStyle == 'italic') ctx.transform(1, 0, .4, 1, 0, 0);
					glyph.render(ctx);
					if (fontStyle == 'italic') ctx.transform(1, 0, -.4, 1, 0, 0);
					ctx.lineWidth = lw;
					ctx.scale(1/scale, -1/scale);
					ctx.translate(-this.x, -this.y);

					this.x += fontSize * (glyph.horizAdvX || customFont.horizAdvX) / customFont.fontFace.unitsPerEm;
					if (typeof(dx[i]) != 'undefined' && !isNaN(dx[i])) {
						this.x += dx[i];
					}
				}
				return;
			}

			if (ctx.strokeStyle != '') ctx.strokeText(svg.compressSpaces(this.getText()), this.x, this.y);
			if (ctx.fillStyle != '') ctx.fillText(svg.compressSpaces(this.getText()), this.x, this.y);
		}

		this.getText = function() {
			// OVERRIDE ME
		}

		this.measureText = function(ctx) {
			var customFont = this.parent.style('font-family').getDefinition();
			if (customFont != null) {
				var fontSize = this.parent.style('font-size').numValueOrDefault(Font.Parse(svg.ctx.font).fontSize);
				var measure = 0;
				var text = this.getText();
				if (customFont.isRTL) text = text.split("").reverse().join("");
				var dx = svg.ToNumberArray(this.parent.attribute('dx').value);
				for (var i=0; i<text.length; i++) {
					var glyph = this.getGlyph(customFont, text, i);
					measure += (glyph.horizAdvX || customFont.horizAdvX) * fontSize / customFont.fontFace.unitsPerEm;
					if (typeof(dx[i]) != 'undefined' && !isNaN(dx[i])) {
						measure += dx[i];
					}
				}
				return measure;
			}

			var textToMeasure = svg.compressSpaces(this.getText());
			if (!ctx.measureText) return textToMeasure.length * 10;

			ctx.save();
			this.setContext(ctx);
			var width = ctx.measureText(textToMeasure).width;
			ctx.restore();
			return width;
		}
	}
	TextElementBase.prototype = new RenderedElementBase;


	// base for gradients
	var GradientBase = function(node) {
		this.base = ElementBase;
		this.base(node);

		this.gradientUnits = this.attribute('gradientUnits').valueOrDefault('objectBoundingBox');

		this.stops = [];
		for (var i=0; i<this.children.length; i++) {
			var child = this.children[i];
			this.stops.push(child);
		}

		this.getGradient = function() {
			// OVERRIDE ME!
		}

		this.createGradient = function(ctx, element) {
			var stopsContainer = this;
			if (this.attribute('xlink:href').hasValue()) {
				stopsContainer = this.attribute('xlink:href').getDefinition();
			}

			var g = this.getGradient(ctx, element);
			if (g == null) return stopsContainer.stops[stopsContainer.stops.length - 1].color;
			for (var i=0; i<stopsContainer.stops.length; i++) {
				g.addColorStop(stopsContainer.stops[i].offset, stopsContainer.stops[i].color);
			}

			if (this.attribute('gradientTransform').hasValue()) {
				// render as transformed pattern on temporary canvas
				var rootView = svg.ViewPort.viewPorts[0];

				var rect = new Element.rect();
				rect.attributes['x'] = new Property('x', -svg.MAX_VIRTUAL_PIXELS/3.0);
				rect.attributes['y'] = new Property('y', -svg.MAX_VIRTUAL_PIXELS/3.0);
				rect.attributes['width'] = new Property('width', svg.MAX_VIRTUAL_PIXELS);
				rect.attributes['height'] = new Property('height', svg.MAX_VIRTUAL_PIXELS);

				var group = new Element.g();
				group.attributes['transform'] = new Property('transform', this.attribute('gradientTransform').value);
				group.children = [ rect ];

				var tempSvg = new Element.svg();
				tempSvg.attributes['x'] = new Property('x', 0);
				tempSvg.attributes['y'] = new Property('y', 0);
				tempSvg.attributes['width'] = new Property('width', rootView.width);
				tempSvg.attributes['height'] = new Property('height', rootView.height);
				tempSvg.children = [ group ];

				var c = document.createElement('canvas');
				c.width = rootView.width;
				c.height = rootView.height;
				var tempCtx = c.getContext('2d');
				tempCtx.fillStyle = g;
				tempSvg.render(tempCtx);
				return tempCtx.createPattern(c, 'no-repeat');
			}

			return g;
		}
	}
	GradientBase.prototype = new ElementBase;

	var MISSING = function(node) {
		if (console) console.log('ERROR: Element \'' + node.nodeName + '\' not yet implemented.');
	}
	MISSING.prototype = new ElementBase;

	// element factory
	var CreateElement = function(node) {
		var className = node.nodeName.replace(/^[^:]+:/,''); // remove namespace
		className = className.replace(/\-/g,''); // remove dashes
		var e = null;
		if (typeof(Element[className]) != 'undefined') {
			e = new Element[className](node);
		}
		else {
			e = new Element.MISSING(node);
		}

		e.type = node.nodeName;
		return e;
	};
	svg.CreateElement = CreateElement;

	Element.ElementBase = ElementBase;
	Element.RenderedElementBase = RenderedElementBase;
	Element.PathElementBase = PathElementBase;
	Element.TextElementBase = TextElementBase;
	Element.GradientBase = GradientBase;
	Element.MISSING = MISSING;

	return Element;
});
