const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var appliance = require(__base + 'config/appliance');
var device = require(__base + 'config/device');
var request = require("request-promise");
var moment = require('moment');

router.get('/', async function (req, res) {

    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;
    let limit = req.query.limit || 3000;

    let attr = req.query.attr;
    let deviceId = req.query.deviceId;
    let applId = req.query.applId;

    let devTz = 'Asia/Calcutta';
    try {

        let db = await DB.Get();
        let responseObj = {};
        let resultObj = {};


        /*Parts Count */
        let filter = { ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId, applId: "020100000104" };
        console.log(filter);
        let group = { _id: { "partCount": "$partCount", "dd": "$dd", "mm": "$mm", "yy": "$yy" }, count: { "$sum": "$fromState" } };
        let projection = {
            "partCount": 1, "fromState": 1, dd: {
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
        };
        let teCursor = db.collection("events").aggregate([
            { "$match": filter },
            { "$project": projection },
            {"$sort":{ts:1}},
            { "$group": group },
            { "$project": { _id:0,count: 1, date: {  $dateFromString: {
                    dateString: { $concat: ["$_id.dd", "-", "$_id.mm", "-", "$_id.yy", 'T00:00:00.000'] },
                    timezone: devTz
                }} } }

        ])

        let sumEnergy = 0;
        
        let dayWise = {}
        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            if (resultObj.partCount != undefined)
                resultObj.partCount = resultObj.partCount + teDoc.count;
            else
                resultObj.partCount = teDoc.count;
                
            dayWise[teDoc.date]=teDoc.count;
        }
       // resultObj['PartCount_dayWise'] = dayWise;

        /*Total Energy */
        filter = { toTs: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId };
        console.log(filter);
        group = { _id: "partEnergy", totEnergy: { "$sum": "$totEnergy" } };

        teCursor = db.collection("totenergy").aggregate([
            { "$match": filter },
            { "$group": group }
        ])

        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            resultObj.partEnergy = teDoc.totEnergy;
        }

        /*Parts Time */
        filter = { ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId, applId: { "$ne": "020100000104" }, toState: { "$gt": 0 } };
        let project = { _id: 0,ts:1, tsDiff: { $subtract: ["$ts", "$prevTs"] }, toState: 1 };
        let filter1 = { tsDiff: { $gt: 1000 } };
         projection = {
            "partTime": 1, "tsDiff": 1, "fromState": 1, dd: {
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
        };
        console.log(filter);
        group = { _id: { "partTime": "$partTime", "dd": "$dd", "mm": "$mm", "yy": "$yy" }, totTime: { "$sum": "$tsDiff" } };

        teCursor = db.collection("events").aggregate([
            { "$match": filter },
            { "$project": project },
            { "$match": filter1 },
            {"$sort":{ts:1}},
            { "$project": projection },
            { "$group": group },
            { "$project": {_id:0, totTime: 1, date: {
                $dateFromString: {
                    dateString: { $concat: ["$_id.dd", "-", "$_id.mm", "-", "$_id.yy", "T00:00:00.000"] },
                    timezone: devTz
                }
            }} },
            {"$sort":{date:1}}
        ])

        let dayWiseTime=[]
console.log(dayWise)

        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            resultObj.partTime = teDoc.totTime;
            if (resultObj.partTime != undefined)
            resultObj.partTime = resultObj.partTime+teDoc.totTime;
            else
            resultObj.partTime = teDoc.totTime;
            let obj={}
            obj['partTime']=teDoc.totTime;
            obj['partCount']=dayWise[teDoc.date];
            obj['date']=teDoc.date;
            dayWiseTime.push(obj);
        }
        resultObj['daywiseSummary']=dayWiseTime;
        res.json(resultObj);

    } catch (err) {
         console.log(err);
        res.status(500).json(err);
    }

})


