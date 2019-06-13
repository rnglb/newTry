const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var appliance = require(__base + 'config/appliance');
var device = require(__base + 'config/device');
var request = require("request-promise");

const performaceUtil =  require(__base + 'routes/api/mainDB/kpi/performanceUtil');

router.get('/', async function (req, res) {

    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;

    let attr = req.query.attr;
    let deviceId = req.query.deviceId;
    let applId = req.query.applId || '';
    let isHourly = (parseInt(toTs) - parseInt(fromTs) <= 86400000) ? true : false;
    let devTz = 'Asia/Calcutta'
    try {

        let devArray = await performaceUtil.getPerformance(fromTs,toTs,attr,deviceId,applId,isHourly,devTz);
        res.json(devArray);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})

router.get('/totperf', async function (req, res) {

    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;

    let attr = req.query.attr;
    let deviceId = req.query.deviceId;
    let applId = req.query.applId || '';
    let tenantId = req.user.tenantId;
    try {

        let devArray = await performaceUtil.getTotalPerformance(fromTs,toTs,attr,deviceId,applId,tenantId);
        res.json(devArray);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})

module.exports = router;