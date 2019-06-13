const User = require('../../../../../shared-modules/db-models').User;
const UserPerference = require('../../../../../shared-modules/db-models').UserPreference;
const DB = require('../../../../../shared-modules/mongodb-helper')
var express = require('express');
const validator = require('validator');
var router = express.Router();
const generator = require('generate-password');
const sendmail = require('../../email/email');
var request = require('request');

router.post('/create', async function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    const userData = req.body;
    userData.tenantId = req.user.tenantId;
    if(userData.email && userData.email.trim().length == 0){
        delete userData.email
    }

    if (!userData.phone) {
        return ReE(res, 'Please enter a phone number to register.');
    }else {
        let err, user;
        var newPassword = generator.generate({
            length: 8,
            numbers: true
        });
        userData.password = newPassword;
        userData.resetPassword = false;
        userData.enabled = true;
        [err, user] = await to(createUser(userData));

            if (err) return ReE(res, err, 422);

if(user){
        if (userData.email) {
            let userDataBody = {
                "tenantId": userData.tenantId,
                "template": "welcomeUp",
                "to": userData.email,
                "cc": "",
                "emailVars": {
                    "name": userData.firstName + " " + userData.lastName,
                    "tenantId": userData.tenantId,
                    "email": userData.email,
                    "password": userData.password
                }
            }

            let url =
                request({
                    url: __emaildomain + "/email/sendMail",
                    method: "POST",
                    headers: { 'content-type': 'application/json' },
                    json: true,
                    body: userDataBody
                }, function (error, response, body) {
                    if (error) {
                        console.log(error);
                    }
                    console.log("received email response")
                    console.log(body)
                });
        }
        let msg = ` Congratulations, your account has now been setup for Phantom Connected Machines. \r\n
        User ID:  ${userData.userId}   \r\n
        Password: ${userData.password}`

if(userData.email){
        msg = ` Congratulations, your account has now been setup for Phantom Connected Machines. \r\n
        User ID:  ${userData.userId}  or  ${userData.email} \r\n
        Password: ${userData.password}`
}
        let smsBody = {
            "Message": msg,
            "PhoneNumber": userData.phone
        }

        let url =
            request({
                url: __emaildomain + "/sms/sendSms",
                method: "POST",
                headers: { 'content-type': 'application/json' },
                json: true,
                body: smsBody
            }, function (error, response, body) {
                if (error) {
                    console.log(error);
                }
                console.log("received sms response")
                console.log(body)
            });



        return ReS(res, { message: 'Successfully created new user.', user: user.toWeb(), token: user.getJWT() }, 201);
}
    }
});

const createUser = async function (userInfo) {

    let unique_key, auth_info, err;

    auth_info = {}
    auth_info.status = 'create';
    console.log(userInfo);
    unique_key = getUniqueKeyFromBody(userInfo);
    if (!unique_key) TE('Phone number was not entered.');

    if (validator.isMobilePhone(unique_key, 'any')) {//checks if only phone number was sent
        auth_info.method = 'phone';
        userInfo.phone = unique_key;

        [err, user] = await to(User.create(userInfo));
        if (err) TE(err.message);

        return user;
    } else {
        TE('A valid phone number was not entered.');
    }
}

const getUniqueKeyFromBody = function (body) {// this is so they can send in 3 options unique_key, email, or phone and it will work
    let unique_key = body.unique_key;
    if (typeof unique_key === 'undefined') {
        if (typeof body.phone != 'undefined') {
            unique_key = body.phone
        } else {
            unique_key = null;
        }
    }

    return unique_key;
}

router.get('/getAll',async function (req, res) {
    let err, user
    [err, user] = await to(User.find({tenantId:req.user.tenantId}));

    return ReS(res,user);
});

router.put('/update',  async function (req, res) {
    
    let err, user, data,data1;
    let db = await DB.Get();
    data = req.body;
    data1=data ["old_email"];
    delete data["old_email"];

    await db.collection("appusers").updateOne({ "userId": req.body.userId }, { $set: data }, function (err, res) {
        if (err) throw err;
    });
    return ReS(res, { message: 'Updated User: ' + req.body.userId  });

});


router.put('/updstage', async function (req, res) {
    try {
        let db = DB.Get();
        let response = await User.updateOne({ "userId": req.body.userId }, { $set: { "stage": req.body.stage } });
console.log("USER ==>>>" +JSON.stringify(req.body));

        res.json(response);
        res.status(200);
    }
    catch (err) {
        res.status(500).json(err);
    }

});


router.delete('/delete', async function (req, res) {
    let user, err;
    data = req.body;

    [err, user] = await to(User.remove({ "userId": req.body.userId, tenantId: data.tenantId }));
    if (err) return ReE(res, 'error occured trying to delete user');

    return ReS(res, { message: 'Deleted User' }, 204);
});


router.put('/perference/update', async function (req, res) {
    let data = req.body;
    let tenantId = req.user.tenantId ; 
    let db = await DB.Get();
    await UserPerference.update({ tenantId : tenantId },
        { $set: { userType: data.userType , tenantId : tenantId } }, { upsert: true },
        function (err, doc) {
            if (err) return res.send(500, { error: err });
            return res.send("succesfully saved");
        });
    //return ReS(res, { message: 'Updated User Perference' }, 204);
});

router.get('/perference/get', async function (req, res) {
    let user =[], err;
    data = req.body;
    let tenantId = req.user.tenantId ; 
    let db = await DB.Get();
    user.push(await (UserPerference.findOne({tenantId : req.user.tenantId},{_id:0} )));
    //if (err) return ReE(res, 'error occured trying to get user preference');

    return ReS(res,user);
});

module.exports = router;