router.get('/oeeMetrics', async function (req, res) {

    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;
    let deviceId = req.query.deviceId;
    let partCount = 0;
    let breakTime = 0;
    let productTime = 0;
    let quality = 0;
    try {

        let db = await DB.Get();
        let shiftfilter = {}
        shiftfilter['fromTs'] = { $gte: parseInt(fromTs) };
        shiftfilter['toTs'] = { $lte: parseInt(toTs) };
        shiftfilter['machine'] = deviceId;

        let filter = { ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId, applId: "020100000104" };
        console.log(filter);
        let group = { _id: "partCount", count: { "$sum": "$fromState" } };

        let teCursor1 = db.collection("events").aggregate([
            { "$match": filter },
            { "$group": group }
        ])

        let sumEnergy = 0;

        for (let teDoc = await teCursor1.next(); teDoc != null; teDoc = await teCursor1.next()) {
            partCount = teDoc.count;
        }

        let cursorShift = db.collection("shiftDetails").aggregate([{ $match: shiftfilter }]);
        for (let teDoc = await cursorShift.next(); teDoc != null; teDoc = await cursorShift.next()) {
            let reject = teDoc.rejectCount.startup + teDoc.rejectCount.production;
            quality = ((partCount - reject) / partCount);
        }


        let teCursor = db.collection("factories").aggregate([{ $unwind: "$shift" }, { $project: { shift: '$shift.shiftDetails' } }, { $unwind: "$shift" }, { $project: { 'shiftName': '$shift.Name', 'From': '$shift.Timings.From', 'To': '$shift.Timings.To', 'mealBreak': { $multiply: ["$shift.MealBreaks.NoOfOccurences", "$shift.MealBreaks.Duration"] }, 'smallBreak': { $multiply: ["$shift.SmallBreaks.NoOfOccurences", "$shift.SmallBreaks.Duration"] } } }]);


        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            breakTime = breakTime + teDoc.mealBreak + teDoc.smallBreak;
            if (teDoc.From > teDoc.To) {
                productTime = productTime + (teDoc.To - teDoc.From);
            }
            else {
                productTime = productTime + (teDoc.To + (24 - teDoc.From));
            }

        }
        breakTime = breakTime / 60;
        let qualityResult = { 'oee': (quality / (productTime - breakTime)) }
        res.send(qualityResult);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


router.get('/oeedtls', async function (req, res) {

    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;
    let limit = req.query.limit || 3000;

    let attr = req.query.attr;
    let deviceId = req.query.deviceId;
    let applId = req.query.applId;


    try {

        let db = await DB.Get();
        let responseObj = {};
        let resultObj = { partCount: 0, irr : 1, prodTime: 0};


        /*Parts Count */
        let filter = {
            ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) },
            deviceId: deviceId, applId: "020100000104"
        };
        console.log(filter);
        let group = { _id: "partCount", count: { "$sum": "$fromState" } };

        let teCursor = db.collection("events").aggregate([
            { "$match": filter },
            { "$group": group }
        ])

        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            resultObj.partCount = teDoc.count;
        }

        if (resultObj.partCount > 0) {
            let shiftfilter = { deviceId: deviceId, fromTs: { $gte: parseInt(fromTs) }, toTs: { $lte: parseInt(toTs) } };
            let group = {
                _id: "$deviceId",
                startup: {
                    $sum: "$rejectCount.startup"
                },
                production: {
                    $sum: "$rejectCount.production"
                },
                count: {
                    $sum : 1
                },
                rr: {
                    $sum: "$runrate"
                }
            };
         let project = { startup: 1, production: 1, rr : 1, count : 1 };

            let shiftCursor = db.collection("shiftDetails").aggregate([
                { "$match": shiftfilter },
                { "$group": group },
                { "$project": project }
            ]);
            let val = [];
            for (let teDoc = await shiftCursor.next(); teDoc != null; teDoc = await shiftCursor.next()) {

                val.push(teDoc);
            }

            if (val.length > 0) {
                let reject = val[0].startup + val[0].production;
                let avgrr = (val[0].rr/val[0].count)
                resultObj.irr = avgrr;
                if (resultObj.partCount > reject) {
                    resultObj.partCount = resultObj.partCount - reject
                } else {
                    resultObj.partCount = 0
                }
            }
        }


        let assetData = await db.collection("assets").findOne({ "devices.devId": parseInt(deviceId) })
        console.log(assetData)
        let curFactory = assetData.factory;

        let startDay = moment(parseInt(fromTs)).utcOffset(5.5).startOf("day");

        console.log('Vengat startday' + startDay);
        let endDay = moment(parseInt(toTs)).utcOffset(5.5).startOf("day");;
        console.log('Vengat enDay' + endDay);

        let shiftbreaks = await db.collection("shiftbreakups").aggregate([
            {
                "$match": {
                    factory: curFactory, type: "up"
                }
            },
            {
                "$group": {
                    _id: "$day", upTime: { $sum: "$duration" }
                }
            },
            {
                "$sort": {
                    _id: 1
                }
            },
            {
                "$project": {
                    "upTime": 1, "day": "$_id", "_id": 0
                }
            }
        ]);
        let shiftBrkArray = []
        let prodTime = 0
        for (let Doc = await shiftbreaks.next(); Doc != null; Doc = await shiftbreaks.next()) {
            shiftBrkArray[Doc.day] = Doc
        }

        for (var m = moment(startDay); m.diff(moment(endDay), 'days') <= 0; m.add(1, 'days')) {
            if (shiftBrkArray[m.format('d')]) {
                prodTime = prodTime + shiftBrkArray[m.format('d')].upTime * 60;
            }
        }

        resultObj.prodTime = prodTime

        console.log(" Total prod time --> " + prodTime)
        res.json(resultObj);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


module.exports = router;