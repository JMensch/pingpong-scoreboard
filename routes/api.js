/**
* App API Routes
* @since 1/18/14
* @author james@jamesmensch.com
**/
var db_file = require("../db.js"),
	mongo = db_file.dbConnect(),
	ObjectId = db_file.getObjectId();
/**
* GETs total wins for user
* Singles view
* @return obj user_info
**/
exports.user_info = function (req, res) {
	/**
	* Extracts timestamp from _id
	**/
	ObjectId.prototype.getTimestamp = function() {
    	return new Date(parseInt(this.toString().slice(0,8), 16)*1000).getTime();
	}
	/**
	* Open Mongo Connection to pingpong DB
	**/
  	mongo.connect("mongodb://james:temboparty@localhost:27017/pingpong", function (err, db) {
	  	var results = {};
	  	var user_id = req.body.user_id;
	  	//declare collection
	  	db.collection('data', function (err, collection) {
	  		//get user data
	  		collection.find({},{password : 0}, 
	  			function (err, cursor) {
  				if (err) {
  					res.json({ user_data: err });
  					mongo.close();
  				} else {
  					cursor.toArray(function (err, result) {
  						if (err) {
  							res.json({ user_data: err });
  							mongo.close();
  						} else {
  							for(var i = 0, j = result.length; j > i; i++) {
  								result[i]._id = result[i]._id.toHexString();
  							}
  							results.user_data = result;	
					  	//get games data
					  	db.collection('games', function (err, collection) {
						  		collection.find({ $or: [{
						  									winner: { 
						  										$all: [ 
						  										{"$elemMatch": { 'id' : user_id } }
						  									]
						  								}},
						  								{
						  									loser: {
						  										$all:[
						  											{"$elemMatch": { 'id': user_id}}
						  										]
						  									}
						  								}
						  								] 
						  						}, 
						  			function (err, cursor) {
						  				//order by created date
						  				cursor.sort({ _id: 1 });
						  				cursor.toArray(function (err, result) {
						  					if (err) {
						  						res.json({ games: err });
						  						mongo.close();
						  					} else {
						  						for (var i=0; result.length > i; i++) {
						  							result[i].timestamp = result[i]._id.getTimestamp();
						  						}
						  						results.games = result;
						  						res.json({ data: results });
						  						mongo.close();
						  					}
						  				});
					  			});
						  	});
				  		}
				  	});
				}
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
	// var group_id = ObjectId("52f55ae49d287e03cb213de2");
  	mongo.connect("mongodb://james:temboparty@localhost:27017/pingpong", function (err, db) {
	  	db.collection('data', function (err, collection) {
	  		collection.findOne({ 'username':username, 'password':password }, 
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
};

/**
* Submits game data
* @return bool
**/
exports.submitGame = function(req, res) {
	var series_scores = req.body.games;
	var winner = req.body.winner;
	var loser = req.body.loser;
  	mongo.connect("mongodb://james:temboparty@localhost:27017/pingpong", function (err, db) {
		db.collection('games', function (err, collection) {
			collection.insert({ 'winner': winner, 'loser': loser, 'series': series_scores }, 
				function (err, result) {
					if (err) {
						console.log(err);
						res.json({ err: err });
						mongo.close();
					} else {
						console.log(result);
						res.json({ result: result });
						mongo.close();
					}
			});
		});
	});
};

exports.insertCSV = function(req, res) {
	var data = req.body;
	console.log(data);
  	mongo.connect("mongodb://james:temboparty@localhost:27017/pingpong", function (err, db) {
		db.collection('games', function (err, collection) {
			for (var i=0; data.length > 0; i++) {
				var curr_data = data[i];
				collection.insert({'test':'test'}, {safe : true}, function (err, result) {
					if (err) {
						console.log(err);
					}
				});
			}
		});
		// mongo.close();
	});
}