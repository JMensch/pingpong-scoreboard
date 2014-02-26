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
  					db.close();
  				} else {
  					cursor.toArray(function (err, result) {
  						if (err) {
  							res.json({ user_data: err });
  							db.close();
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
						  						db.close();
						  					} else {
						  						for (var i=0; result.length > i; i++) {
						  							result[i].timestamp = result[i]._id.getTimestamp();
						  						}
						  						results.games = result;
						  						res.json({ data: results });
						  						db.close();
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
	  					db.close();
	  				} else {
					  	res.json({ user_id: result._id });
					  	db.close();
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
						db.close();
					} else {
						// console.log(result);
						res.json({ result: result });
						db.close();
					}
			});
		});
	});
};

exports.updateOverallStats = function(req, res) {
	var winner = req.body.winner;  
	var loser = req.body.loser;
	var winners = [],
		losers = [];
	for(var i=0; winner.length > i; i++) {
		winners.push(ObjectId(winner[i].id));	
	}
	for(var i=0; loser.length > i; i++) {
		losers.push(ObjectId(loser[i].id));
	}
	// console.log(winners);
	mongo.connect("mongodb://james:temboparty@localhost:27017/pingpong", function (err, db) {
		db.collection('data', function (err, collection) {
			collection.update( { _id: { $in: winners }}, { $inc: { total_wins: 1}}, {multi: true},function (err, result) {
				if (!err) {
					collection.update( { _id: { $in: losers }}, { $inc: { total_losses: 1}}, {multi:true},function (err, result) {
						if (err) {
							db.close();
						} else {
							console.log(result);
							res.json({ result: result });
							db.close();
						}
					});
				} else {
					console.log(err);
					db.close();
				}
			});
		});
	});
};