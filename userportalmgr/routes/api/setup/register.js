const DB = require('../../../../shared-modules/mongodb-helper/mongodb-helper')
var express = require('express');
var router = express.Router();
const generator = require('generate-password');
const validator = require('validator');
var request = require('request');
const Tenant = require('../../../../shared-modules/db-models').Tenant;
const User = require('../../../../shared-modules/db-models').User;
const Shift = require('../../../../shared-modules/db-models').Shift;
const downtimereason = require('../../../../shared-modules/db-models').DownTimeReasons;
const userpref = require('../../../../shared-modules/db-models').UserPreference;


/**
 * @api {post} /register Create Tenant
 * @apiName createtenant
 * @apiGroup
 * @apiDescription Create a Tenant
 * @apiParam {Object} Tenant Object.
 */
router.post('/', async function (req, res) {

    var regdata = req.body;
    // construct the helper object
    try {

        if (
            !regdata.tenantname ||
            !regdata.email ||
            !regdata.phone ||
            !regdata.fname ||
            !regdata.lname ||
            !regdata.userId
        ) {
            console.log(JSON.stringify(regdata))
            throw new Error('Invalid param')
        }

        if (!validator.isEmail(regdata.email)) {
            TE('A valid email was not provided.');
        }

        let tenantObj = {
            "tenantName": regdata.tenantname,
            "plan": "Gold",
            "email": regdata.email,
            "enabled": true,
            "preventiveMaintenance": "plannedDowntime",
            "smallStops": "5"
        }

        let userData = {
            "email": regdata.email,
            "firstName": regdata.fname,
            "lastName": regdata.lname,
            "phone": regdata.phone,
            "sysRole": "Admin",
            "userId": regdata.userId
        }

        let maxTenantId = await Tenant.aggregate([{ $match: { "tenantId": { $ne: "system" } } },
        { $sort: { "tenantId": -1 } },
        { $limit: 1 },
        { $project: { "tenantId": 1, "_id": 0 } }]);

        let len = 8
        maxTenantId.forEach((ele) => {
            let tntId = (parseInt(ele.tenantId) + 1).toString();
            console.log(tntId)
            tntId =  tntId.padStart(8, '0'); // '0005'
            console.log(tntId)
            tenantObj.tenantId = tntId;
        });


        let tenant = await Tenant.create(tenantObj);
        let db = await DB.Get();
        if (tenant) {
            await Shift.find({ tenantId: "system" }).select({"tenantId":1, "days":1, "type":1, "mode":1 ,"shiftDetails":1, "shiftId":1,"_id":0}).then(async function (shifts) {
                shifts.forEach(async function (i) {
                    i.tenantId = tenant.tenantId;
                   // await Shift.create(i);
                      await db.collection("shifts").insert(i);

               });

            });

            let val = [{ "tenantId": tenant.tenantId, "downTimeReasons": "Setup Time", "isPrimary": 1, "isSecondaryReasonsNeeded": 0, "secondaryReasons": [] },
            { "tenantId": tenant.tenantId, "downTimeReasons": "Tooling Issue", "isPrimary": 1, "isSecondaryReasonsNeeded": 1, "secondaryReasons": [] },
            { "tenantId": tenant.tenantId, "downTimeReasons": "Machine Issue", "isPrimary": 1, "isSecondaryReasonsNeeded": 1, "secondaryReasons": [] },
            { "tenantId": tenant.tenantId, "downTimeReasons": "Operator not available", "isPrimary": 1, "isSecondaryReasonsNeeded": 0, "secondaryReasons": [] },
            { "tenantId": tenant.tenantId, "downTimeReasons": "Material not available", "isPrimary": 1, "isSecondaryReasonsNeeded": 0, "secondaryReasons": [] },
            { "tenantId": tenant.tenantId, "downTimeReasons": "Other reasons", "isPrimary": 1, "isSecondaryReasonsNeeded": 0, "secondaryReasons": [] }];

            for (var i = 0, size = val.length; i < size; i++) {
                await downtimereason.create(val[i]);
            }

            let userpreobj = {
                "tenantId": tenant.tenantId, 
                "userType": [
                    {
                        'userType': 'Executive',
                        'perference': {
                            'Admin': 'Active',
                            'Engineer': 'Active',
                            'Standard': 'Active',
                            'Operator': 'Inactive'
                        }
                    },
                    {
                        'userType': 'Supervisor',
                        'perference': {
                            'Admin': 'Inctive',
                            'Engineer': 'Active',
                            'Standard': 'Active',
                            'Operator': 'Active'
                        }
                    },
                    {
                        'userType': 'Operator',
                        'perference': {
                            'Admin': 'Inactive',
                            'Engineerg': 'Inactive',
                            'Standard': 'Inactive',
                            'Operator': 'Active'
                        }
                    }
                ],
                'template': 'default'
            };

           await userpref.create(userpreobj);
                
        var newPassword = generator.generate({
            length: 8,
            numbers: true
        });
        userData.tenantId = tenantObj.tenantId;
        userData.password = newPassword;
        userData.resetPassword = false;
        userData.enabled = true;

        [err, user] = await to(User.create(userData));
        if (err) TE(err.message);

        let emailBody = {
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
                body: emailBody
            }, function (error, response, body) {
                if (error) {
                    console.log(error);
                }
                console.log("received response")
                console.log(body)
                console.log(`Tenant ${regdata.tenantname}  created`);
                return ReS(res, { message: `Tenant ${regdata.tenantname}  created`, data: tenant })
            });

        }

    } catch (err) {
        console.log('Error creating new Tenant: ' + err.message);
        return ReE(res, { message: { "Error": "Error creating Tenant, error:" + err.message } });
    }
});


module.exports = router;