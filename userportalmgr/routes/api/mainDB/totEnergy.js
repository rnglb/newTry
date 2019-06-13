const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var device = require(__base + 'config/device');

const totEnergyUtil =  require(__base + 'routes/api/mainDB/kpi/totEnergyUtil');

router.get('/summary', async function (req, res) {

    let month = req.query.month;
    let year = req.query.year;
    let date = req.query.date;

    try {

        let responseObj = await totEnergyUtil.getTotalEnergySummary(month,year,date);

        res.json(responseObj);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


router.get('/source', async function (req, res) {

    let month = req.query.month;
    let year = req.query.year;

    try {

        let responseObj = await totEnergyUtil.getTotalEnergySource(month,year);

        res.json(responseObj);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


router.get('/details', async function (req, res) {

    let month = req.query.month;
    let year = req.query.year;
    // let days = req.query.days;

    try {

        let responseObj = await totEnergyUtil.getTotalEnergyDetails(month,year);

        res.json(responseObj);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


module.exports = router;