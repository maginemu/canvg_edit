define([], function() {
	'use strict';

	var svg = {};

	svg.FRAMERATE = 30;
	svg.MAX_VIRTUAL_PIXELS = 30000;

	// globals
	svg.init = function(ctx) {
		svg.Definitions = {};
		svg.Styles = {};
		svg.Animations = [];
		svg.Images = [];
		svg.ctx = ctx;
		svg.ViewPort = new (function () {
			this.viewPorts = [];
			this.Clear = function() { this.viewPorts = []; }
			this.SetCurrent = function(width, height) { this.viewPorts.push({ width: width, height: height }); }
			this.RemoveCurrent = function() { this.viewPorts.pop(); }
			this.Current = function() { return this.viewPorts[this.viewPorts.length - 1]; }
			this.width = function() { return this.Current().width; }
			this.height = function() { return this.Current().height; }
			this.ComputeSize = function(d) {
				if (d != null && typeof(d) == 'number') return d;
				if (d == 'x') return this.width();
				if (d == 'y') return this.height();
				return Math.sqrt(Math.pow(this.width(), 2) + Math.pow(this.height(), 2)) / Math.sqrt(2);
			}
		});
	};
	svg.init();

	// images loaded
	svg.ImagesLoaded = function() {
		for (var i=0; i<svg.Images.length; i++) {
			if (!svg.Images[i].loaded) return false;
		}
		return true;
	}

	// trim
	svg.trim = function(s) { return s.replace(/^\s+|\s+$/g, ''); }

	// compress spaces
	svg.compressSpaces = function(s) { return s.replace(/[\s\r\t\n]+/gm,' '); }

	// ajax
	svg.ajax = function(url) {
		var AJAX;
		if(window.XMLHttpRequest){AJAX=new XMLHttpRequest();}
		else{AJAX=new ActiveXObject('Microsoft.XMLHTTP');}
		if(AJAX){
			AJAX.open('GET',url,false);
			AJAX.send(null);
			return AJAX.responseText;
		}
		return null;
	}

	// parse xml
	svg.parseXml = function(xml) {
		if (window.DOMParser)
		{
			var parser = new DOMParser();
			return parser.parseFromString(xml, 'text/xml');
		}
		else
		{
			xml = xml.replace(/<!DOCTYPE svg[^>]*>/, '');
			var xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
			xmlDoc.async = 'false';
			xmlDoc.loadXML(xml);
			return xmlDoc;
		}
	}


	return svg;
});
