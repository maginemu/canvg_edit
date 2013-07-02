define([
	'svg/element/core'
], function(
	Element
) {
	'use strict';

	var ElementBase = Element.ElementBase;

	var max = Math.max;
	var min = Math.min;
	var abs = Math.abs;
	var ceil = Math.ceil;
	var exp = Math.exp;

	// filters
	var filter = function(node) {
		this.base = ElementBase;
		this.base(node);

		this.apply = function(ctx, element) {
			// render as temp svg
			var bb = element.getBoundingBox();
			var x = this.attribute('x').toPixels('x');
			var y = this.attribute('y').toPixels('y');
			if (x == 0 || y == 0) {
				x = bb.x1;
				y = bb.y1;
			}
			var width = this.attribute('width').toPixels('x');
			var height = this.attribute('height').toPixels('y');
			if (width == 0 || height == 0) {
				width = bb.width();
				height = bb.height();
			}

			// temporarily remove filter to avoid recursion
			var filter = element.style('filter').value;
			element.style('filter').value = '';

			// max filter distance
			var extraPercent = .20;
			var px = extraPercent * width;
			var py = extraPercent * height;

			var c = document.createElement('canvas');
			c.width = width + 2*px;
			c.height = height + 2*py;
			var tempCtx = c.getContext('2d');
			tempCtx.translate(-x + px, -y + py);
			element.render(tempCtx);

			// apply filters
			for (var i=0; i<this.children.length; i++) {
				if (this.children[i].apply) {
					this.children[i].apply(tempCtx, 0, 0, width + 2*px, height + 2*py);
				}
			}

			// render on me
			ctx.drawImage(c, 0, 0, width + 2*px, height + 2*py, x - px, y - py, width + 2*px, height + 2*py);

			// reassign filter
			element.style('filter', true).value = filter;
		}

		this.render = function(ctx) {
			// NO RENDER
		}
	}
	filter.prototype = new ElementBase;

	var feGaussianBlur = function(node) {
		this.base = ElementBase;
		this.base(node);

		function make_fgauss(sigma) {
			sigma = max(sigma, 0.01);
			var len = ceil(sigma * 4.0) + 1;
			mask = [];
			for (var i = 0; i < len; i++) {
				mask[i] = exp(-0.5 * (i / sigma) * (i / sigma));
			}
			return mask;
		}

		function normalize(mask) {
			var sum = 0;
			for (var i = 1; i < mask.length; i++) {
				sum += abs(mask[i]);
			}
			sum = 2 * sum + abs(mask[0]);
			for (var i = 0; i < mask.length; i++) {
				mask[i] /= sum;
			}
			return mask;
		}

		function convolve_even(src, dst, mask, width, height) {
			for (var y = 0; y < height; y++) {
				for (var x = 0; x < width; x++) {
					var a = imGet(src, x, y, width, height, 3)/255;
					for (var rgba = 0; rgba < 4; rgba++) {
						var sum = mask[0] * (a==0?255:imGet(src, x, y, width, height, rgba)) * (a==0||rgba==3?1:a);
						for (var i = 1; i < mask.length; i++) {
							var a1 = imGet(src, max(x-i,0), y, width, height, 3)/255;
							var a2 = imGet(src, min(x+i, width-1), y, width, height, 3)/255;
							sum += mask[i] *
								((a1==0?255:imGet(src, max(x-i,0), y, width, height, rgba)) * (a1==0||rgba==3?1:a1) +
								 (a2==0?255:imGet(src, min(x+i, width-1), y, width, height, rgba)) * (a2==0||rgba==3?1:a2));
						}
						imSet(dst, y, x, height, width, rgba, sum);
					}
				}
			}
		}

		function imGet(img, x, y, width, height, rgba) {
			return img[y*width*4 + x*4 + rgba];
		}

		function imSet(img, x, y, width, height, rgba, val) {
			img[y*width*4 + x*4 + rgba] = val;
		}

		function blur(ctx, width, height, sigma)
		{
			var srcData = ctx.getImageData(0, 0, width, height);
			var mask = make_fgauss(sigma);
			mask = normalize(mask);
			tmp = [];
			convolve_even(srcData.data, tmp, mask, width, height);
			convolve_even(tmp, srcData.data, mask, height, width);
			ctx.clearRect(0, 0, width, height);
			ctx.putImageData(srcData, 0, 0);
		}

		this.apply = function(ctx, x, y, width, height) {
			// assuming x==0 && y==0 for now
			blur(ctx, width, height, this.attribute('stdDeviation').numValue());
		}
	}
	feGaussianBlur.prototype = new filter;


	Element.filter = filter;
	Element.feGaussianBlur = feGaussianBlur;

	return filter;

});
