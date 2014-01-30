/**
* Database connection file
* @since 1/18/14
* @author james@jamesmensch.com
**/
var MongoClient = require('mongodb').MongoClient,
  	Server = require('mongodb').Server,
  	ObjectId = require('mongodb').ObjectID;
/**
* Connects to database
**/
exports.dbConnect = function() {
	var db = new MongoClient(new Server('localhost', 27017));
	if (db) {
		return db;
	} else {
		return false;
	}
}

/**
* Allows find() by ObjectId
**/
exports.getObjectId = function() {
	if (ObjectId) {
		return ObjectId;
	} else {
		return false;
	}
}

/**
* Test DB connection
**/
exports.testDB = function() {
	var mongo = new MongoClient(new Server('localhost', 27017));
	mongo.open(function(err, mongo) {
	  	if (err) {
	  		throw err;
	  	} else {
	  		console.log('Database connection successful');
	  	}
	  	mongo.close();
	});
}