define([], function() {


	var Property = function(name, value) {
		this.name = name;
		this.value = value;
	}
	Property.prototype.getValue = function() {
		return this.value;
	}

	Property.prototype.hasValue = function() {
		return (this.value != null && this.value !== '');
	}

	// return the numerical value of the property
	Property.prototype.numValue = function() {
		if (!this.hasValue()) return 0;

		var n = parseFloat(this.value);
		if ((this.value + '').match(/%$/)) {
			n = n / 100.0;
		}
		return n;
	}

	Property.prototype.valueOrDefault = function(def) {
		if (this.hasValue()) return this.value;
		return def;
	}

	Property.prototype.numValueOrDefault = function(def) {
		if (this.hasValue()) return this.numValue();
		return def;
	}

	// color extensions
	// augment the current color value with the opacity
	Property.prototype.addOpacity = function(opacity) {
		var newValue = this.value;
		if (opacity != null && opacity != '' && typeof(this.value)=='string') { // can only add opacity to colors, not patterns
			var color = new RGBColor(this.value);
			if (color.ok) {
				newValue = 'rgba(' + color.r + ', ' + color.g + ', ' + color.b + ', ' + opacity + ')';
			}
		}
		return new Property(this.name, newValue);
	}

	// definition extensions
	// get the definition from the definitions table
	Property.prototype.getDefinition = function() {
		var name = this.value.replace(/^(url\()?#([^\)]+)\)?$/, '$2');
		return svg.Definitions[name];
	}

	Property.prototype.isUrlDefinition = function() {
		return this.value.indexOf('url(') == 0
	}

	Property.prototype.getFillStyleDefinition = function(e) {
		var def = this.getDefinition();

		// gradient
		if (def != null && def.createGradient) {
			return def.createGradient(svg.ctx, e);
		}

		// pattern
		if (def != null && def.createPattern) {
			return def.createPattern(svg.ctx, e);
		}

		return null;
	}

	// length extensions
	Property.prototype.getDPI = function(viewPort) {
		return 96.0; // TODO: compute?
	}

	Property.prototype.getEM = function(viewPort) {
		var em = 12;

		var fontSize = new Property('fontSize', svg.Font.Parse(svg.ctx.font).fontSize);
		if (fontSize.hasValue()) em = fontSize.toPixels(viewPort);

		return em;
	}

	Property.prototype.getUnits = function() {
		var s = this.value+'';
		return s.replace(/[0-9\.\-]/g,'');
	}

	// get the length as pixels
	Property.prototype.toPixels = function(viewPort) {
		if (!this.hasValue()) return 0;
		var s = this.value+'';
		if (s.match(/em$/)) return this.numValue() * this.getEM(viewPort);
		if (s.match(/ex$/)) return this.numValue() * this.getEM(viewPort) / 2.0;
		if (s.match(/px$/)) return this.numValue();
		if (s.match(/pt$/)) return this.numValue() * this.getDPI(viewPort) * (1.0 / 72.0);
		if (s.match(/pc$/)) return this.numValue() * 15;
		if (s.match(/cm$/)) return this.numValue() * this.getDPI(viewPort) / 2.54;
		if (s.match(/mm$/)) return this.numValue() * this.getDPI(viewPort) / 25.4;
		if (s.match(/in$/)) return this.numValue() * this.getDPI(viewPort);
		if (s.match(/%$/)) return this.numValue() * svg.ViewPort.ComputeSize(viewPort);
		return this.numValue();
	}

	// time extensions
	// get the time as milliseconds
	Property.prototype.toMilliseconds = function() {
		if (!this.hasValue()) return 0;
		var s = this.value+'';
		if (s.match(/s$/)) return this.numValue() * 1000;
		if (s.match(/ms$/)) return this.numValue();
		return this.numValue();
	}

	// angle extensions
	// get the angle as radians
	Property.prototype.toRadians = function() {
		if (!this.hasValue()) return 0;
		var s = this.value+'';
		if (s.match(/deg$/)) return this.numValue() * (Math.PI / 180.0);
		if (s.match(/grad$/)) return this.numValue() * (Math.PI / 200.0);
		if (s.match(/rad$/)) return this.numValue();
		return this.numValue() * (Math.PI / 180.0);
	}

	svg.EmptyProperty = new Property('EMPTY', '');

	svg.Property = Property;

	return Property;
});
