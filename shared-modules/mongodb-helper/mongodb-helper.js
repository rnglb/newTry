'use strict';

// Declare library dependencies
var MongoClient = require('mongodb').MongoClient;

//Configure Environment
const configModule = require('../config-helper/config.js');
var configuration = configModule.configure(process.env.NODE_ENV);

//Configure Logging
const winston = require('winston');
winston.level = configuration.loglevel;

/**
 * Constructor function
 * @param tableDefinition The defintion of the table being used
 * @param configSettings Configuration settings
 * @constructor
 */

function MongoDBHelper() {

    var db = null;
    var instance = 0;

    async function DbConnect() {
        try {
            let url = configuration.mongoDB.connectString+'/'+configuration.mongoDB.db;
            console.log(url);
            let _db = await MongoClient.connect(url);
            return _db.db(configuration.mongoDB.db)
        } catch (e) {
            console.log(e);
            return e;
        }
    }

    async function Get() {
        try {
            instance++;     // this is just to count how many times our singleton is called.
            winston.debug(`DbConnection called ${instance} times`);

            if (db != null) {
                winston.debug(`db connection is already alive`);
                return db;
            } else {
                winston.debug(`getting new db connection`);
                db = await DbConnect();
                return db;
            }
        } catch (e) {
            return e;
        }
    }

    return {
        Get: Get
    }
}


module.exports = MongoDBHelper();