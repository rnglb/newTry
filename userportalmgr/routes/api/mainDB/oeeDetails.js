const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var appliance = require(__base + 'config/appliance');
var device = require(__base + 'config/device');
var request = require("request-promise");
var moment = require('moment');

const oeeUtil = require(__base + 'routes/api/mainDB/kpi/oeeDetailsUtil');

router.get('/', async function (req, res) {

    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;
    let limit = req.query.limit || 3000;

    let attr = req.query.attr;
    let deviceId = req.query.deviceId;
    let applId = req.query.applId;
    let tenantId = req.user.tenantId;
    let devTz = 'Asia/Calcutta';
    try {

        let resultObj = await oeeUtil.getOee(fromTs,toTs,limit,attr,deviceId,applId,devTz,tenantId);
        res.json(resultObj);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


router.get('/oeeMetrics', async function (req, res) {

    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;
    let deviceId = req.query.deviceId;
    
    try {

        let qualityResult = await oeeUtil.getOeeMerics(fromTs,toTs,deviceId);
        res.send(qualityResult);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


router.get('/oeedtls', async function (req, res) {

    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;
    let limit = req.query.limit || 3000;

    let attr = req.query.attr;
    let deviceId = req.query.deviceId;
    let applId = req.query.applId;


    try {

        let resultObj = await oeeUtil.getOeeDetails(fromTs,toTs,limit,attr,deviceId,applId);
        console.log('### output' + resultObj)
        res.json(resultObj);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


module.exports = router;