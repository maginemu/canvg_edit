define([
	'svg/core',
	'svg/property',
	'svg/font',
	'svg/point',
	'svg/element/core'
], function(
	svg,
	Property,
	Font,
	Point,
	Element
) {
	'use strict';

	var RenderedElementBase = Element.RenderedElementBase;
	var TextElementBase = Element.TextElementBase;


	// text element
	var text = function(node) {
		this.base = RenderedElementBase;
		this.base(node);

		if (node != null) {
			// add children
			this.children = [];
			for (var i=0; i<node.childNodes.length; i++) {
				var childNode = node.childNodes[i];
				if (childNode.nodeType == 1) { // capture tspan and tref nodes
					this.addChild(childNode, true);
				}
				else if (childNode.nodeType == 3) { // capture text
					this.addChild(new tspan(childNode), false);
				}
			}
		}

		this.baseSetContext = this.setContext;
		this.setContext = function(ctx) {
			this.baseSetContext(ctx);
			if (this.style('dominant-baseline').hasValue()) ctx.textBaseline = this.style('dominant-baseline').value;
			if (this.style('alignment-baseline').hasValue()) ctx.textBaseline = this.style('alignment-baseline').value;
		}

		this.renderChildren = function(ctx) {
			var textAnchor = this.style('text-anchor').valueOrDefault('start');
			var x = this.attribute('x').toPixels('x');
			var y = this.attribute('y').toPixels('y');
			for (var i=0; i<this.children.length; i++) {
				var child = this.children[i];

				if (child.attribute('x').hasValue()) {
					child.x = child.attribute('x').toPixels('x');
				}
				else {
					if (this.attribute('dx').hasValue()) y += this.attribute('dx').toPixels('x');
					if (child.attribute('dx').hasValue()) x += child.attribute('dx').toPixels('x');
					child.x = x;
				}

				var childLength = child.measureText(ctx);
				if (textAnchor != 'start' && (i==0 || child.attribute('x').hasValue())) { // new group?
					// loop through rest of children
					var groupLength = childLength;
					for (var j=i+1; j<this.children.length; j++) {
						var childInGroup = this.children[j];
						if (childInGroup.attribute('x').hasValue()) break; // new group
						groupLength += childInGroup.measureText(ctx);
					}
					child.x -= (textAnchor == 'end' ? groupLength : groupLength / 2.0);
				}
				x = child.x + childLength;

				if (child.attribute('y').hasValue()) {
					child.y = child.attribute('y').toPixels('y');
				}
				else {
					if (this.attribute('dy').hasValue()) y += this.attribute('dy').toPixels('y');
					if (child.attribute('dy').hasValue()) y += child.attribute('dy').toPixels('y');
					child.y = y;
				}
				y = child.y;

				child.render(ctx);
			}
		}
	}
	text.prototype = new RenderedElementBase;


	// tspan
	var tspan = function(node) {
		this.base = TextElementBase;
		this.base(node);

		this.text = node.nodeType == 3 ? node.nodeValue : // text
		node.childNodes.length > 0 ? node.childNodes[0].nodeValue : // element
		node.text;
		this.getText = function() {
			return this.text;
		}
	}
	tspan.prototype = new TextElementBase;

	// tref
	var tref = function(node) {
		this.base = TextElementBase;
		this.base(node);

		this.getText = function() {
			var element = this.attribute('xlink:href').getDefinition();
			if (element != null) return element.children[0].getText();
		}
	}
	tref.prototype = new TextElementBase;

	// a element
	var a = function(node) {
		this.base = TextElementBase;
		this.base(node);

		this.hasText = true;
		for (var i=0; i<node.childNodes.length; i++) {
			if (node.childNodes[i].nodeType != 3) this.hasText = false;
		}

		// this might contain text
		this.text = this.hasText ? node.childNodes[0].nodeValue : '';
		this.getText = function() {
			return this.text;
		}

		this.baseRenderChildren = this.renderChildren;
		this.renderChildren = function(ctx) {
			if (this.hasText) {
				// render as text element
				this.baseRenderChildren(ctx);
				var fontSize = new Property('fontSize', Font.Parse(svg.ctx.font).fontSize);
			}
			else {
				// render as temporary group
				var g = new Element.g();
				g.children = this.children;
				g.parent = this;
				g.render(ctx);
			}
		}

		this.onclick = function() {
			window.open(this.attribute('xlink:href').value);
		}

		this.onmousemove = function() {
			svg.ctx.canvas.style.cursor = 'pointer';
		}
	}
	a.prototype = new TextElementBase;

	Element.text = text;
	Element.TextElementBase = TextElementBase;
	Element.tspan = tspan;
	Element.tref = tref;
	Element.a = a;

	return text;
});
