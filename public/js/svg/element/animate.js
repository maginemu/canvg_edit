define([
	'svg/core',
	'svg/property',
	'svg/element/core'
], function(
	svg,
	Property,
	Element
) {
	'use strict';

	var ElementBase = Element.ElementBase;

	// animation base element
	var AnimateBase = function(node) {
		this.base = ElementBase;
		this.base(node);

		svg.Animations.push(this);

		this.duration = 0.0;
		this.begin = this.attribute('begin').toMilliseconds();
		this.maxDuration = this.begin + this.attribute('dur').toMilliseconds();

		this.getProperty = function() {
			var attributeType = this.attribute('attributeType').value;
			var attributeName = this.attribute('attributeName').value;

			if (attributeType == 'CSS') {
				return this.parent.style(attributeName, true);
			}
			return this.parent.attribute(attributeName, true);
		};

		this.initialValue = null;
		this.initialUnits = '';
		this.removed = false;

		this.calcValue = function() {
			// OVERRIDE ME!
			return '';
		}

		this.update = function(delta) {
			// set initial value
			if (this.initialValue == null) {
				this.initialValue = this.getProperty().value;
				this.initialUnits = this.getProperty().getUnits();
			}

			// if we're past the end time
			if (this.duration > this.maxDuration) {
				// loop for indefinitely repeating animations
				if (this.attribute('repeatCount').value == 'indefinite') {
					this.duration = 0.0
				}
				else if (this.attribute('fill').valueOrDefault('remove') == 'remove' && !this.removed) {
					this.removed = true;
					this.getProperty().value = this.initialValue;
					return true;
				}
				else {
					return false; // no updates made
				}
			}
			this.duration = this.duration + delta;

			// if we're past the begin time
			var updated = false;
			if (this.begin < this.duration) {
				var newValue = this.calcValue(); // tween

				if (this.attribute('type').hasValue()) {
					// for transform, etc.
					var type = this.attribute('type').value;
					newValue = type + '(' + newValue + ')';
				}

				this.getProperty().value = newValue;
				updated = true;
			}

			return updated;
		}

		this.from = this.attribute('from');
		this.to = this.attribute('to');
		this.values = this.attribute('values');
		if (this.values.hasValue()) this.values.value = this.values.value.split(';');

		// fraction of duration we've covered
		this.progress = function() {
			var ret = { progress: (this.duration - this.begin) / (this.maxDuration - this.begin) };
			if (this.values.hasValue()) {
				var p = ret.progress * (this.values.value.length - 1);
				var lb = Math.floor(p), ub = Math.ceil(p);
				ret.from = new Property('from', parseFloat(this.values.value[lb]));
				ret.to = new Property('to', parseFloat(this.values.value[ub]));
				ret.progress = (p - lb) / (ub - lb);
			}
			else {
				ret.from = this.from;
				ret.to = this.to;
			}
			return ret;
		}
	}
	AnimateBase.prototype = new ElementBase;

	// animate element
	var animate = function(node) {
		this.base = AnimateBase;
		this.base(node);

		this.calcValue = function() {
			var p = this.progress();

			// tween value linearly
			var newValue = p.from.numValue() + (p.to.numValue() - p.from.numValue()) * p.progress;
			return newValue + this.initialUnits;
		};
	}
	animate.prototype = new AnimateBase;

	// animate color element
	var animateColor = function(node) {
		this.base = AnimateBase;
		this.base(node);

		this.calcValue = function() {
			var p = this.progress();
			var from = new RGBColor(p.from.value);
			var to = new RGBColor(p.to.value);

			if (from.ok && to.ok) {
				// tween color linearly
				var r = from.r + (to.r - from.r) * p.progress;
				var g = from.g + (to.g - from.g) * p.progress;
				var b = from.b + (to.b - from.b) * p.progress;
				return 'rgb('+parseInt(r,10)+','+parseInt(g,10)+','+parseInt(b,10)+')';
			}
			return this.attribute('from').value;
		};
	}
	animateColor.prototype = new AnimateBase;

	// animate transform element
	var animateTransform = function(node) {
		this.base = animate;
		this.base(node);
	}
	animateTransform.prototype = new animate;


	Element.AnimateBase = AnimateBase;
	Element.animate = animate;
	Element.animateColor = animateColor;
	Element.animateTransform = animateTransform;

	return animate;
});
