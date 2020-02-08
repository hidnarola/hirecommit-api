//Import the mongoose module
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var config = require('../config');

// console.log("DB = ", config.database);
//Set up default mongoose connection
var mongoDB = config.database;
// mongoose.connect(mongoDB, { auth: { authdb: "admin" }, useMongoClient: true });
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
// mongoose.set('useCreateIndex', true);
// mongoose.set('useFindAndModify', false);
//Get the default connection
var db = mongoose.connection;

// CONNECTION EVENTS
// When successfully connected
db.on('connected', function () {
    console.log('mongoose db connected ==> ');
});

// If the connection throws an error
db.on('error', function (err) {
    console.log('Mongoose default connection error: ' + err);
});

// When the connection is disconnected
db.on('disconnected', function () {
    console.log('Mongoose default connection disconnected');
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function () {
    db.close(function () {
        // console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});
