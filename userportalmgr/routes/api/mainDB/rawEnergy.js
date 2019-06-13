const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var appliance = require(__base + 'config/appliance');
var device = require(__base + 'config/device');
var request = require("request-promise");
const rawEnergyUtil =  require(__base + 'routes/api/mainDB/kpi/rawEnergyUtil');
router.get('/', async function (req, res) {

    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;
    let limit = req.query.limit || 3000;

    let attr = req.query.attr;
    let deviceId = req.query.deviceId;

    try {

        let devArray = await rawEnergyUtil.getRawEnergy(fromTs,toTs,limit,attr,deviceId);
        res.json(devArray);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


module.exports = router;