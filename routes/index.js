
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index.html');
};

exports.partials = function(req, res) {
	var type = req.params.type;
	res.render('partials/' + type+'.html');
};