define(['lib/svgr/core', 'lib/svgr/element/index', 'lib/svgr/property'], function(svg, Element, Property) {

	var ElementBase = function(node) {
		this.attributes = {};
		this.styles = {};
		this.children = [];

		// get or create attribute
		this.attribute = function(name, createIfNotExists) {
			var a = this.attributes[name];
			if (a != null) return a;

			if (createIfNotExists == true) { a = new Property(name, ''); this.attributes[name] = a; }
			return a || svg.EmptyProperty;
		}

		// get or create style, crawls up node tree
		this.style = function(name, createIfNotExists) {
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
		this.render = function(ctx) {
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
		}

		// base set context
		this.setContext = function(ctx) {
			// OVERRIDE ME!
		}

		// base clear context
		this.clearContext = function(ctx) {
			// OVERRIDE ME!
		}

		// base render children
		this.renderChildren = function(ctx) {
			for (var i=0; i<this.children.length; i++) {
				this.children[i].render(ctx);
			}
		}

		this.addChild = function(childNode, create) {
			var child = childNode;
			if (create) child = svg.CreateElement(childNode);
			child.parent = this;
			this.children.push(child);
		}

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
	}

	Element.ElementBase = ElementBase;

	return ElementBase;
});
