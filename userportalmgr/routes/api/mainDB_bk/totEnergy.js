const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var device = require(__base + 'config/device');

router.get('/summary', async function (req, res) {

    let month = req.query.month;
    let year = req.query.year;
    let date = req.query.date;

    try {

        let db = await DB.Get();
        let responseObj = {};

        let filter = { "dateObj.month": parseInt(month), "dateObj.year": parseInt(year), "totEnergy": { "$gt": 0 } };
        if (date) {
            filter["dateObj.date"] = parseInt(date)
        }

        let group = { _id: { deviceId: "$deviceId" }, totEnergy: { $sum: "$totEnergy" } }
        let project = { _id: 0, deviceId: "$_id.deviceId", totEnergy: "$totEnergy" }

        console.log(filter);

        let teCursor = db.collection("totenergyhh").aggregate([
            { "$match": filter },
            { "$group": group },
            { "$project": project }
        ])

        let devArray = [];
        let sumEnergy = 0;

        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {

            teDoc.devDesc = device[teDoc.deviceId]
            teDoc.totEnergy = Math.round(teDoc.totEnergy * 100)/100;
            sumEnergy = sumEnergy + teDoc.totEnergy;
            devArray.push(teDoc);
        }
        responseObj.sumEnergy = Math.round(sumEnergy * 100) / 100;
        responseObj.devArray = devArray;

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

        let db = await DB.Get();
        let responseObj = {};

        let filter = { "dateObj.month": parseInt(month), "dateObj.year": parseInt(year), "totEnergy": { "$gt": 0 } };
        let group = { _id: { source: "$source" }, totEnergy: { $sum: "$totEnergy" } }
        let project = { _id: 0, source: "$_id.source", totEnergy: "$totEnergy" }

        //  console.log(filter);

        let teCursor = db.collection("totenergyhh").aggregate([
            { "$match": filter },
            { "$group": group },
            { "$project": project }
        ])

        let srcArray = [];
        let sumEnergy = 0;

        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            teDoc.totEnergy = Math.round(teDoc.totEnergy * 100)/100;
            sumEnergy = sumEnergy + teDoc.totEnergy;
            srcArray.push(teDoc);
        }

        responseObj.sumEnergy = Math.round(sumEnergy * 100) / 100;
        responseObj.srcArray = srcArray;

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

        let db = await DB.Get();
        let responseObj = {};

        let filter = { "dateObj.month": parseInt(month), "dateObj.year": parseInt(year), "totEnergy": { "$gt": 0 } };
        let group = { _id: {date : "$dateObj.date",dateTs:"$dateObj.start"}, totEnergy: { $sum: "$totEnergy" } }
        let project = { _id: 0, date: "$_id.date",dateTs:"$_id.dateTs", totEnergy: "$totEnergy" }

        //  console.log(filter);

        let teCursor = db.collection("totenergyhh").aggregate([
            { "$match": filter },
            { "$group": group },
            { "$project": project },
            {"$sort":{date:-1}}
        ])

        let dateArray = [];
        let sumEnergy = 0;

        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            teDoc.totEnergy = Math.round(teDoc.totEnergy * 100)/100;
            sumEnergy = sumEnergy + teDoc.totEnergy;
            dateArray.push(teDoc);
        }

        responseObj.sumEnergy = Math.round(sumEnergy * 100) / 100;
        responseObj.dateArray = dateArray;

        res.json(responseObj);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


module.exports = router;