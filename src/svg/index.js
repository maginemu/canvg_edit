define([
	'core',
	'aspectratio',
	'boundingbox',
	'element/index'
	'font',
	'point',
	'property',
	'transform'
], function(
	svg,
	AspectRatio,
	BoundingBox,
	Element,
	Font,
	Point,
	Property,
	Transform
) {
	'use strict';

	// load from url
	svg.load = function(ctx, url) {
		svg.loadXml(ctx, svg.ajax(url));
	}

	// load from xml
	svg.loadXml = function(ctx, xml) {
		svg.loadXmlDoc(ctx, svg.parseXml(xml));
	}

	svg.loadXmlDoc = function(ctx, dom) {
		svg.init(ctx);

		var mapXY = function(p) {
			var e = ctx.canvas;
			while (e) {
				p.x -= e.offsetLeft;
				p.y -= e.offsetTop;
				e = e.offsetParent;
			}
			if (window.scrollX) p.x += window.scrollX;
			if (window.scrollY) p.y += window.scrollY;
			return p;
		}


		var e = svg.CreateElement(dom.documentElement);
		e.root = true;

		// render loop
		var isFirstRender = true;
		var draw = function() {
			svg.ViewPort.Clear();
			if (ctx.canvas.parentNode) svg.ViewPort.SetCurrent(ctx.canvas.parentNode.clientWidth, ctx.canvas.parentNode.clientHeight);

			if (svg.opts['ignoreDimensions'] != true) {
				// set canvas size
				if (e.style('width').hasValue()) {
					ctx.canvas.width = e.style('width').toPixels('x');
					ctx.canvas.style.width = ctx.canvas.width + 'px';
				}
				if (e.style('height').hasValue()) {
					ctx.canvas.height = e.style('height').toPixels('y');
					ctx.canvas.style.height = ctx.canvas.height + 'px';
				}
			}
			var cWidth = ctx.canvas.clientWidth || ctx.canvas.width;
			var cHeight = ctx.canvas.clientHeight || ctx.canvas.height;
			if (svg.opts['ignoreDimensions'] == true && e.style('width').hasValue() && e.style('height').hasValue()) {
				cWidth = e.style('width').toPixels('x');
				cHeight = e.style('height').toPixels('y');
			}
			svg.ViewPort.SetCurrent(cWidth, cHeight);

			if (svg.opts['offsetX'] != null) e.attribute('x', true).value = svg.opts['offsetX'];
			if (svg.opts['offsetY'] != null) e.attribute('y', true).value = svg.opts['offsetY'];
			if (svg.opts['scaleWidth'] != null && svg.opts['scaleHeight'] != null) {
				var xRatio = 1, yRatio = 1, viewBox = svg.ToNumberArray(e.attribute('viewBox').value);
				if (e.attribute('width').hasValue()) xRatio = e.attribute('width').toPixels('x') / svg.opts['scaleWidth'];
				else if (!isNaN(viewBox[2])) xRatio = viewBox[2] / svg.opts['scaleWidth'];
				if (e.attribute('height').hasValue()) yRatio = e.attribute('height').toPixels('y') / svg.opts['scaleHeight'];
				else if (!isNaN(viewBox[3])) yRatio = viewBox[3] / svg.opts['scaleHeight'];

				e.attribute('width', true).value = svg.opts['scaleWidth'];
				e.attribute('height', true).value = svg.opts['scaleHeight'];
				e.attribute('viewBox', true).value = '0 0 ' + (cWidth * xRatio) + ' ' + (cHeight * yRatio);
				e.attribute('preserveAspectRatio', true).value = 'none';
			}

			// clear and render
			if (svg.opts['ignoreClear'] != true) {
				ctx.clearRect(0, 0, cWidth, cHeight);
			}
			e.render(ctx);
			if (isFirstRender) {
				isFirstRender = false;
				if (typeof(svg.opts['renderCallback']) == 'function') svg.opts['renderCallback']();
			}
		}

		var waitingForImages = true;
		if (svg.ImagesLoaded()) {
			waitingForImages = false;
			draw();
		}
		svg.intervalID = setInterval(function() {
			var needUpdate = false;

			if (waitingForImages && svg.ImagesLoaded()) {
				waitingForImages = false;
				needUpdate = true;
			}

			// need update from redraw?
			if (typeof(svg.opts['forceRedraw']) == 'function') {
				if (svg.opts['forceRedraw']() == true) needUpdate = true;
			}

			// render if needed
			if (needUpdate) {
				draw();
			}
		}, 1000 / svg.FRAMERATE);
	}

	svg.stop = function() {
		if (svg.intervalID) {
			clearInterval(svg.intervalID);
		}
	}


	return svg;


});
