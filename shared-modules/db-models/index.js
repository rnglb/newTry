var fs = require('fs');
var path = require('path');
var basename = path.basename(__filename);
var models = {};
const mongoose = require('mongoose');
const configModule = require('../../shared-modules/config-helper/config.js');
const winston = require('winston');

var config = configModule.configure(process.env.NODE_ENV);

if (config.mongoDB.connectString) {
    var files = fs
        .readdirSync(__dirname)
        .filter((file) => {
            return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
        })
        .forEach((file) => {
            var filename = file.split('.')[0];
            var model_name = filename.charAt(0).toUpperCase() + filename.slice(1);
            models[model_name] = require('./' + file);
        });

    mongoose.Promise = global.Promise; //set mongo up to use promises
    const mongo_location = config.mongoDB.connectString + '/' + config.mongoDB.db;

    mongoose.connect(mongo_location).catch((err) => {
        winston.error('*** Can Not Connect to Mongo Server:', mongo_location);
    })

    let db = mongoose.connection;
    module.exports = db;
    db.once('open', () => {
        winston.debug('Connected to mongo at ' + mongo_location);
    })
    db.on('error', (error) => {
        winston.error("error", error);
    })
    // End of Mongoose Setup
} else {
    winston.error("No Mongo Credentials Given");
}

module.exports = models;
