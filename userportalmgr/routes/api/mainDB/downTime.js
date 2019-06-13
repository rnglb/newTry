const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var appliance = require(__base + 'config/appliance');
var device = require(__base + 'config/device');
var request = require("request-promise");
const downtimeUtil = require(__base +'routes/api/mainDB/kpi/downTimeUtil');

router.get('/', async function (req, res) {
    try {
        let downTimeArray= await downtimeUtil.getDownTime();
        res.json(downTimeArray);
    }
    catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


module.exports = router;