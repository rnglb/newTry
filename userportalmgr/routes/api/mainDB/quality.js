const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var appliance = require(__base + 'config/appliance');
var device = require(__base + 'config/device');
var request = require("request-promise");
var shift = require(__base + 'config/shift');

var moment = require('moment');

const qualityUtils =  require(__base + 'routes/api/mainDB/kpi/qualityUtils');

router.get('/', async function (req, res) {
    try {
        if (!req.query.deviceId || !req.query.applId || !req.query.fromTs || !req.query.toTs) {
            throw new Error('Invalid param - deviceId: ' + req.query.deviceId + ' applId: ')
        }

        let fromTs = req.query.fromTs;
        let toTs = req.query.toTs;
        let deviceId = req.query.deviceId;

        let devArray = await qualityUtils.getQuality(fromTs,toTs,deviceId);

        res.json(devArray);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})

router.get('/qualityMetric', async function (req, res) {
    try {

        let fromTs =  req.query.fromTs;
        let toTs =  req.query.toTs;
        let deviceId = req.query.deviceId;

        let resultArray = await qualityUtils.getQualityMetric(fromTs,toTs,deviceId);
        res.json(resultArray);
    }
    catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
})

module.exports = router;