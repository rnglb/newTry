const express = require('express');
const router = express.Router();

const UserController = require('./../controllers/UserController');
const tokenManager = require('../../shared-modules/token-manager/token-manager.js');
const passport = require('passport');
const path = require('path');
const winston = require('winston')
const generator = require('generate-password');
//const request = require('request-promise-native')
var request = require('request');

//User Controller Dependencies
const User = require('../../shared-modules/db-models').User;
const Tenants = require('../../shared-modules/db-models').Tenant;
const authService = require('./../services/AuthService');

const configModule = require('../../shared-modules/config-helper/config.js');
var config = configModule.configure(process.env.NODE_ENV);

/* GET home page */
router.get('/', function (req, res, next) {
  ReS(res, { service: 'User Manager', isAlive: true })
});


/**
 * Login a User
 */
router.post('/user/login', async function (req, res) {
  const body = req.body;
  try {
    let err, user;
    [err, user] = await to(authService.authUser(req.body));
console.log(user)
    if (err) return ReE(res, err);

    // if (user.tenantId.indexOf(req.body.tenantId) < 0) {
    //   return ReE(res, { message: "Invalid User or Tenant Id Specified" }, 401);
    // }

    if (!user.enabled) {
      return ReE(res, { message: { message: 'Your user id is disabled, Please contact your administrator', userEnabled: false } });
    } else if (user.resetPassword) {
      return ReE(res, { message: { message: 'Please reset your password before logging in', newPasswordRequired: true } });
      return;
    } else {
console.log("calling tenant ... ")
     let tenants = await Tenants.findOne({ tenantId: user.tenantId });
console.log("called tenant ... ")
     return ReS(res, { token: user.getJWT(user.tenantId), user: user.toWeb(),tenantName:tenants.tenantName});
    }
  } catch (err) {
    winston.error('Error logging User: ' + err.message);
    ReE(res, { message: err.message });
  }

});

/**
 * Reset Password
 */
router.post('/user/resetPassword', async function (req, res) {
  const body = req.body;
  let err, user;
  [err, user] = await to(authService.authUser(req.body));

  if (err) return ReE(res, err);

  if (!user.enabled) {
    return ReE(res, { message: { message: 'Your user id is disabled, Please contact your administrator', userEnabled: false } });
  } else if (!body.newPassword) {
    return ReE(res, { message: { message: 'Please enter a new password for reset', newPasswordRequired: true } });
  } else {

    user.password = body.newPassword;
    user.resetPassword = false;
    user.updatedBy = body.email;

    [err, user] = await to(user.save());
    if (err) {
      winston.error(err);
      if (err.message.includes('E11000')) {
        if (err.message.includes('phone')) {
          err = 'This phone number is already in use';
        } else if (err.message.includes('email')) {
          err = 'This email address is already in use';
        } else {
          err = 'Duplicate Key Entry';
        }
      }
      return ReE(res, err);
    }
    return ReS(res, { message: 'Password successfully reset. Please login' });
  }
});


/**
 * Reset Password
 */
router.post('/user/forgotPassword', async function (req, res) {
  const body = req.body;
  let err, user;

    [err, user] = await to(User.findOne({
        $or: [{
            email: body.email
        }, {
            userId: body.email
        }]
    }));


//  [err, user] = await to(User.findOne({ email: body.email}));

  if (err) return ReE(res, err);

  if (!user.enabled) {
    return ReE(res, { message: { message: 'Your user id is disabled, Please contact your administrator', userEnabled: false } });
  } else {

    var newPassword = generator.generate({
      length: 8,
      numbers: true
    });

    user.password = newPassword;
    // user.resetPassword = true;
    user.updatedBy = body.email;

    [err, user] = await to(user.save());

    if (err) {
      return ReE(res, { error: err });
    }

    let msg = ` Phantom Connected Machines password is reset. \r\n
    User ID:  ${user.userId}\r\n
    New Password: ${newPassword}`
    let smsBody = {
      "Message": msg,
      "PhoneNumber": user.phone
    }

    sendSMS(smsBody);

    //Send Password Reset Email and then response
    // console.log(newPassword)
    //  await sendEmail({ template: "resetpass", tenantId: user.tenantId, to: body.email, cc: '', emailVars: { name: user.firstName, password: newPassword } })

    return ReS(res, { message: 'Password successfully reset and sent to registered phone number' });
  }
});

/**
 * Get a list of tenant id's for a user
 */
router.get('/user/tenant/:id', async function (req, res, next) {
  winston.debug('Getting tenant for user: ' + req.params.id);
  var tenantId = tokenManager.getTenantId(req);

  // init params structure with request params
  let filter = {
    email: req.params.id
  }

  let project = { tenantId: 1, _id: 0 }

  // construct the helper object
  try {


    //let tenant = await User.find(filter, project);

    let tenant = await User.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "tenants",
          localField: "tenantId",
          foreignField: "tenantId",
          as: "tenantInfo"
        }
      },
      { $unwind: "$tenantInfo" },
      { $project: { "tenantId": "$tenantInfo.tenantId", tenantName: "$tenantInfo.tenantName", _id: 0 } }
    ])

    console.log(JSON.stringify(tenant))

    if (tenant.length == 0) {
      winston.error('User not Found: ' + req.params.id);
      ReE(res, { message: `User ${req.params.id} not found` });
    } else {
      winston.debug('User details' + req.params.id + ' retrieved');
      ReS(res, tenant);
    }
  } catch (err) {
    winston.error('Error getting Users details: ' + err.message);
    ReE(res, { message: err.message });
  }
})



module.exports = router;

function sendEmail(userDataBody) {
  console.log(userDataBody)

  request({
    url: config.url.email + "/sendMail",
    method: "POST",
    headers: { 'content-type': 'application/json' },
    json: true,
    body: userDataBody
  }, function (error, response, body) {
    if (error) {
      console.log(error);
    }
    console.log("received response")
    console.log(body)
  });

}

function sendSMS(smsBody) {
  console.log(smsBody)
  request({
    url: config.service_url + ":" + config.port.email + '/sms/sendSms',
    method: "POST",
    headers: { 'content-type': 'application/json' },
    json: true,
    body: smsBody
  }, function (error, response, body) {
    if (error) {
      console.log(error);
    }
    console.log("received response")
    console.log(body)
    return body;
  });

}