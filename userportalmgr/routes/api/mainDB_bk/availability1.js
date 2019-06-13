const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var appliance = require(__base + 'config/appliance');
var device = require(__base + 'config/device');
var request = require("request-promise");

router.get('/availSumm', async function (req, res) {

    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;
    let limit = req.query.limit || 3000;

    let attr = req.query.attr;
    let deviceId = req.query.deviceId;
    let applId = req.query.applId;

    try {
console.log("inside portal mgr");

        let db = await DB.Get();
        let responseObj = {};
        let devArray = [];

        let filter = { ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId, applId: applId, toState: 1 };

        let project = {
            _id: 0, ts: 1, toState: 1,
            tsDiff: { $subtract: ["$ts", "$prevTs"] }
        };

        let group = { _id: "0", minutes: { "$sum": "$tsDiff" } };
        let project1 = { _id: 0, minutes: 1 };


        let teCursor = db.collection("events").aggregate([
            { "$match": filter },
            { "$project": project },
            { "$group": group },
            { "$project": project1 }
        ])


        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            teDoc.minutes = Math.round(teDoc.minutes / 1000 / 60)
            devArray.push(teDoc);
        }


        // retrieve planned downtime details

        let planfilter = {
            $and: [
                { startTs: { $gte: parseInt(fromTs) } },
                { endTs: { $lte: parseInt(toTs) } }
            ],
            deviceId: deviceId
        };

        let planproject = {
            _id: 0, startTs: 1, endTs: 1, deviceId: 1, reasontype: { $ifNull: ["$reason.type", "Unspecified"] },
            tsDiff: { $subtract: ["$endTs", "$startTs"] }
        };

        let plangroup = {
            _id: "0", planmin: {
                "$sum": {
                    $cond: {
                        if: {
                            $in: ["$reasontype", ["lunchBreak", "preventiveMaintenance", "plannedShutdown"]]
                        },
                        then: "$tsDiff",
                        else: 0
                    }
                }
            }
            ,
            idlemin: {
                "$sum": {
                    $cond: {
                        if: {
                            $lte: ["$tsDiff", 180000]
                        },
                        then: "$tsDiff",
                        else: 0
                    }
                }
            }
        };
        let planproject1 = { _id: 0, planmin: 1, idlemin: 1 };

        if (devArray[0]) {  // not executed if there is no available data
            let planteCursor = db.collection("macDownTime").aggregate([
                { "$match": planfilter },
                { "$project": planproject },
                { "$group": plangroup },
                { "$project": planproject1 }
            ])
            let devdevArray = []
            for (let teDoc = await planteCursor.next(); teDoc != null; teDoc = await planteCursor.next()) {
                if(teDoc.planmin > 0)
                teDoc.planmin = Math.round(teDoc.planmin / 1000 / 60)
                if(teDoc.idlemin > 0)
                teDoc.idlemin = Math.round(teDoc.idlemin / 1000 / 60)                

                devArray[0].planmins = teDoc.planmin;
                devArray[0].minutes = devArray[0].minutes + teDoc.idlemin;
            }


            // for (let teDoc = await planteCursor.next(); teDoc != null; teDoc = await planteCursor.next()) {
            //     devdevArray.push(teDoc);
            // }

            console.log(devdevArray)

        }
        res.json(devArray);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})

