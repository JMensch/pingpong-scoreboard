/**
* Routes for serving HTML pages
*
**/

exports.index = function(req, res){
  res.render('index.html');
};

exports.partials = function(req, res) {
	var type = req.params.type;
	console.log(type);
	res.render('partials/' + type + ".html");
};