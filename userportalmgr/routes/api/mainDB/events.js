const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var request = require("request-promise");
const eventsUtil = require(__base + 'routes/api/mainDB/kpi/eventsUtil');

router.get('/details/appliance', async function (req, res) {

    let month = parseInt(req.query.month) - 1;
    let year = parseInt(req.query.year);
    let date = parseInt(req.query.date);
    let toDate = parseInt(req.query.toDate);
    let limit = req.query.limit || 31;
    let locId = req.query.locId;
    let applId = req.query.applId;
    
    try {
        let responseObj = await eventsUtil.applianceDetails(month,year,date,toDate,limit,locId,applId);
        res.json(responseObj);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


router.get('/summary/appliance', async function (req, res) {

    let month = parseInt(req.query.month);
    let year = parseInt(req.query.year);
    let date = parseInt(req.query.date);
    let limit = req.query.limit || 31;
    let locId = req.query.locId;
    let applId = req.query.applId;

    try {
        let responseObj = await eventsUtil.applianceSummary(month,year,date,limit,locId,applId);
        res.json(responseObj);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})

router.get('/details/appliance/gantt', async function (req, res) {

    let month = parseInt(req.query.month) - 1;
    let year = parseInt(req.query.year);
    let fromDate = parseInt(req.query.fromDate);
    let toDate = parseInt(req.query.toDate);

    let limit = req.query.limit || 31;

    let category = req.query.category;
    let type = req.query.type;
    let locId = req.query.locId;
    let applId = req.query.applId;

    try {
        
        let responseObj = await eventsUtil.applianceGattDetailsImpl(month,year,fromDate,toDate,limit,category,type,locId,applId);
        res.json(responseObj);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})



module.exports = router;