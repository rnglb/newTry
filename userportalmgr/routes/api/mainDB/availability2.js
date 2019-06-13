const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var appliance = require(__base + 'config/appliance');
var device = require(__base + 'config/device');
var request = require("request-promise");
var moment = require('moment');
var ObjectID = require('mongodb').ObjectID;
const availUtil = require(__base +'routes/api/mainDB/kpi/availabilityUtil');

router.get('/availSumm', async function (req, res) {

    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;
    let limit = req.query.limit || 3000;

    let attr = req.query.attr;
    let deviceId = req.query.deviceId;
    let applId = req.query.applId;
    let tenantId = req.user.tenantId;
    console.log(req.query);

    try {
        devArray = await availUtil.Summary(fromTs,toTs,limit,attr,deviceId,applId,tenantId);
        res.json(devArray);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})

router.get('/', async function (req, res) {

    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;
    let limit = req.query.limit || 3000;

    let attr = req.query.attr;
    let deviceId = req.query.deviceId;
    let applId = req.query.applId;
    let devTz = 'Asia/Calcutta';
    let diffhrs = (parseInt(toTs) - parseInt(fromTs)) / 3600000;
    console.log(diffhrs);
    let isHourly = (parseInt(toTs) - parseInt(fromTs) <= 86400000) ? true : false;
    let tenantId = req.user.tenantId;
    try {

        devArray = await availUtil.Avaialability(fromTs,toTs,limit,attr,deviceId,applId,devTz,diffhrs,isHourly,tenantId);
        res.json(devArray);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


module.exports = router;