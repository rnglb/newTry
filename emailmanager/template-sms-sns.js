let aws = require('aws-sdk');
const env = process.env.NODE_ENV || 'production';

// configure AWS SDK
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

aws.config.update({
    "region": "eu-west-1"
})

// Create SMS Attribute parameters
let params = {
    attributes: { /* required */
      'DefaultSMSType': 'Transactional', /* highest reliability */
      'DefaultSenderID' : 'PhantomCM'
      //'DefaultSMSType': 'Promotional' /* lowest cost */
    }
  };

let sendsms = module.exports = async function (smsVars) {

    const SNS = new aws.SNS({apiVersion: '2010-03-31'})
  // Create promise and SNS service object
 await SNS.setSMSAttributes(params).promise();

 // Create publish parameters

 let publishmsg = await SNS.publish(smsVars).promise()
 console.log(publishmsg)

 
}


//sendmail('resetpass', 'chethan.munikrishna@in.bosch.com', '', { "name": "Chethan" })