var createError = require('http-errors');
var express = require('express');
var path = require('path');
var fs = require('fs');
var auth = require('./middlewares/auth');
var authorization = require('./middlewares/authorization');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var dotenv = require('dotenv').config();
var fileUpload = require('express-fileupload');
var expressValidator = require('express-validator');
var cors = require('cors');
//var cron_jobs = require('./crons/index');
var compression = require('compression')
var timeout = require('connect-timeout');

var swaggerUi = require('swagger-ui-express'),
  swaggerDocument = require('./swagger.json');

// Create cluster environment
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

/* config files */

var config = require('./config');
var dbConnect = require('./database/mongoDbConnection');

var app = express();

app.use(fileUpload());
app.use(cors());
app.set('view engine', 'ejs');
app.set('view options', {
  layout: false
});
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'doc')));
app.use('/upload', express.static(path.join(__dirname, 'upload')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(expressValidator());
var options = {
  swaggerOptions: {
    authAction: { JWT: { name: "JWT", schema: { type: "apiKey", in: "header", name: "x-access-token", description: "" }, value: "<JWT>" } }
  }
};


app.use(compression())

app.use('/api/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
// Support cross origin request
// app.use(function (req, res, next) {
//   // Website you wish to allow to connect
//   res.setHeader('Access-Control-Allow-Origin', '*');

//   // Request methods you wish to allow
//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

//   // Request headers you wish to allow
//   res.setHeader('Access-Control-Allow-Headers', 'x-access-token,content-type');

//   // Set to true if you need the website to include cookies in the requests sent to the API (e.g. in case you use sessions)
//   res.setHeader('Access-Control-Allow-Credentials', true);

//   // If option request, send okay response
//   if (req.method == 'OPTIONS') {
//     res.status(200).json();
//   } else {
//     next()
//   }
// });

var index = require('./routes/index');

var admin = require('./routes/admin');

var candidate = require('./routes/candidate');

var employer = require('./routes/employer');
//var customer = require('./routes/customer');

app.use('/', index);

app.use('/admin', admin);

app.use('/employer', employer);
app.use('/candidate', candidate);
//app.use('/customer', customer);

app.get('/', (req, res) => {
  res.send('<h3>HireCommit API Server</h3>');
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// development error handler, will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.json({
      message: err.message,
      error: err
    });
  });
}

//  time out handline
app.use(timeout(60000));
app.use(haltOnTimedout);

function haltOnTimedout(req, res, next) {
  if (!req.timedout) next();
}

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500).send({ success: false, message: err.message });
  // res.render('error');
});

//cron_jobs.init();

module.exports = app;
