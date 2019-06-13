const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var appliance = require(__base + 'config/appliance');
var device = require(__base + 'config/device');
var request = require("request-promise");
var moment = require('moment');
var ObjectID = require('mongodb').ObjectID;

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
        // let filter = { ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId, applId: "020100000104" };
        // console.log(filter);
        // let group = { _id: { "partCount": "$partCount", "dd": "$dd", "mm": "$mm", "yy": "$yy" }, count: { "$sum": "$fromState" } };
        // let projection = {
        //     "partCount": 1, "fromState": 1, dd: {
        //         "$substr": [{
        //             "$dayOfMonth": {
        //                 date: { $add: [new Date(0), "$ts"] }, timezone: devTz
        //             }
        //         }, 0, 2]
        //     },
        //     mm: {
        //         "$substr": [{
        //             "$month": {
        //                 date: { $add: [new Date(0), "$ts"] }, timezone: devTz
        //             }
        //         }, 0, 2]
        //     },
        //     yy: {
        //         "$substr": [{
        //             "$year": {
        //                 date: { $add: [new Date(0), "$ts"] }, timezone: devTz
        //             }
        //         }, 0, 4]
        //     }
        // };
        // let teCursor = db.collection("events").aggregate([
        //     { "$match": filter },
        //     { "$project": projection },
        //     { "$sort": { ts: 1 } },
        //     { "$group": group },
        //     {
        //         "$project": {
        //             _id: 0, count: 1, date: {
        //                 $dateFromString: {
        //                     dateString: { $concat: ["$_id.dd", "-", "$_id.mm", "-", "$_id.yy", 'T00:00:00.000'] },
        //                     timezone: devTz
        //                 }
        //             }
        //         }
        //     },
        //     { "$sort": { date: 1 } },

        // ])

        let filter = { ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId };

        let project = {
            _id: 0, ts: 1, toState: 1, fromState: 1, applId: 1,
            tsDiff: { $subtract: ["$ts", "$prevTs"] }
        };

        let sort = { date: 1 };
        let group = {
            "_id": {
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
            }, minutes: {
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
            _id: 0,
            date: {
                $dateFromString: {
                    dateString: { $concat: ["$_id.dd", "-", "$_id.mm", "-", "$_id.yy"] },
                    timezone: devTz
                }
            }, minutes: 1, count: 1
        };

        // let project2 = {
        //     _id: 0, date: 1, minutes: 1, count: 1, perf: 1
        // };

        let teCursor = db.collection("events").aggregate([
            { "$match": filter },
            { "$project": project },
            { "$group": group },
            { "$project": project1 },
            { "$sort": sort }
        ]);



        let sumEnergy = 0;
        let resultArray = [];
        let dayWise = {}
        console.log(" ********************* partcnt array ************************************")
        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            if (resultObj.partCount != undefined)
                resultObj.partCount = resultObj.partCount + teDoc.count;
            else
                resultObj.partCount = teDoc.count;


            teDoc.minutes = Math.round(teDoc.minutes / 1000 / 60)
            console.log(teDoc.date.toISOString())
            console.log("partcnt : --> " + teDoc.count)
            console.log("partcnt : --> " + teDoc.minutes)

            // dayWise[teDoc.date] = teDoc.count;
            resultArray[teDoc.date.toISOString()] = { "partCnt": teDoc.count, "mins": teDoc.minutes };
        }
        // resultObj['PartCount_dayWise'] = dayWise;

        let dwntimefilter = {
            $and: [
                { startTs: { $gte: parseInt(fromTs) } },
                { endTs: { $lte: parseInt(toTs) } }
            ],
            deviceId: deviceId
        };

        let dwntimeproject = {
            _id: 0, startTs: 1, endTs: 1, deviceId: 1, reasontype: { $ifNull: ["$reason.type", "Unspecified"] },
            tsDiff: { $subtract: ["$endTs", "$startTs"] }
        };

        let dwntimesort = { date: 1 };

        console.log('TenantId=>' + req.user.tenantId);
        let tenantData = await db.collection("tenants").findOne({ tenantId: req.user.tenantId });
        console.log(tenantData.smallStops + tenantData.preventiveMaintenance);
        let smallstops = tenantData.smallStops * 60000;
        if (smallstops == null) {
            smallstops = 0;
        }
        console.log(smallstops);
        let dwntimegroup = {
            "_id": {
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
            idlemin: {
                "$sum": {
                    $cond: {
                        if: {
                            $lte: ["$tsDiff", smallstops]
                        },
                        then: "$tsDiff",
                        else: 0
                    }
                }
            }
        };


        let dwntimeproject1 = {
            _id: 0,
            date: {
                $dateFromString: {
                    dateString: { $concat: ["$_id.dd", "-", "$_id.mm", "-", "$_id.yy"] },
                    timezone: devTz
                }
            }
            , idlemin: 1
        };

        let planteCursor = db.collection("macDownTime").aggregate([
            { "$match": dwntimefilter },
            { "$project": dwntimeproject },
            { "$group": dwntimegroup },
            { "$project": dwntimeproject1 },
            { "$sort": dwntimesort }
        ])

        let idleTimeArray = [];

        for (let teDoc = await planteCursor.next(); teDoc != null; teDoc = await planteCursor.next()) {
            if (teDoc.idlemin > 0)
                teDoc.idlemin = Math.round(teDoc.idlemin / 1000 / 60)

            console.log(teDoc.date.toISOString())
            console.log(JSON.stringify({ "idlemin": teDoc.idlemin }))

            idleTimeArray[teDoc.date.toISOString()] = { "idlemin": teDoc.idlemin };
        }


        console.log(" ********************* partcnt array ************************************")


        rematch = {
            fromTs: {
                $gte: parseInt(fromTs)
            },
            toTs: {
                $lte: parseInt(toTs)
            },
            deviceId: deviceId
        };
        regroup = {
            "_id": {
                dd: {
                    "$substr": [{
                        "$dayOfMonth": {
                            date: { $add: [new Date(0), "$fromTs"] }, timezone: devTz
                        }
                    }, 0, 2]
                },
                mm: {
                    "$substr": [{
                        "$month": {
                            date: { $add: [new Date(0), "$fromTs"] }, timezone: devTz
                        }
                    }, 0, 2]
                },
                yy: {
                    "$substr": [{
                        "$year": {
                            date: { $add: [new Date(0), "$fromTs"] }, timezone: devTz
                        }
                    }, 0, 4]
                }
            }, value: {
                "$sum": {
                    "$add": ["$rejectCount.startup", "$rejectCount.production"]
                }
            }, count: {
                $sum: 1
            },
            rr: {
                $sum: "$runrate"
            }
        };

        reproject = {
            _id: 0,
            date: {
                $dateFromString: {
                    dateString: { $concat: ["$_id.dd", "-", "$_id.mm", "-", "$_id.yy"] },
                    timezone: devTz
                }
            }, value: 1, count: 1, rr: 1
        };



        let resultCursor = await db.collection("shiftDetails").aggregate([
            { "$match": rematch },
            { "$group": regroup },
            { "$project": reproject },
            { "$sort": { date: 1 } }
        ]);
        console.log(" ********************* shift detail array ************************************")
        let sftDtlArray = [];
        let irrcnt = 0
        for (let teDoc = await resultCursor.next(); teDoc != null; teDoc = await resultCursor.next()) {
            let irr = 1;
            if (parseInt(teDoc.rr) > 0) {
                irr = parseInt(teDoc.rr) / parseInt(teDoc.count)
            }
            if (resultObj.rejectCnt != undefined)
                resultObj.rejectCnt = resultObj.rejectCnt + teDoc.value;
            else
                resultObj.rejectCnt = teDoc.value;
            if (irr > 1) {
                if (resultObj.irr != undefined) {
                    resultObj.irr = resultObj.irr + irr;
                    irrcnt++;
                }
                else {
                    resultObj.irr = irr;
                    irrcnt++;
                }
            }
            sftDtlArray[teDoc.date.toISOString()] = { "rejectCnt": teDoc.value, "irr": Math.round(irr) };
            console.log(teDoc.date.toISOString())
            console.log(JSON.stringify({ "rejectCnt": teDoc.value, "irr": Math.round(irr) }))
        }


        //  console.log(JSON.stringify(sftDtlArray))
        console.log(" ********************* shift detail array ************************************")

        if (parseInt(resultObj.irr) > 0) {
            resultObj.irr = Math.round(resultObj.irr / irrcnt);
        }


        let devArray = [];

        let assetData = await db.collection("assets").findOne({ "devices.devId": parseInt(deviceId) });
        let curFactory = ObjectID(assetData.factoryId);
        console.log('factory=>' + curFactory);

        let startmt = moment(parseInt(fromTs)).utcOffset(0);
        let endmt = moment(parseInt(toTs)).utcOffset(0);
        console.log('Vengat startday' + startmt);
        console.log('Vengat enDay' + endmt);

        let startDayd = parseInt(startmt.day());
        // let startDayh = parseInt(startmt.hours());
        // let startDaym = startDayh * 60 + parseInt(startmt.minutes());
        // console.log('startDaym=>' + startDaym);
        // startDayh = startDaym / 60;
        let endDayd = parseInt(endmt.day());
        // let endDayh = parseInt(endmt.hours());
        // let endDaym = endDayh * 60 + parseInt(endmt.minutes());
        // console.log('endDaym=>' + endDaym);
        // endDayh = endDaym / 60;

        let startDay = moment(parseInt(fromTs)).utcOffset(5.5).startOf("day");

        console.log('Vengat startday' + startDay);
        let endDay = moment(parseInt(toTs)).utcOffset(5.5).startOf("day");;
        console.log('Vengat enDay' + endDay);




        shiftbreaks = await db.collection("shiftbreakups").aggregate([
            {
                "$match": {
                    factoryId: curFactory
                }
            },
            { "$group": { _id: { day: "$day", type: "$type" }, downTime: { $sum: "$duration" } } },
            { "$sort": { _id: 1 } },
            { "$project": { "downTime": 1, "type": 1, "day": "$_id", "_id": 0 } }
        ]);
        //  console.log(shiftbreaks);
        let shiftBrkArray = []
        let planmin = 1440;
        for (let Doc = await shiftbreaks.next(); Doc != null; Doc = await shiftbreaks.next()) {
            console.log(JSON.stringify(Doc));
            console.log(Doc.day.type);
            let type = Doc.day.type;
            if (type == "up") {
                console.log(JSON.stringify(Doc));
                shiftBrkArray[Doc.day.day] = Doc;
            }
        }

        let dayWiseTime = []

        for (var m = moment(startDay)/*.startOf('day')*/; m.diff(moment(endDay), 'days') <= 0; m.add(1, 'days')) {
            planmin = 0;
            if (shiftBrkArray[m.format('d')]) {
                planmin = shiftBrkArray[m.format('d')].downTime * 60;
            }
            let dateValue = m.clone();
            //     dateValue = dateValue.utcOffset(5.5)
            if (resultObj.planmins != undefined)
                resultObj.planmins = resultObj.planmins + planmin;
            else
                resultObj.planmins = planmin;

            // devArray.push({ date: dateValue, planmins: planmin });
            // devArray[dateValue.toISOString()] = { "planmins": planmin };

            console.log(dateValue.toISOString())
            //sftDtlArray, resultArray
            let prtcntObj = resultArray[dateValue.toISOString()];
            let rejectCntObj = sftDtlArray[dateValue.toISOString()];
            let idleminObj = idleTimeArray[dateValue.toISOString()];
            let prtcnt, mins, rejectCnt, irr, idlemin
            if (prtcntObj) {
                prtcnt = resultArray[dateValue.toISOString()].partCnt;
                mins = resultArray[dateValue.toISOString()].mins;
            }
            if (idleminObj) {
                idlemin = idleminObj.idlemin;
            } else {
                idlemin = 0;
            }
            if (rejectCntObj) {
                rejectCnt = sftDtlArray[dateValue.toISOString()].rejectCnt;
                irr = sftDtlArray[dateValue.toISOString()].irr;
            }


            let avgirr = 1;
            let crr = 0;

            let goodPartCnt = 0;
            console.log(JSON.stringify(prtcntObj))
            console.log(idlemin)
            if (prtcnt && parseInt(prtcnt) > 0) {
                goodPartCnt = parseInt(prtcnt);
                if (mins && parseInt(mins) > 0) {
                    crr = Math.round((parseInt(prtcnt) * 60) / (parseInt(mins) + parseInt(idlemin)));
                }
            }
            console.log(crr)
            if (rejectCnt && parseInt(rejectCnt) > 0 && goodPartCnt > parseInt(rejectCnt)) {
                goodPartCnt = goodPartCnt - parseInt(rejectCnt);
            }
            if (planmin > 1440 || planmin < 0) {
                planmin = 1440
            }
            if (irr && parseInt(irr) > 1) {
                avgirr = parseInt(irr);
            } else {
                avgirr = crr;
            }

            let obj = {}
            obj['partTime'] = planmin;
            obj['partCount'] = goodPartCnt;
            obj['irr'] = avgirr;
            obj['date'] = dateValue;
            dayWiseTime.push(obj);
        }

        resultObj['daywiseSummary'] = dayWiseTime;

        console.log(JSON.stringify(resultObj))

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
        shiftfilter['deviceId'] = deviceId;

        let filter = { ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId, applId: "020100000104" };
        //console.log(filter);
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
        let resultObj = { partCount: 0, irr: 1, prodTime: 0 };


        /*Parts Count */
        let filter = {
            ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) },
            deviceId: deviceId, applId: "020100000104"
        };
        //console.log(filter);
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
                    $sum: 1
                },
                rr: {
                    $sum: "$runrate"
                }
            };
            let project = { startup: 1, production: 1, rr: 1, count: 1 };

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
                let avgrr = (val[0].rr / val[0].count)
                resultObj.irr = avgrr;
                if (resultObj.partCount > reject) {
                    resultObj.partCount = resultObj.partCount - reject
                } else {
                    resultObj.partCount = 0
                }
            }
        }


        let assetData = await db.collection("assets").findOne({ "devices.devId": parseInt(deviceId) })
        //console.log(assetData)
        let curFactory = assetData.factory;

        let startDay = moment(parseInt(fromTs)).utcOffset(5.5).startOf("day");

        //console.log('Vengat startday' + startDay);
        let endDay = moment(parseInt(toTs)).utcOffset(5.5).startOf("day");;
        //console.log('Vengat enDay' + endDay);

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

        //console.log(" Total prod time --> " + prodTime)
        res.json(resultObj);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


module.exports = router;