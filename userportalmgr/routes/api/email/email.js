const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();

//Configure Environment
const configModule = require('../../../../shared-modules/config-helper/config.js');
var configuration = configModule.configure(process.env.NODE_ENV);
const globalFuncs = require('../../../../shared-modules/global-funcs-helper/global_functions.js'); //instantiate global functions
const EmailLog = require('../../../../shared-modules/db-models').EmailLog;

//Configure Logging
const winston = require('winston');
winston.level = configuration.loglevel;

//Include Custom Modules
const tokenManager = require('../../../../shared-modules/token-manager/token-manager.js');
const sendMail = require('../../../template-mailer-ses');

let sendmail = module.exports = async function (emailTemplate, toList, emailVars) {
    console.log("inside email ..... "+emailTemplate)
    winston.debug('Sending Email for Template: ' +emailTemplate);
    let emailLogData = {
        tenantId: emailVars.tenantId,
        template: emailTemplate,
        to: toList,
        cc: '',
        emailVars: emailVars,
        ts: new Date().getTime(),
        response: '',
        success: true
    }
    let err, response;
    [err, response] = await to(sendMail(emailTemplate,toList, '', emailVars));
    if (err) {
console.log('Problem sending email' + JSON.stringify(err))        
winston.debug('Problem sending email' + JSON.stringify(err));
        emailLogData.response = err;
        emailLogData.success = false;
        return err;
    } else {
        winston.debug('Email successfully sent ');
        emailLogData.response = response;
        emailLogData.success = true;
        await EmailLog.create(emailLogData)
        return response;
    }
};

