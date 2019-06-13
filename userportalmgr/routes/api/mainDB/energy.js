const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var appliance = require(__base + 'config/appliance');
var device = require(__base + 'config/device');
var request = require("request-promise");
const energyUtil = require(__base + 'routes/api/mainDB/kpi/energyUtil');

router.get('/', async function (req, res) {

    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;

    let attr = req.query.attr;
    let deviceId = req.query.deviceId;
    let applId = req.query.applId || '';
    let isHourly = (parseInt(toTs) - parseInt(fromTs) <= 86400000) ? true : false;

    try {
        let devArray = await energyUtil.getEnergy(fromTs, toTs, attr, deviceId, applId, isHourly);
        res.json(devArray);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


router.get('/energySumm', async function (req, res) {
    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;

    let attr = req.query.attr;
    let deviceId = req.query.deviceId;

    try {
        let devArray = await energyUtil.getEnergySumm(fromTs,toTs,attr,deviceId);
        res.json(devArray);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})

router.get('/newenergySumm', async function (req, res) {
    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;
    let attr = req.query.attr;
    let deviceId = req.query.deviceId;
    let reqtype = req.query.type;
    
    try {
        let devArray = await energyUtil.newEnergySumm(fromTs,toTs,attr,deviceId,reqtype);
        res.json(devArray);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


module.exports = router;