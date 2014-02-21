
/**
 * Module dependencies.
 */
var express = require('express'),
	mongo = require("./db.js"),
    routes = require('./routes'),
    api = require('./routes/api'),
    http = require('http'),
    path = require('path');

var app = express();
	  mongo.testDB();
// all environments
app.use(express.favicon(__dirname + '/public/images/favicon.png')); 
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);

/**
* App Routing
**/
app.get('/', routes.index);
app.get('/partials/:type', routes.partials);

/**
* API routing
**/
app.post('/api/login', api.login);
app.post('/api/user_info', api.user_info);
app.post('/api/submitGame', api.submitGame);
app.post('/api/insertCSV', api.insertCSV);

/**
* Catch-all
**/
app.get('*', routes.index);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

