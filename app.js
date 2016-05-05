// ==== APP DEPENDENCIES ====
// 3rd-party
var express       		= require('express');
var path          		= require('path');
var favicon       		= require('serve-favicon');
var morgan        		= require('morgan');
var cookieParser		= require('cookie-parser');
var bodyParser    		= require('body-parser');
var session       		= require('express-session');
var mongoose			= require('mongoose');
var ejs 				= require('ejs');
var passport 			= require('passport');
var flash    			= require('connect-flash');
var request				= require('request');

// config
var databaseConfig		= require('./config/database');
var languageConfig		= require('./config/language');

var passportConfig		= require('./config/passport');
var authorizationConfig	= require('./config/authorization');
var apikeysConfig		= require('./config/apikeys');

// lib
var databaseHelper 		= require('./lib/module/databaseHelper');
var returnHelper 		= require('./lib/module/returnHelper');
var socketEmitter		= require('./lib/module/socketEmitter');

var tokenHandler 		= require('./lib/module/tokenHandler');
var authHandler 		= require('./lib/module/authHandler');

var translator 			= require('./lib/module/translator');
var colorizer			= require('./lib/module/colorizer');

// router
var authRouter			= require('./routes/AuthRouter');
var indexRouter		= require('./routes/index');
var raceRouter		= require('./routes/RaceRouter');
var userRouter		= require('./routes/UserRouter');
var participantRouter = require('./routes/ParticipantRouter');

// ==== APP INITIALIZATION ====
var app = express();

// pre setup module setup
databaseHelper 	= databaseHelper(mongoose, databaseConfig);
translator 		= translator('./../../lang', languageConfig);

authHandler		= authHandler(mongoose, authorizationConfig);
tokenHandler 	= tokenHandler(mongoose.model('User'));

passportConfig(passport, mongoose.model('User'), apikeysConfig, translator);
ejs.filters.trans = translator.translate;

app.use(returnHelper);
app.use(translator.middleware);

// setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'B U L L E T B U L L E T B U L L E T' })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

// post setup module setup
app.use(tokenHandler.middleware);

// router init
authRouter 			= authRouter(passport, authHandler);
raceRouter 			= raceRouter(databaseHelper.repositories.Race, databaseHelper.repositories.Participant, databaseHelper.repositories.Waypoint, authHandler, request);
userRouter 			= userRouter(databaseHelper.repositories.User, databaseHelper.repositories.Participant, databaseHelper.repositories.Race, authHandler);
participantRouter 	= participantRouter(databaseHelper.repositories.Participant)

// ==== ROUTING ====
app.use('/', indexRouter);
app.use('/', authRouter);
app.use('/dota/:id', function(req, res) {
	socketEmitter.emitToRace(req.params.id, { user: 'server', message: 'A message to the room: ' + req.params.id });
	res.json({ success: true });
});
app.use('/race', raceRouter);
app.use('/user', userRouter);
app.use('/participant', participantRouter);

// no router applicable, catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('global.notFound');
	err.status = 404;
	next(err);
});

// ==== GLOBAL ERROR HANDLERS ====
// todo: put in external module.

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {	
	app.use(function(err, req, res, next) {
		console.error(colorizer.modify(['bright', 'white', 'bgred'], err.stack));
		res.status(err.status || 500);
		res.render('error', {
			title: err.title,
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', {
		title: err.title,
		message: err.message,
		error: err
	});
});

// module.exports = app;

module.exports = {
	app: app,
	socketEmitter: socketEmitter
};