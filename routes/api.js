/**
* App API Routes
* @since 1/18/14
* @author james@jamesmensch.com
**/
var mongoclient = require("../db.js"),
	mongo = mongoclient.dbConnect(),
	ObjectId = mongoclient.getObjectId();
/**
* GETs total wins for user
* Singles view
* @return obj user_info
**/
exports.user_info = function (req, res) {
  	mongo.open(function (err, mongo) {
	  	var db = mongo.db("pingpong");
	  	var twoweeksago = new Date(new Date().getTime() - 12096e5);
	  	var results = {};
	  	//declare collection
	  	db.collection('data', function (err, collection) {
	  		//get user data
	  		collection.find( {}, {password : 0},
	  			function (err, cursor) {
	  				cursor.sort({ total_win_pct : -1 });
	  				cursor.toArray(function (err, result) {
	  					console.log(result);
		  				if (err) {
		  					res.json({ user_data: err });
		  					mongo.close();
		  				} else {
		  					results.user_data = result;
						  	//get games data
						  	db.collection('games', function (err, collection) {
						  		collection.ensureIndex({ player: 1 }, function () {
							  		collection.find({ gametype: 'singles', player: 'james' }, 
							  			function (err, cursor) {
							  				cursor.sort({ timestamp: -1 });
							  				cursor.toArray(function (err, result) {
							  					if (err) {
							  						res.json({ games: err });
							  						mongo.close();
							  					} else {
							  						results.games = result;
							  						res.json({ data: results });
							  						mongo.close();
							  					}
							  				});
							  			});
						  		});
						  	});
		  				}
	  				});
	  			});
	  	});	
	});
};

/**
* Authenticates user
* @return user_id
**/
exports.login = function(req, res) {
	var username = req.body.username;
	var password = req.body.password;

  	mongo.open(function (err, mongo) {
	  	var db = mongo.db("pingpong");
	  	db.collection('data', function (err, collection) {
	  		collection.findOne({ 'username': username, 'password':password }, 
	  			function (err, result) {
	  				if (err) {
	  					res.json({ user_data: err });
	  					mongo.close();
	  				} else {
					  	res.json({ user_id: result._id });
					  	mongo.close();
	  				}
	  		});
	  	});	
	});
}