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


	var canvas = document.getElementById('cvs');
	var ctx = canvas.getContext('2d');

	var docStr = ajax('/images/Opera-Tan-9.svg');
	var xmlDoc = new DOMParser().parseFromString(docStr, 'text/xml');

	var e = svg.loadXmlDoc(ctx, xmlDoc);

});
