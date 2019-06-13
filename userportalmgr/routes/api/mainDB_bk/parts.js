const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var appliance = require(__base + 'config/appliance');
var device = require(__base + 'config/device');
var request = require("request-promise");




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


        let db = await DB.Get();
        let devArray = [];

        /*Part count */
        let filter = { ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId, applId: applId };
        let group = { _id: "$applId", count: { $sum: "$fromState" } };
        let project = { _id: 0, applId: "$_id", count: 1 };

        //change lifttransitions to mmumt0
        let teCursor = db.collection("events").aggregate([
            { "$match": filter },
            { "$group": group },
            { "$project": project }
        ])


        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            devArray.push(teDoc);
        }
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

        let db = await DB.Get();
        let responseObj = {};
        let devArray = [];
        let devTz = 'Asia/Calcutta'

        if (attr === 'appl') {

            let filter = { ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId, applId: applId };

            let sort = { date: 1 };
            let group = {
                "_id": {
                    hh: {
                        "$substr": [{
                            "$hour": {
                                date: { $add: [new Date(0), "$ts"] }, timezone: devTz
                            }
                        }, 0, 2]
                    },
                    dd: {
                        "$substr": [{
                            "$dayOfMonth": {
                                date: { $add: [new Date(0), "$ts"] }, timezone: devTz
                            }
                        }, 0, 2]
                    },
                    mm: {
                        "$substr": [{
                            "$month": {
                                date: { $add: [new Date(0), "$ts"] }, timezone: devTz
                            }
                        }, 0, 2]
                    },
                    yy: {
                        "$substr": [{
                            "$year": {
                                date: { $add: [new Date(0), "$ts"] }, timezone: devTz
                            }
                        }, 0, 4]
                    }
                }, count: { "$sum": "$fromState" }
            };
            if (!isHourly) {
                group["_id"]["hh"] = "00"
            }
            let project1 = {
                _id: 0,
                date: {
                    $dateFromString: {
                        dateString: { $concat: ["$_id.dd", "-", "$_id.mm", "-", "$_id.yy", "T", "$_id.hh", ":00:00.000"] },
                        timezone: devTz
                    }
                }, count: 1
            };

            // let project2 = {
            //     _id: 0, hh: { $hour: "$date" }, count: 1
            // };
            let teCursor = db.collection("events").aggregate([
                { "$match": filter },
                { "$group": group },
                { "$project": project1 },
                { "$sort": sort }
            ]);

            for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
                teDoc.date = new Date(teDoc.date).toISOString();
                devArray.push(teDoc);
            }
        }

        res.json(devArray);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


module.exports = router;