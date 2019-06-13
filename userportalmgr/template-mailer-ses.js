const Email = require('email-templates');
const nodemailer = require('nodemailer');
const proxy = require('proxy-agent')
const path = require('path');

let aws = require('aws-sdk');
const env = process.env.NODE_ENV || 'production';

// configure AWS SDK
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

aws.config.update({
    "region": "eu-west-1"
})

let sendmail = module.exports = function (emailTemplate, toList, ccList, emailVars) {
    const email = new Email({
        message: {
            from: 'Connected Machine<notifications@seam-up.com>'
        },
        // uncomment below to send emails in development/test env:
        send: true,
        preview: false,
        transport: nodemailer.createTransport({
            SES: new aws.SES({
                apiVersion: '2010-12-01'
            }),
            sendingRate: 1// max 1 messages/second
        }),
        preview: {
            app: 'firefox',
            wait: false
          },
        
        views: {
            options: {
                extension: 'ejs' // <---- HERE
            }
        },
        subjectPrefix: env === 'production' ? false : `[${env.toUpperCase()}] ` // <--- HERE
    })

    console.log('template path:'+path.join(__dirname,'emails' ,emailTemplate));

    return email
        .send({
            template: emailTemplate,
            message: {
                to: toList,
                cc: ccList
            },
            locals: emailVars
        })
}


//sendmail('resetpass', 'chethan.munikrishna@in.bosch.com', '', { "name": "Chethan" })