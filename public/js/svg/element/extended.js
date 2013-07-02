define(['svg/element/core'], function(Element) {

	var ElementBase = Element.ElementBase;
	// --
	// maginemu extended

	// set(override) new style
	ElementBase.prototype.setStyle = function(name, val) {
		return this.style(name, true).value = val;
	};

	// apply specified method to all children
	ElementBase.prototype.applyChildren = function(method /*, args... */) {
		var args = Array.prototype.slice.apply(arguments);
		method = args.shift();
		for (var idx in this.children) {
			var c = this.children[idx];
			if (c[method]) {
				c[method].apply(c, args);
			}
			c.applyChildren(method, args);
		}
	};

	return Element;

});