router.get('/', async function (req, res) {

    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;
    let limit = req.query.limit || 3000;

    let attr = req.query.attr;
    let deviceId = req.query.deviceId;
    let applId = req.query.applId;
    let devTz = 'Asia/Calcutta'
    let isHourly = (parseInt(toTs) - parseInt(fromTs) <= 86400000) ? true : false;
    try {

        let db = await DB.Get();
        let responseObj = {};
        let devArray = [];

        let filter = { ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId, applId: applId, toState: 1 };

        let project = {
            _id: 0, ts: 1, toState: 1,
            tsDiff: { $subtract: ["$ts", "$prevTs"] }
        };

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
            }, minutes: { "$sum": "$tsDiff" }
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
            }, minutes: 1
        };

        let teCursor = db.collection("events").aggregate([
            { "$match": filter },
            { "$project": project },
            { "$group": group },
            { "$project": project1 },
            { "$sort": sort }
        ])


        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            teDoc.minutes = Math.round(teDoc.minutes / 1000 / 60)
            devArray.push(teDoc);
        }



        let planfilter = {
            $and: [
                { startTs: { $gte: parseInt(fromTs) } },
                { endTs: { $lte: parseInt(toTs) } }
            ],
            deviceId: deviceId
        };



        // let planproject = {
        //     _id: 0, startTs: 1, endTs: 1, deviceId: 1,
        //     tsDiff: { $subtract: ["$endTs", "$startTs"] }
        // };

        let planproject = {
            _id: 0, startTs: 1, endTs: 1, deviceId: 1, reasontype: { $ifNull: ["$reason.type", "Unspecified"] },
            tsDiff: { $subtract: ["$endTs", "$startTs"] }
        };

        let plansort = { date: 1 };
        let plangroup = {
            "_id": {
                hh: {
                    "$substr": [{
                        "$hour": {
                            date: { $add: [new Date(0), "$startTs"] }, timezone: devTz
                        }
                    }, 0, 2]
                },
                dd: {
                    "$substr": [{
                        "$dayOfMonth": {
                            date: { $add: [new Date(0), "$startTs"] }, timezone: devTz
                        }
                    }, 0, 2]
                },
                mm: {
                    "$substr": [{
                        "$month": {
                            date: { $add: [new Date(0), "$startTs"] }, timezone: devTz
                        }
                    }, 0, 2]
                },
                yy: {
                    "$substr": [{
                        "$year": {
                            date: { $add: [new Date(0), "$startTs"] }, timezone: devTz
                        }
                    }, 0, 4]
                }
            }
            ,
            planmin: {
                "$sum": {
                    $cond: {
                        if: {
                            $in: ["$reasontype", ["lunchBreak", "preventiveMaintenance", "plannedShutdown"]]
                        },
                        then: "$tsDiff",
                        else: 0
                    }
                }
            }
            ,
            idlemin: {
                "$sum": {
                    $cond: {
                        if: {
                            $lte: ["$tsDiff", 180000]
                        },
                        then: "$tsDiff",
                        else: 0
                    }
                }
            }
        };
        if (!isHourly) {
            group["_id"]["hh"] = "00"
        }
        let planproject1 = {
            _id: 0,
            date: {
                $dateFromString: {
                    dateString: { $concat: ["$_id.dd", "-", "$_id.mm", "-", "$_id.yy", "T", "$_id.hh", ":00:00.000"] },
                    timezone: devTz
                }
            }
            , planmin: 1, idlemin: 1
        };

        let planteCursor = db.collection("macDownTime").aggregate([
            { "$match": planfilter },
            { "$project": planproject },
            { "$group": plangroup },
            { "$project": planproject1 },
            { "$sort": plansort }
        ])

        let resultArray = [];

        for (let teDoc = await planteCursor.next(); teDoc != null; teDoc = await planteCursor.next()) {
            if(teDoc.planmin > 0)
            teDoc.planmin = Math.round(teDoc.planmin / 1000 / 60)
            if(teDoc.idlemin > 0)
            teDoc.idlemin = Math.round(teDoc.idlemin / 1000 / 60)
            resultArray[teDoc.date.toISOString()] = { "planmin": teDoc.planmin, "idlemin": teDoc.idlemin };
        }

        devArray.forEach((ele) => {
            if (resultArray[ele.date.toISOString()]) {
                ele.planmins = resultArray[ele.date.toISOString()].planmin;
                ele.minutes = ele.minutes + resultArray[ele.date.toISOString()].idlemin;
            }
        })


        res.json(devArray);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


module.exports = router;