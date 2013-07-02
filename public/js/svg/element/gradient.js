define([
	'svg/property',
	'svg/element/core'
], function(
	Property,
	Element
) {
	'use strict';

	var ElementBase = Element.ElementBase;
	var GradientBase = Element.GradientBase;

	// linear gradient element
	var linearGradient = function(node) {
		this.base = GradientBase;
		this.base(node);

		this.getGradient = function(ctx, element) {
			var bb = element.getBoundingBox();

			var x1 = (this.gradientUnits == 'objectBoundingBox'
					  ? bb.x() + bb.width() * this.attribute('x1').numValue()
					  : this.attribute('x1').toPixels('x'));
			var y1 = (this.gradientUnits == 'objectBoundingBox'
					  ? bb.y() + bb.height() * this.attribute('y1').numValue()
					  : this.attribute('y1').toPixels('y'));
			var x2 = (this.gradientUnits == 'objectBoundingBox'
					  ? bb.x() + bb.width() * this.attribute('x2').numValue()
					  : this.attribute('x2').toPixels('x'));
			var y2 = (this.gradientUnits == 'objectBoundingBox'
					  ? bb.y() + bb.height() * this.attribute('y2').numValue()
					  : this.attribute('y2').toPixels('y'));

			if (x1 == x2 && y1 == y2) return null;
			return ctx.createLinearGradient(x1, y1, x2, y2);
		}
	}
	linearGradient.prototype = new GradientBase;

	// radial gradient element
	var radialGradient = function(node) {
		this.base = GradientBase;
		this.base(node);

		this.getGradient = function(ctx, element) {
			var bb = element.getBoundingBox();

			if (!this.attribute('cx').hasValue()) this.attribute('cx', true).value = '50%';
			if (!this.attribute('cy').hasValue()) this.attribute('cy', true).value = '50%';
			if (!this.attribute('r').hasValue()) this.attribute('r', true).value = '50%';

			var cx = (this.gradientUnits == 'objectBoundingBox'
					  ? bb.x() + bb.width() * this.attribute('cx').numValue()
					  : this.attribute('cx').toPixels('x'));
			var cy = (this.gradientUnits == 'objectBoundingBox'
					  ? bb.y() + bb.height() * this.attribute('cy').numValue()
					  : this.attribute('cy').toPixels('y'));

			var fx = cx;
			var fy = cy;
			if (this.attribute('fx').hasValue()) {
				fx = (this.gradientUnits == 'objectBoundingBox'
					  ? bb.x() + bb.width() * this.attribute('fx').numValue()
					  : this.attribute('fx').toPixels('x'));
			}
			if (this.attribute('fy').hasValue()) {
				fy = (this.gradientUnits == 'objectBoundingBox'
					  ? bb.y() + bb.height() * this.attribute('fy').numValue()
					  : this.attribute('fy').toPixels('y'));
			}

			var r = (this.gradientUnits == 'objectBoundingBox'
					 ? (bb.width() + bb.height()) / 2.0 * this.attribute('r').numValue()
					 : this.attribute('r').toPixels());

			return ctx.createRadialGradient(fx, fy, 0, cx, cy, r);
		}
	}
	radialGradient.prototype = new GradientBase;

	// gradient stop element
	var stop = function(node) {
		this.base = ElementBase;
		this.base(node);

		this.offset = this.attribute('offset').numValue();

		var stopColor = this.style('stop-color');
		if (this.style('stop-opacity').hasValue()) stopColor = stopColor.addOpacity(this.style('stop-opacity').value);
		this.color = stopColor.value;
	}
	stop.prototype = new ElementBase;

	Element.linearGradient = linearGradient;
	Element.radialGradient = radialGradient;
	Element.stop = stop;

	return Element;
});
