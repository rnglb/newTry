#!/usr/bin/env node

var compression = require('compression')
const express = require('express');
const bodyParser = require('body-parser');
const winston = require('winston');

const passport = require('passport');
const v1 = require('./routes/v1');

// Configure Environment
const tokenManager = require('../shared-modules/token-manager/token-manager.js');
const globalFuncs = require('../shared-modules/global-funcs-helper/global_functions.js'); //instantiate global functions
const configModule = require('../shared-modules/config-helper/config.js');
var configuration = configModule.configure(process.env.NODE_ENV);

const APIRoutes = require('../shared-modules/db-models').APIRoutes;

// Init the winston log level
winston.level = configuration.loglevel;


//Variables that are provided through a token
var bearerToken = '';
var tenantId = '';

// instantiate application
var app = express();
app.use(compression())
// configure middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

//swagger Code
const expressSwagger = require('express-swagger-generator')(app);

let options = {
    swaggerDefinition: {
        info: {
            description: 'This is a sample server',
            title: 'Swagger',
            version: '1.0.0',
        },
        host: 'localhost:6001',
        basePath: '/',
        produces: [
            "application/json",
            "application/xml"
        ],
        schemes: ['http', 'https'],
        securityDefinitions: {
            JWT: {
                type: 'apiKey',
                in: 'header',
            //    name: 'Authorization',
                description: "",
            }
        }
    },
    basedir: __dirname, //app absolute path
    files: ['./server.js'] //Path to the API handle folder
};
expressSwagger(options)






//Passport
app.use(passport.initialize());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Origin, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, Access-Control-Allow-Headers, X-Requested-With, Access-Control-Allow-Origin");
  bearerToken = req.get('Authorization');
  if (bearerToken) {
    req.user = tokenManager.getTokenInfo(req);
  }
  next();
});

app.get('/', function (req, res) {
  ReS(res, { service: 'User Manager', isAlive: true })
});

app.use('/', v1);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  err.message = 'Invalid Resource Requested';
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  ReE(res, { message: err }, err.status || 500)

});

// Start the service
app.listen(configuration.port.user);
winston.debug(configuration.name.user + ' service started on port ' + configuration.port.user);

