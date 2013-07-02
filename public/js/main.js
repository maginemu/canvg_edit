require.config({
	baseUrl: 'js',
});


require(['svg/index'], function(svg) {

	svg.opts = {
		//ignoreDimensions: true
	};
	// ajax
	var ajax = function(url) {
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


	var canvas1 = document.getElementById('cvs1');
	var ctx1 = canvas1.getContext('2d');

	var canvas2 = document.getElementById('cvs2');
	var ctx2 = canvas2.getContext('2d');

	var docStr = ajax('/images/Opera-Tan-9.svg');
	var xmlDoc = new DOMParser().parseFromString(docStr, 'text/xml');

	var e = svg.loadOnlyXmlDoc(ctx2, xmlDoc);

	// initial values
	ctx1.strokeStyle = 'rgba(0,0,0,0)';
	ctx1.lineCap = 'butt';
	ctx1.lineJoin = 'miter';
	ctx1.miterLimit = 4;

	ctx2.strokeStyle = 'rgba(0,0,0,0)';
	ctx2.lineCap = 'butt';
	ctx2.lineJoin = 'miter';
	ctx2.miterLimit = 4;

	e.render(ctx2);

	var part = svg.getElementById('path9772');
	part.setStyle('stroke-width', 15);
	part.attribute('transform', true).value = 'scale(1.5)';
	part.render(ctx1);

});
