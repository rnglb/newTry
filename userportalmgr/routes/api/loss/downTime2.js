const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();

router.get('/', async function (req, res) {
    try {
        let downTimeArray = [];
        let db = await DB.Get();
        let fromTs = req.query.fromTs;
        let toTs = req.query.toTs;
        let deviceId = req.query.deviceId;
        let applId = req.query.applId;

        console.log('TenantId=>' + req.user.tenantId);
        let tenantData = await db.collection("tenants").findOne({ tenantId: req.user.tenantId });
        console.log(tenantData.smallStops + tenantData.preventiveMaintenance);
        let smallstops = tenantData.smallStops;
        if (smallstops == null) {
            smallstops = 0;
        }
        console.log(smallstops);
        let filter;
        if (tenantData.preventiveMaintenance == "plannedDowntime") {
            console.log("preventiveMaintenance - planneddowntime");
            filter = { $nor: [{ $or: [{ endTs: { $lt: parseInt(fromTs) } }, { startTs: { $gt: parseInt(toTs) } }] }], 'applId': applId, 'deviceId': deviceId, 'reason.type': { $exists: true, $nin: ["lunchBreak", "preventiveMaintenance", "plannedShutdown"] } };
            console.log(JSON.stringify(filter))
        }
        else {
            filter = { $nor: [{ $or: [{ endTs: { $lt: parseInt(fromTs) } }, { startTs: { $gt: parseInt(toTs) } }] }], 'applId': applId, 'deviceId': deviceId, 'reason.type': { $exists: true, $nin: ["lunchBreak", "plannedShutdown"] } };
            console.log(JSON.stringify(filter))
        }


        let downTimeCursor = db.collection("macDownTime").aggregate([
            {
                //$match: { 'applId':applId, $and: [{ startTs: { $lte: parseInt(toTs) } }, { startTs: { $gte: parseInt(fromTs) } }], 'deviceId': deviceId, 'reason.type': { $exists: true, $nin: ["lunchBreak", "preventiveMaintenance", "plannedShutdown"] } }
                $match: filter
            }, {
                $project: { "reason": "$reason.type", deviceId: 1, timeData: { $divide: [{ $subtract: ["$endTs", "$startTs"] }, 60000] } }
            },
            {
                $group: { _id: "$reason", timeData: { $sum: "$timeData" } }
            }, {
                $sort: { timeData: -1 }
            }
        ])



        for (let teDoc = await downTimeCursor.next(); teDoc != null; teDoc = await downTimeCursor.next()) {
            downTimeArray.push(teDoc);
        }


        if (!downTimeArray.length > 0) {
            downTimeArray.push({ "_id": "nodata", "timeData": 0 })
        }


        res.json(downTimeArray);
    }
    catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


router.get('/slowTime', async function (req, res) {
    try {
        let respArray = [];
        let db = await DB.Get();
        let fromTs = req.query.fromTs;
        let toTs = req.query.toTs;
        let deviceId = req.query.deviceId;
        let applId = req.query.applId;

        let slowcycle = 0;
        let slowstop = 0;

        let devArray = [];

        let filter = { ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId };

        let project = {
            _id: 0, ts: 1, toState: 1, fromState: 1, applId: 1,
            tsDiff: { $subtract: ["$ts", "$prevTs"] }
        };

        let sort = { date: 1 };
        let group = {
            "_id": "$deviceId",
            minutes: {
                "$sum": {
                    $cond: {
                        if: {
                            $and: [{ $eq: ["$applId", "020100000101"] }, { $eq: ["$toState", 1] }]
                        },
                        then: "$tsDiff",
                        else: 0
                    }
                }
            }, count: {
                "$sum": {
                    $cond: {
                        if: {
                            $eq: ["$applId", "020100000104"]
                        },
                        then: "$fromState",
                        else: 0
                    }
                }
            }
        };

        let project1 = {
            _id: 0, minutes: 1, count: 1
        };

console.log("filter : "+ JSON.stringify(filter ))

//console.log("deviceId: "+deviceId)


        let teCursor = db.collection("events").aggregate([
            { "$match": filter },
            { "$project": project },
            { "$group": group },
            { "$project": project1 },
            { "$sort": sort }
        ]);


        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            teDoc.minutes = Math.round(teDoc.minutes / 1000 / 60)
            devArray.push(teDoc);
        }

console.log("devarray: "+JSON.stringify(devArray))

        if (devArray.length > 0) {

            let shiftfilter = {
                $and: [
                    { fromTs: { $gte: parseInt(fromTs) } },
                    { toTs: { $lte: parseInt(toTs) } }
                ],
                deviceId: deviceId
            };



            let shiftproject = {
                _id: 0, fromTs: 1, toTs: 1, machine: 1, runrate: 1
            };


             console.log(JSON.stringify(shiftfilter));
             console.log(JSON.stringify(shiftproject));


            let sftCursor = db.collection("shiftDetails").aggregate([
                { "$match": shiftfilter },
                { "$project": shiftproject }
            ]);

            let shiftArray = [];

            for (let teDoc = await sftCursor.next(); teDoc != null; teDoc = await sftCursor.next()) {
                shiftArray.push(teDoc);
            }

console.log("shiftArray : "+JSON.stringify(shiftArray ))
            let irr = 0
            shiftArray.forEach((sftdtl) => {
                irr += sftdtl.runrate;
            })
            let avgirr = irr / shiftArray.length;

            if (!avgirr) {
                avgirr = 1;
            }

            let avgCycleTime = 60 / avgirr;
            let currCycleTime = devArray[0].minutes / devArray[0].count

            if (avgirr > 1 && currCycleTime > avgCycleTime) {
                slowcycle = (currCycleTime - avgCycleTime) * devArray[0].count
            }

            respArray.push({ "_id": "slowCycle", "timeData": Math.round(slowcycle) })
        }

        console.log('TenantId=>' + req.user.tenantId);
        let tenantData = await db.collection("tenants").findOne({ tenantId: req.user.tenantId });
        console.log(tenantData.smallStops + tenantData.preventiveMaintenance);
        let smallstops = tenantData.smallStops;
        if (smallstops == null) {
            smallstops = 0;
        }
        smallstops = smallstops*60*1000;
        console.log(smallstops);

        let downTimeCursor = db.collection("macDownTime").aggregate([
            {
                $match: {
                    $and: [
                        { startTs: { $gte: parseInt(fromTs) } },
                        { endTs: { $lte: parseInt(toTs) } }
                    ],
                    deviceId: deviceId
                },
            },
            {
                $project: { deviceId: 1, timeData: {  $subtract: ["$endTs", "$startTs"] } }
            }, {
                $match: { timeData: { $lt: smallstops } }
            },
            {
                $group: { _id: "$deviceId", timeData: { $sum: "$timeData" } }
            }, {
                $sort: { timeData: -1 }
            }
        ])


        for (let teDoc = await downTimeCursor.next(); teDoc != null; teDoc = await downTimeCursor.next()) {
            // teDoc["productLoss"] = (parseInt(teDoc.timeData * (0.25)))
            // teDoc["_id"] = "slowStop"
            // respArray.push(teDoc);
            slowstop = parseInt(teDoc.timeData)/(60*1000);
        }

        respArray.push({ "_id": "slowStop", "timeData": Math.round(slowstop) });


        res.json(respArray);
    }
    catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


router.get('/qualityLoss', async function (req, res) {
    try {
        let qualityArray = [];
        let db = await DB.Get();
        let fromTs = req.query.fromTs;
        let toTs = req.query.toTs;
        let machineId = req.query.machineId;
        let deviceId = req.query.deviceId;
        let applId = req.query.applId;

        console.log('TenantId=>' + req.user.tenantId);
        let tenantData = await db.collection("tenants").findOne({ tenantId: req.user.tenantId });
        console.log(tenantData.smallStops + tenantData.preventiveMaintenance);
        let smallstops = tenantData.smallStops;
        if (smallstops == null) {
            smallstops = 0;
        }
        console.log(smallstops);

        let query = [{
            $match: { machine: deviceId, toTs: { $exists: true }, fromTs: { $exists: true }, $and: [{ fromTs: { $lte: parseInt(toTs) } }, { toTs: { $gte: parseInt(fromTs) } }] }
        }
            , {
            $project: { machine: 1, productCount: { $sum: ["$startUp", "$production"] }, timeData: { $divide: [{ $subtract: ["$toTs", "$fromTs"] }, 60000] } }
        },
        {
            $project: { machine: 1, quality: { $divide: [{ $subtract: [60000, '$productCount'] }, '$timeData'] } }
        }, {
            $group: { _id: '$machine', qualityLoss: { $sum: '$quality' } }
        }];

        console.log(JSON.stringify(query));

        let qualityLossCursor = db.collection("shiftDetails").aggregate(query)


        for (let teDoc = await qualityLossCursor.next(); teDoc != null; teDoc = await qualityLossCursor.next()) {
            teDoc["actualProductCount"] = 6000
            qualityArray.push(teDoc);
        }

        let filter = { ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId, applId: applId };
        let group = { _id: "$applId", count: { $sum: "$fromState" } };
        let project = { _id: 0, applId: "$_id", count: 1 };

        //change lifttransitions to mmumt0
        let teCursor = db.collection("events").aggregate([
            { "$match": filter },
            { "$group": group },
            { "$project": project }
        ])

        query = [
            { "$match": filter },
            { "$group": group },
            { "$project": project }
        ];



        let devArray = [];
        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            devArray.push(teDoc);
        }

        let respObj = {}
        if (devArray.length > 0 && qualityArray.length > 0) {
            respObj['_id'] = qualityArray[0]['_id'];
            respObj['qualityLoss'] = (qualityArray[0]['qualityLoss'] / devArray[0]['count']) * 100;
        }

        res.json(respObj);
    }
    catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})



module.exports = router;