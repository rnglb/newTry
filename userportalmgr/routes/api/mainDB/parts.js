const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var appliance = require(__base + 'config/appliance');
var device = require(__base + 'config/device');
var request = require("request-promise");

const partsUtil =  require(__base + 'routes/api/mainDB/kpi/partsUtil');


router.get('/tot', async function (req, res) {
    try {
        if (!req.query.deviceId || !req.query.applId || !req.query.fromTs || !req.query.toTs) {
            throw new Error('Invalid param - deviceId: ' + req.query.deviceId + ' applId: ')
        }

        let fromTs = req.query.fromTs;
        let toTs = req.query.toTs;
        let deviceId = req.query.deviceId;
        let applId = req.query.applId;
        let limit = req.query.limit || 3000;

        let devArray= await partsUtil.getTot(fromTs,toTs,deviceId,applId,limit);
        
        res.json(devArray);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


router.get('/partDtls', async function (req, res) {
    console.log("testing")
    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;
    let limit = req.query.limit || 3000;

    let attr = req.query.attr;
    let deviceId = req.query.deviceId;
    let applId = req.query.applId;
    let isHourly = (parseInt(toTs) - parseInt(fromTs) <= 86400000) ? true : false;

    try {

        let devArray = await partsUtil.getPartDetails(fromTs,toTs,limit,attr,deviceId,applId,isHourly);

        res.json(devArray);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


module.exports = router;