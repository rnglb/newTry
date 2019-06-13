const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var moment = require('moment');
var rp = require('request-promise');
const Asset = require('../../../../shared-modules/db-models').Asset;
const Factory = require('../../../../shared-modules/db-models').Factory;
const Tenant = require('../../../../shared-modules/db-models').Tenant;
var ObjectID = require('mongodb').ObjectID;
const globalFuncs = require('../../../../shared-modules/global-funcs-helper/global_functions.js'); //instantiate global functions


// Configure Logging
const winston = require('winston')
winston.level = "debug";

router.get('/getAll', async function (req, res) {

    let status = req.query.status;
    let filter = { "tenantId": req.user.tenantId };
    if (status == "active") {
        filter.status = status;
    }
    let project = 'assetId assetName assetModel assetType internalname internalcode assetMake ' +
        'factory factoryId group hwId status maintDt maintcycle maintunit partNumber runrate devices.devName devices.devId computed.NILM.partcnt.value computed.NILM.deviceStatus.value location'
    winston.info(req.user.tenantId)
    winston.info(filter)
    try {
        let assets = await Asset.find(filter, project).sort({ "locId": 1, "group": 1, "assetName": 1 });
        //let assets = await Asset.aggregate([{ $match: { "tenantId": req.user.tenantId } }, { $unwind: "$devices" }, { $project: project }]);
        res.json(assets);
    }
    catch (err) {
        winston.error(err);
        res.json(err.message);
    }

})


router.get('/:assetId', async function (req, res) {
    try {
        // let project = 'assetId assetName assetModel assetType internalname internalnode assetMake factory group hwId status maintDt maintcycle maintunit -_id'
        // let project = {
        //     "deviceId": "$devices.devId", "assetId": 1, "assetName": 1, "assetModel": 1, "assetType": 1, "internalname": 1, "internalcode": 1, "assetMake": 1, "factory": 1, "group": 1, "hwId": 1, "status": 1, "maintDt": 1, "maintcycle": 1, "maintunit": 1, "-_id": 1, Location:
        //     {
        //         $cond: { if: { $eq: ["$locId", '94f28780-89d2-4d80-9f75-64dccafc38b5'] }, then: 'Bangalore', else: 'Others' }
        //     }
        // };
        winston.info(req.params.assetId)
        let project = 'assetId assetName assetModel assetType internalname internalcode assetMake factory factoryId group hwId ' +
            'status maintDt maintcycle maintunit devices.devName devices.devId computed.NILM.deviceStatus.value location '
        let assets = await Asset.find({ "assetId": req.params.assetId }, project).sort({ _id: -1 });
        res.json(assets);
    }
    catch (err) {
        winston.error(err);
        res.json(err.message);
    }

})


/**
 * @api {post} /Asset Create Asset
 * @apiName createAsset
 * @apiGroup Asset Manager
 * @apiDescription Create a Asset
 * @apiParam {Object} Asset Object.
 */
router.post('/createasset', async function (req, res) {
    var asset = req.body;
    asset.tenantId = req.user.tenantId;
    asset.assetId = req.body.assetId;

    // construct the helper object
    try {

        //Get the Details of the location and embed into the Asset
        let factoryFilter = {
            tenantId: asset.tenantId,
            name: asset.factory
        }

        let factoryDetails = await Factory.findOne(factoryFilter);


        if (!factoryDetails) {
            return ReE(res, { message: { "Error": `Unable to get the factory details for factory ${asset.factory}` } });
        }

        let tenantDtl = await Tenant.findOne({ tenantId: asset.tenantId });

        if (!tenantDtl) {
            return ReE(res, { message: { "Error": `Unable to get the tenant details for factory ${asset.factory}` } });
        }

        asset.factoryId = ObjectID(factoryDetails._id)
        asset.location = factoryDetails.location
        if (tenantDtl.smallStops) {
            asset.smallstop = parseInt(tenantDtl.smallStops) * 60 * 1000
        }


        let assetCompute = {
            "NILM": {
                "partcnt": {
                    "value": 0,
                    "desc": "Total Part Count",
                    "ts": 0
                },
                "energy": {
                    "value": 0,
                    "desc": "Total Energy",
                    "ts": 0
                },
                "availmins": {
                    "value": 0,
                    "desc": "Active Minutes",
                    "ts": 0
                },
                "deviceStatus": {
                    "value": "On",
                    "desc": "",
                    "ts": 0
                },
                "lastMsgts": {
                    "ts": 0
                }
            }
        }

        var d = new Date();
        let startTs = moment().utcOffset(5.5).startOf('day').valueOf();
        let currTs = d.getTime() - startTs;
        let today = d.getDay()

        //sunday to be accounted as 7 and not 0
        if (today === 0) {
            today = 7
        }

        if (factoryDetails) {
            let shiftarray = factoryDetails.shift;
            shiftarray.forEach((ele) => {
                if (ele.days && ele.days.indexOf(today) > -1) {
                    let sftDtls = ele.shiftDetails;
                    sftDtls.forEach((detail) => {
                        if (currTs > detail.Timings.Fromts && currTs < detail.Timings.Tots) {
                            assetCompute.NILM.shift = {};
                            assetCompute.NILM.shift.name = detail.Name
                            assetCompute.NILM.shift.startsftts = detail.Timings.Fromts
                            assetCompute.NILM.shift.endsftts = detail.Timings.Tots
                        }
                    });
                }
            })
        }

        asset.computed = assetCompute;
        asset.status = 'new';

        let result = await Asset.create(asset);
        // winston.debug(`Asset ${asset.assetName} with AssetId ${asset.assetId} created`);
        return ReS(res, { message: `Asset ${asset.assetName}  AssetId ${asset.assetId} created`, data: result })

    } catch (err) {
        //  winston.error('Error creating new Asset: ' + err.message);
        return ReE(res, { message: { "Error": "Error creating Asset, error:" + err.message } });
    }
});


