'use strict';
const express = require('express');
var app = express();


//code for swagger doc
const expressSwagger = require('express-swagger-generator')(app);

let options = {
    swaggerDefinition: {
        info: {
            description: 'This is a sample server',
            title: 'Swagger',
            version: '1.0.0',
        },
        host: 'localhost:7000',
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




// Configure Express
// var compression = require('compression')
const bodyParser = require('body-parser');
global.__base = __dirname + '/';
var routes = require('./routes/index');

//Configure Environment
const configModule = require('../shared-modules/config-helper/config.js');
var configuration = configModule.configure(process.env.NODE_ENV);
const globalFuncs = require('../shared-modules/global-funcs-helper/global_functions.js'); //instantiate global functions
const tokenManager = require('../shared-modules/token-manager/token-manager.js');

//Configure Logging
const winston = require('winston');
winston.level = configuration.loglevel;

global.__emaildomain = configuration.service_url + ":"+configuration.port.email


const APIRoutes = require('../shared-modules/db-models').APIRoutes;

//Include Custom Modules
//const tokenManager = require('../shared-modules/token-manager/token-manager.js');

// Instantiate application
// app.use(compression())
var bearerToken = '';

// Configure middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, description,type,version");
  bearerToken = req.get('Authorization');
  console.log( "checking token manager" + bearerToken )
  if (bearerToken) {
   req.user = tokenManager.getTokenInfo(req);
   console.log(req.user);
  }
  next();
});


app.use('/api', routes);


// Start the servers
app.listen(configuration.port.macdb);
console.log(configuration.name.macdb + ' service started on port ' + configuration.port.macdb);

