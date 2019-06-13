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

        let filter = { $nor: [{ $or: [{endTs: { $lt: parseInt(fromTs)} }, {startTs: { $gt: parseInt(toTs) } }] }], 'applId':applId, 'deviceId': deviceId, 'reason.type': { $exists: true, $nin: ["lunchBreak", "preventiveMaintenance", "plannedShutdown"] } };
        console.log(JSON.stringify(filter))

        let downTimeCursor = db.collection("macDownTime").aggregate([
            {
//                $match: { 'applId':applId, $and: [{ startTs: { $lte: parseInt(toTs) } }, { startTs: { $gte: parseInt(fromTs) } }], 'deviceId': deviceId, 'reason.type': { $exists: true, $nin: ["lunchBreak", "preventiveMaintenance", "plannedShutdown"] } }
                  $match: filter
            }            , {
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

        let downTimeCursor = db.collection("macDownTime").aggregate([
            {
                $match: { 'applId': applId, $and: [{ startTs: { $lte: parseInt(toTs) } }, { startTs: { $gte: parseInt(fromTs) } }], 'deviceId': deviceId },
            },
            {
                $project: { deviceId: 1, timeData: { $divide: [{ $subtract: ["$endTs", "$startTs"] }, 60000] } }
            }, {
                $match: { timeData: { $lt: 5 } }
            },
            {
                $group: { _id: "$deviceId", timeData: { $sum: "$timeData" } }
            }, {
                $sort: { timeData: -1 }
            }
        ])


            for (let teDoc = await downTimeCursor.next(); teDoc != null; teDoc = await downTimeCursor.next()) {
                teDoc["productLoss"] = (parseInt(teDoc.timeData * (0.25)))
                teDoc["_id"] = "slowTime"
                respArray.push(teDoc);
            }

        if (!respArray.length > 0) {
            respArray.push({ "productLoss": 0, "_id": "slowTime", "timeData": 0 });
        }



        let smallStopArray = []
        let smallStopCursor = db.collection("macDownTime").aggregate([
            {
                $match: { 'applId': applId, $and: [{ startTs: { $lte: parseInt(toTs) } }, { startTs: { $gte: parseInt(fromTs) } }], 'deviceId': deviceId },
            },
            {
                $project: { deviceId: 1, timeData: { $divide: [{ $subtract: ["$endTs", "$startTs"] }, 60000] } }
            }, {
                $match: { timeData: { $gt: 5 } }
            },
            {
                $group: { _id: "$deviceId", timeData: { $sum: "$timeData" } }
            }, {
                $sort: { timeData: -1 }
            }
        ])
        if (smallStopCursor.length > 0) {
            for (let teDoc = await smallStopCursor.next(); teDoc != null; teDoc = await smallStopCursor.next()) {
                teDoc["productLoss"] = (parseInt(teDoc.timeData * (0.25)))
                teDoc["_id"] = "smallStop"
                respArray.push(teDoc);
            }
        }
        else {
            respArray.push({ "productLoss": 0, "_id": "smallStop", "timeData": 0 }) // default response
        }
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