/**
 * @api {put} /Asset Update Asset Details
 * @apiName UpdateAsset
 * @apiGroup Asset Manager
 * @apiDescription UPdate a Asset
 * @apiParam {Object} Asset Object.
 */
router.put('/updateasset', async function (req, res) {
    winston.info('Updating Asset: ' + JSON.stringify(req.body));

    // init the params from the request data
    var keyParams = {
        tenantId: req.user.tenantId,
        assetId: req.query.assetId
    }

    let result

    try {
        winston.info(keyParams)
        if (req.body.factory) {
            let factoryFilter = {
                tenantId: req.user.tenantId,
                name: req.body.factory
            }

            let factoryDetails = await Factory.findOne(factoryFilter);
            if (!factoryDetails) {
                return ReE(res, { message: { "Error": `Unable to get the factory details for factory ${asset.factory}` } });
            }
            req.body.factoryId = ObjectID(factoryDetails._id)
        }
        winston.info(req.body)

        // result = await Asset.updateOne(keyParams, req.body);
        result = await Asset.update(keyParams, { $set: req.body });
        winston.info(result)

        if (result.nModified === 1) {
            winston.info('Asset ' + req.body.assetid + ' updated');
            ReS(res, { message: 'Asset ' + req.body.assetId + ' updated' })
        } else {
            winston.error('Error updating Asset: ' + req.body.assetId);
            ReE(res, { message: 'Error updating Asset: ' + req.body.assetId })
        }

    } catch (err) {
        winston.error('Error updating Asset: ' + err.message);
        ReE(res, { message: 'Error updating Asset: ' + req.body.assetId + 'Error : ' + err.message })
    }
});

router.put('/assigndevice', async function (req, res) {
    let tenantId = req.user.tenantId;

    if (
        !req.body.hwId ||
        !req.body.assetId
    ) {

        return ReE(res, { message: { "Error": "invalid param:" } });
    }

    let deviceobj = {
        "hid": req.body.hwId,
        "desc": " device for cm asset " + req.body.assetId,
        "applTenant": tenantId,
        "devType": "NILM",
        "applId": "cm",
        "cloud": "aws",
        "region": __cloudregion,
        "active": true
    }
    let devicelogin_url = __devicemgmtdomain + "/api/auth/login"
    let token,deviceData;
    let loginobj = {
        "email": "cm@in.bosch.com",
        "password": "Passw0rd_789",
        "tenantId": "11111111"
    }
    try {
        let loginData = await rp({
            url: devicelogin_url,
            method: "POST",
            headers: { 'content-type': 'application/json' },
            json: true,
            body: loginobj
        });

        token = loginData.token;
    } catch (err) {
        winston.error(err);
        return ReE(res, { message: { "Error": " error during login: " + JSON.stringify(err.message) } });
    }

    try {
        let deviceapi_url = __devicemgmtdomain + "/api/device"

        deviceData =
            await rp({
                url: deviceapi_url,
                method: "POST",
                headers: { 'content-type': 'application/json', 'authorization': token },
                json: true,
                body: deviceobj
            });

    } catch (err) {
        winston.error(err);
        return ReE(res, { message: { "Error": " error during device registration: " + JSON.stringify(err.message) } });
    }

    // init the params from the request data
    var keyParams = {
        tenantId: req.user.tenantId,
        assetId: req.body.assetId
    }

    try {
        if(deviceData){
            let devices = [{
                "devName" : deviceData.data.devName,
                "devType" : deviceData.data.devType,
                "devId" : deviceData.data.devId
            }]
            let updateObj = {"hwId": req.body.hwId, "devices" :devices} 
        }
        //  let response = await Asset.update(keyParams, { $set: req.body });
        // res.json(response);
        res.json({ "succes": "true" });
    }
    catch (err) {
        winston.error(err);
        res.json(err.message);
    }
})

router.delete('/:assetId', async function (req, res) {
    var keyParams = {
        tenantId: req.user.tenantId,
        assetId: req.params.assetId
    }
    try {
        winston.info('req.params._id: ' + req.params.assetId);
        let response = await Asset.remove(keyParams);
        res.json(response);
    }
    catch (err) {
        winston.error(err);
        res.json(err.message);
    }
})

module.exports = router;
