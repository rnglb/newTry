'use strict';

// Configure Express
const express = require('express');
const bodyParser = require('body-parser');

//Configure Environment
const configModule = require('../shared-modules/config-helper/config.js');
var configuration = configModule.configure(process.env.NODE_ENV);
const globalFuncs = require('../shared-modules/global-funcs-helper/global_functions.js'); //instantiate global functions

//Configure Logging
const winston = require('winston');
winston.level = configuration.loglevel;

//Include Custom Modules
const tokenManager = require('../shared-modules/token-manager/token-manager.js');
const sendMail = require('./template-mailer-ses');
const sendSms = require('./template-sms-sns');
const EmailLog = require('../shared-modules/db-models').EmailLog;

// Instantiate application
var app = express();
var bearerToken = '';

//swagger code
const expressSwagger = require('express-swagger-generator')(app);

let options = {
    swaggerDefinition: {
        info: {
            description: 'This is a sample server',
            title: 'Swagger',
            version: '1.0.0',
        },
        host: 'localhost:6010',
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




// Configure middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
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

/* GET home page */
app.get('/', function (req, res, next) {
    ReS(res, { service: 'Email Manager', isAlive: true })
});


app.get('/email/health', function (req, res, next) {
    ReS(res, { service: 'Email Manager', isAlive: true })
});


app.post('/email/sendMail', async function (req, res) {


    let body = req.body
    let tenantId = body.tenantId;

    winston.debug('Sending Email for Template: ' + body.template);


    let emailLogData = {
        tenantId: tenantId,
        template: body.template,
        to: body.to,
        cc: body.cc || '',
        emailVars: body.emailVars,
        ts: new Date().getTime(),
        response: '',
        success: true
    }

    console.log(body);

    let err, response;
    console.log(body);

    [err, response] = await to(sendMail(body.template, body.to, body.cc, body.emailVars));

    if (err) {
        winston.debug('Problem sending email' + JSON.stringify(err));
        emailLogData.response = err;
        emailLogData.success = false;
        await EmailLog.create(emailLogData)
        return ReE(res, err);

    } else {
        winston.debug('Email successfully sent ');
        emailLogData.response = response;
        emailLogData.success = true;
        await EmailLog.create(emailLogData)
        return ReS(res, { message: "Successfully Sent" });
    }


});

app.post('/sms/sendSms', async function (req, res) {


    let body = req.body
    winston.debug('Sending Email for Template: ' + body.template);

    let err, response;
    console.log(body);

    [err, response] = await to(sendSms(body));

    if (err) {
        winston.debug('Problem sending SMS' + JSON.stringify(err));
        return ReE(res, err);

    } else {
        winston.debug('SMS successfully sent ');
        return ReS(res, { message: "Successfully Sent SMS" });
    }


});

// Start the servers
app.listen(configuration.port.email);
console.log(configuration.name.email + ' service started on port ' + configuration.port.email);