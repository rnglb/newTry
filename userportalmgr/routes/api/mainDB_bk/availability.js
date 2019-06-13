const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var appliance = require(__base + 'config/appliance');
var device = require(__base + 'config/device');
var request = require("request-promise");
var moment = require('moment');
var ObjectID = require('mongodb').ObjectID;

router.get('/availSumm', async function (req, res) {

    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;
    let limit = req.query.limit || 3000;

    let attr = req.query.attr;
    let deviceId = req.query.deviceId;
    let applId = req.query.applId;
    console.log(req.query);

    try {

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

        console.log(JSON.stringify(filter))
        console.log(JSON.stringify(project))
        console.log(JSON.stringify(group))
        console.log(JSON.stringify(project1))

        let teCursor = db.collection("events").aggregate([
            { "$match": filter },
            { "$project": project },
            { "$group": group },
            { "$project": project1 }
        ])


        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            teDoc.minutes = Math.round(teDoc.minutes / 1000 / 60);
            console.log('vengat push from events' + teDoc.minutes);
            devArray.push({ "planmins": teDoc.planmins, "minutes": teDoc.minutes, "totUpTime": "0" });
        }

        let lstartTS = moment(parseInt(fromTs)).format("YYYY-MM-DDTHH:mm:ss");
        console.log("TS==> " + lstartTS);

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
        console.log('TenantId=>' + req.user.tenantId);
        let tenantData = await db.collection("tenants").findOne({ tenantId: req.user.tenantId });
        console.log(tenantData.smallStops + tenantData.preventiveMaintenance);
        let smallstops = tenantData.smallStops * 60000;
        if (smallstops == null) {
            smallstops = 0;
        }
        console.log(smallstops);
        let plangroup;
        if (tenantData.preventiveMaintenance == "plannedDowntime") {
            console.log("preventiveMaintenance - planneddowntime");
            plangroup = {
                _id: "0", planmin: {
                    "$sum": {
                        $cond: {
                            if: {
                                $in: ["$reasontype", ["Meal Break", "Preventive Maintenance", "Planned Shutdown", "Small Break"]]
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
                                $lte: ["$tsDiff", smallstops]
                            },
                            then: "$tsDiff",
                            else: 0
                        }
                    }
                }
            };
        } else {
            console.log("preventiveMaintenance - unplanneddowntime");
            plangroup = {
                _id: "0", planmin: {
                    "$sum": {
                        $cond: {
                            if: {
                                $in: ["$reasontype", ["Meal Break", "Planned Shutdown", "Small Break"]]
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
                                $lte: ["$tsDiff", smallstops]
                            },
                            then: "$tsDiff",
                            else: 0
                        }
                    }
                }
            };
        }

        let planproject1 = { _id: 0, planmin: 1, idlemin: 1 };

        let assetData = await db.collection("assets").findOne({ "devices.devId": parseInt(deviceId) });
        console.log('assetData=>' + assetData)
        let curFactory = ObjectID(assetData.factoryId);
        console.log("devices >>>" + curFactory);

        let startmt = moment(parseInt(fromTs)).utcOffset(5.5);
        let endmt = moment(parseInt(toTs)).utcOffset(5.5);
        console.log('Vengat startday' + startmt);
        console.log('Vengat enDay' + endmt);

        let startDayd = parseInt(startmt.day());
        let startDayh = parseInt(startmt.hours());
        let startDaym = startDayh * 60 + parseInt(startmt.minutes());
        console.log('startDaym=>' + startDaym);
        startDayh = startDaym / 60;
        let endDayd = parseInt(endmt.day());
        let endDayh = parseInt(endmt.hours());
        let endDaym = endDayh * 60 + parseInt(endmt.minutes());
        console.log('endDaym=>' + endDaym);
        endDayh = endDaym / 60;

        let isHourly = (parseInt(toTs) - parseInt(fromTs) <= 86400000) ? true : false;
        let totUpTime = 0;
        let durat = 0;
        if (isHourly) {
            console.log('vengat - isHourly');
            console.log('startDayd' + startDayd);
            console.log('startDayh' + startDayh);
            console.log('endDayd' + endDayd);
            console.log('endDayh' + endDayh);
            if (startDayd == endDayd) {
                console.log('vengat - same day');

                shiftbreaks = db.collection("shiftbreakups").find({
                    factoryId: curFactory, type: "up", day: (startDayd == 0) ? 7 : startDayd,
                    $nor: [{
                        $or: [{
                            frmHr: { $gte: endDayh }
                        }, {
                            toHr: { $lte: startDayh }
                        }]
                    }]
                });
                for (let Doc = await shiftbreaks.next(); Doc != null; Doc = await shiftbreaks.next()) {
                    console.log(JSON.stringify(Doc));
                    if (startDayh <= Doc.frmHr && Doc.toHr <= endDayh) {
                        durat = Doc.toHr - Doc.frmHr;
                    } else if (startDayh <= Doc.frmHr && endDayh <= Doc.toHr) {
                        durat = endDayh - Doc.frmHr;
                    }
                    else if (Doc.frmHr <= startDayh && endDayh <= Doc.toHr) {
                        durat = endDayh - startDayh;
                    } else if (Doc.frmHr <= startDayh && Doc.toHr <= endDayh) {
                        durat = Doc.toHr - startDayh;
                    } else { durat = 0; }
                    console.log(durat);
                    totUpTime = parseInt(totUpTime) + durat;
                    console.log(totUpTime);
                }
            } else {
                console.log('vengat - different day');
                console.log(curFactory);
                shiftbreaks = db.collection("shiftbreakups").find({
                    factoryId: curFactory, type: "up", day: (startDayd == 0) ? 7 : startDayd,
                    $nor: [{
                        $or: [{
                            frmHr: { $gte: 24 }
                        }, {
                            toHr: { $lte: startDayh }
                        }]
                    }]
                });
                for (let Doc = await shiftbreaks.next(); Doc != null; Doc = await shiftbreaks.next()) {
                    //   console.log(Doc.duration);
                    if (startDayh <= Doc.frmHr && Doc.toHr <= 24) {
                        durat = Doc.toHr - Doc.frmHr;
                    } else if (startDayh <= Doc.frmHr && 24 <= Doc.toHr) {
                        durat = 24 - Doc.frmHr;
                    }
                    else if (Doc.frmHr <= startDayh && 24 <= Doc.toHr) {
                        durat = 24 - startDayh;
                    } else if (Doc.frmHr <= startDayh && Doc.toHr <= 24) {
                        durat = Doc.toHr - startDayh;
                    } else { durat = 0; }
                    console.log(durat);
                    totUpTime = parseInt(totUpTime) + durat;
                    console.log(totUpTime);
                }
                shiftbreaks = db.collection("shiftbreakups").find({
                    factoryId: curFactory, type: "up", day: (endDayd == 0) ? 7 : endDayd,
                    $nor: [{
                        $or: [{
                            frmHr: { $gte: endDayh }
                        }, {
                            toHr: { $lte: 0 }
                        }]
                    }]
                });
                for (let Doc = await shiftbreaks.next(); Doc != null; Doc = await shiftbreaks.next()) {
                    console.log(Doc.duration);
                    if (0 <= Doc.frmHr && Doc.toHr <= endDayh) {
                        durat = Doc.toHr - Doc.frmHr;
                    } else if (0 <= Doc.frmHr && endDayh <= Doc.toHr) {
                        durat = endDayh - Doc.frmHr;
                    }
                    else if (Doc.frmHr <= 0 && endDayh <= Doc.toHr) {
                        durat = endDayh - 0;
                    } else if (Doc.frmHr <= 0 && Doc.toHr <= endDayh) {
                        durat = Doc.toHr - 0;
                    } else { durat = 0; }
                    totUpTime = parseInt(totUpTime) + durat;
                }
            }
        } else {
            //var totdays = Math.ceil(Math.abs(new Date(endmt).getDate() - new Date(startmt).getDate()));
			var totdays=endmt.diff(startmt, 'days');
            totdays = parseInt(totdays);
            console.log('Vengat totDays' + totdays);
            let startdayNo = startDayd;
            startdayNo = parseInt(startdayNo);
            console.log('vengat start day number ' + startdayNo);

            let iniHang = 8 - startdayNo;//4
            console.log('vengat inihang: ' + iniHang);
            let shiftbreaks;

            if (startdayNo + totdays <= 7) {
                console.log('vengat inside if');
                shiftbreaks = db.collection("shiftbreakups").aggregate([
                    {
                        "$match": {
                            factoryId: curFactory, type: "up", day: {
                                $gte: startdayNo, $lte: startdayNo + totdays
                            }
                        }
                    },
                    { "$group": { _id: "$type", upTime: { $sum: "$duration" } } },
                ]);
                for (let Doc = await shiftbreaks.next(); Doc != null; Doc = await shiftbreaks.next()) {
                    console.log(Doc.upTime);
                    totUpTime = Doc.upTime;
                }
            } else {
                console.log('vengat inside else');
                shiftbreaks = db.collection("shiftbreakups").aggregate([
                    {
                        "$match": {
                            factoryId: curFactory, type: "up", day: {
                                $gte: startdayNo
                            }
                        }
                    },
                    { "$group": { _id: "$type", upTime: { $sum: "$duration" } } },
                ]);
                for (let Doc = await shiftbreaks.next(); Doc != null; Doc = await shiftbreaks.next()) {
                    console.log(Doc.upTime);
                    totUpTime = Doc.upTime;
                }
                let weekcycle = Math.floor((totdays - iniHang) / 7);//4
                weekcycle = parseInt(weekcycle);
                console.log('vengat weekcycle : ' + weekcycle);
                if (weekcycle > 0) {
                    shiftbreaks = db.collection("shiftbreakups").aggregate([
                        {
                            "$match": {
                                factoryId: curFactory, type: "up"
                            }
                        },
                        { "$group": { _id: "$type", upTime: { $sum: "$duration" } } },
                    ]);
                    for (let Doc = await shiftbreaks.next(); Doc != null; Doc = await shiftbreaks.next()) {
                        console.log(Doc.upTime);
                        totUpTime = parseInt(totUpTime) + parseInt(Doc.upTime * weekcycle) ;
                    }
                }

                let endHang = (totdays - iniHang) - (weekcycle * 7);
                endHang = parseInt(endHang);
                console.log('vengat endhang : ' + endHang);
                if (endHang > 0) {
                    shiftbreaks = db.collection("shiftbreakups").aggregate([
                        {
                            "$match": {
                                factoryId: curFactory, type: "up", day: {
                                    $lte: endHang
                                }
                            }
                        },
                        { "$group": { _id: "$type", upTime: { $sum: "$duration" } } },
                    ]);
                    for (let Doc = await shiftbreaks.next(); Doc != null; Doc = await shiftbreaks.next()) {
                        console.log(Doc.upTime);
                        totUpTime = parseInt(totUpTime) + parseInt(Doc.upTime);
                    }
                }
            }
        }
        console.log(devArray);
        console.log('vengat final output totUpTime -' + totUpTime);
        if (devArray[0]) {  // not executed if there is no available data
            let planteCursor = db.collection("macDownTime").aggregate([
                { "$match": planfilter },
                { "$project": planproject },
                { "$group": plangroup },
                { "$project": planproject1 }
            ])
            console.log("$match: " + JSON.stringify(planfilter));
            console.log("$project: " + JSON.stringify(planproject));
            console.log("$group: " + JSON.stringify(plangroup));
            console.log("$project: " + JSON.stringify(planproject1));

            for (let teDoc = await planteCursor.next(); teDoc != null; teDoc = await planteCursor.next()) {
                if (teDoc.planmin > 0)
                    teDoc.planmin = Math.round(teDoc.planmin / 1000 / 60)
                if (teDoc.idlemin > 0)
                    teDoc.idlemin = Math.round(teDoc.idlemin / 1000 / 60)

                devArray[0].planmins = teDoc.planmin < 0 ? 0 : teDoc.planmin;
                devArray[0].minutes = devArray[0].minutes + teDoc.idlemin < 0 ? 0 : devArray[0].minutes + teDoc.idlemin;
            }

            console.log('vengad totuptime => ' + totUpTime)
            devArray[0].totUpTime = totUpTime * 60;
        }
        else {
            devArray.push({ "planmins": "0", "minutes": "0", "totUpTime": "0" });
        }
        console.log(devArray);
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
    let devTz = 'Asia/Calcutta';
    let diffhrs = (parseInt(toTs) - parseInt(fromTs)) / 3600000;
    console.log(diffhrs);
    let isHourly = (parseInt(toTs) - parseInt(fromTs) <= 86400000) ? true : false;
    try {

        let db = await DB.Get();
        let responseObj = {};
        let devArray = [];

        let assetData = await db.collection("assets").findOne({ "devices.devId": parseInt(deviceId) });
        let curFactory = ObjectID(assetData.factoryId);
        console.log('factory=>' + curFactory);

        let startmt = moment(parseInt(fromTs)).utcOffset(0);
        let endmt = moment(parseInt(toTs)).utcOffset(0);
        console.log('Vengat startmt' + startmt);
        console.log('Vengat endmt' + endmt);

        let startDayd = parseInt(startmt.day());
        let startDayh = parseInt(startmt.hours());
        let startDaym = startDayh * 60 + parseInt(startmt.minutes());
        console.log('startDaym=>' + startDaym);
        startDayh = startDaym / 60;
        let endDayd = parseInt(endmt.day());
        let endDayh = parseInt(endmt.hours());
        let endDaym = endDayh * 60 + parseInt(endmt.minutes());
        console.log('endDaym=>' + endDaym);
        endDayh = endDaym / 60;

        let startDay = moment(parseInt(fromTs)).utcOffset(5.5).startOf("day");

        console.log('Vengat startday' + startDay);
        let endDay = moment(parseInt(toTs)).utcOffset(5.5).startOf("day");;
        console.log('Vengat enDay' + endDay);

        if (isHourly) {
            var step;
            for (step = startDayh; step <= startDayh + parseInt(diffhrs); step++) {
                let hourValue = startmt.clone().startOf('day').add(step, 'hours');
                devArray.push({ date: hourValue, planmins: 0 });
            }
            console.log(JSON.stringify(devArray))
            console.log('vengat - isHourly');
            console.log('startDayd' + startDayd);
            console.log('startDayh' + startDayh);
            console.log('endDayd' + endDayd);
            console.log('endDayh' + endDayh);
            let planminArray = [];
            if (startDayd == endDayd) {
                console.log('vengat - same day');

                shiftbreaks = db.collection("shiftbreakups").find({
                    factory: curFactory, type: "down", day: (startDayd == 0) ? 7 : startDayd,
                    $nor: [{
                        $or: [{
                            frmHr: { $gte: endDayh }
                        }, {
                            toHr: { $lte: startDayh }
                        }]
                    }]
                });

                for (let Doc = await shiftbreaks.next(); Doc != null; Doc = await shiftbreaks.next()) {
                    console.log(Doc);
                    for (step = Doc.frmHr; step <= Doc.frmHr + Doc.duration; step++) {
                        hourValue = startmt.clone();
                        //devArray.push({ date: hourValue.add(step, 'hours'), planmins: 60 });
                        planminArray[hourValue.add(step, 'hours')] = { "planmins": 60 };
                    }
                }
            } else {
                console.log('vengat - different day');

                shiftbreaks = db.collection("shiftbreakups").find({
                    factoryId: curFactory, type: "down", day: (startDayd == 0) ? 7 : startDayd,
                    $nor: [{
                        $or: [{
                            frmHr: { $gte: 24 }
                        }, {
                            toHr: { $lte: startDayh+5.5 }
                        }]
                    }]
                });
                for (let Doc = await shiftbreaks.next(); Doc != null; Doc = await shiftbreaks.next()) {
                    console.log('vengat - ' + Doc.frmHr + ' - ' + Doc.toHr + ' - ' + Doc.duration + ' - ' + Doc.day);
                    for (step = Doc.frmHr; step < Doc.frmHr + Doc.duration; step++) {
                        // Runs 5 times, with values of step 0 through 4.
                        hourValue = startmt.startOf('day').clone();
                        console.log('hourvalue-step=>'+hourValue+' - '+step);
                        //devArray.push({ date: hourValue.add(step, 'hours'), planmins: 60 });
                        planminArray[hourValue.add(step-5.5, 'hours').toISOString()] = { "planmins": 60 };
                    }
                }
                shiftbreaks = db.collection("shiftbreakups").find({
                    factoryId: curFactory, type: "down", day: (endDayd == 0) ? 7 : endDayd,
                    $nor: [{
                        $or: [{
                            frmHr: { $gte: endDayh+5.5 }
                        }, {
                            toHr: { $lte: 0 }
                        }]
                    }]
                });
                for (let Doc = await shiftbreaks.next(); Doc != null; Doc = await shiftbreaks.next()) {
                    console.log('vengat - ' + Doc.frmHr + ' - ' + Doc.toHr + ' - ' + Doc.duration + ' - ' + Doc.day);
                    for (step = Doc.frmHr; step < Doc.frmHr+Doc.duration; step++) {
                        // Runs 5 times, with values of step 0 through 4.
                        hourValue = endmt.startOf('day').clone();
                        console.log('hourvalue-step=>'+hourValue+' - '+step);
                        //devArray.push({ date: hourValue.add(step, 'hours'), planmins: 60 });
                        planminArray[hourValue.add(step-5.5, 'hours').toISOString()] = { "planmins": 60 };
                    }
                }
            }

            console.log(planminArray);
            devArray.forEach((ele) => {
                if (planminArray[ele.date.toISOString()]) {
                    console.log('ele=>' + JSON.stringify(ele));
                    ele.planmins = planminArray[ele.date.toISOString()].planmins;
                }
            })

        } else {
           console.log("Vengad - daw wise split")
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
                if (type == "down") {
                    console.log(JSON.stringify(Doc));
                    shiftBrkArray[Doc.day.day] = Doc;
                }
            }
            for (var m = moment(startDay)/*.startOf('day')*/; m.diff(moment(endDay), 'days') <= 0; m.add(1, 'days')) {
                planmin = 0;
                if (shiftBrkArray[m.format('d')]) {
                    planmin = shiftBrkArray[m.format('d')].downTime * 60;
                }
                let dateValue = m.clone();
                devArray.push({ date: dateValue, planmins: planmin });
            }
        }

        console.log(JSON.stringify(devArray))

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

        let resultArray1 = [];

        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            teDoc.minutes = Math.round(teDoc.minutes / 1000 / 60)
            //devArray.push(teDoc);
            //console.log(teDoc);
            resultArray1[teDoc.date.toISOString()] = { "minutes": teDoc.minutes };
        }
        console.log(resultArray1);
        devArray.forEach((ele) => {
            if (resultArray1[ele.date.toISOString()]) {
                ele.minutes = resultArray1[ele.date.toISOString()].minutes < 0 ? 0 : resultArray1[ele.date.toISOString()].minutes;
            } else {
                ele.minutes = 0;
            }
        })

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

        console.log('TenantId=>' + req.user.tenantId);
        let tenantData = await db.collection("tenants").findOne({ tenantId: req.user.tenantId });
        console.log(tenantData.smallStops + tenantData.preventiveMaintenance);
        let smallstops = tenantData.smallStops * 60000;
        if (smallstops == null) {
            smallstops = 0;
        }
        console.log(smallstops);
        let plangroup;
        if (tenantData.preventiveMaintenance == "plannedDowntime") {
            console.log("preventiveMaintenance - planneddowntime");

            plangroup = {
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
                                $in: ["$reasontype", ["Meal Break", "Preventive Maintenance", "Planned Shutdown", "Small Break"]]
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
                                $lte: ["$tsDiff", smallstops]
                            },
                            then: "$tsDiff",
                            else: 0
                        }
                    }
                }
            };
        }
        else {
            plangroup = {
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
                                $in: ["$reasontype", ["Meal Break",  "Planned Shutdown", "Small Break"]]
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
                                $lte: ["$tsDiff", smallstops]
                            },
                            then: "$tsDiff",
                            else: 0
                        }
                    }
                }
            };
        }
        if (!isHourly) {
            plangroup["_id"]["hh"] = "00"
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
console.log("************************** small stops ****************************************")
        for (let teDoc = await planteCursor.next(); teDoc != null; teDoc = await planteCursor.next()) {
            if (teDoc.planmin > 0)
                teDoc.planmin = Math.round(teDoc.planmin / 1000 / 60)
            if (teDoc.idlemin > 0)
                teDoc.idlemin = Math.round(teDoc.idlemin / 1000 / 60)
                console.log(teDoc.date.toISOString())
                console.log(JSON.stringify({ "idlemin": teDoc.idlemin }))
            resultArray[teDoc.date.toISOString()] = { "planmin": teDoc.planmin, "idlemin": teDoc.idlemin };
        }
        console.log("************************** small stops ****************************************")
        let overflow = 0;
        let ceilValue = 60;
        if (!isHourly) {
            ceilValue = 1440;
        }
        devArray.forEach((ele) => {
            console.log( " current ele => "+ JSON.stringify(ele))
            console.log(" current overflow : -> "+overflow)
            if(overflow > 0){
                ele.planmins = ele.planmins + overflow;
            }
            console.log(" current ele planmins : -> "+ ele.planmins)
            if (resultArray[ele.date.toISOString()]) {
                let currPlanmin = resultArray[ele.date.toISOString()].planmin;
                console.log(" original planmins : -> "+ currPlanmin)
                ele.planmins = ele.planmins + currPlanmin;
                // if(parseInt(currPlanmin) > 60){
                //     overflow = currPlanmin - 60;
                //     currPlanmin = 60;
                // }
                // ele.planmins = ele.planmins + resultArray[ele.date.toISOString()].planmin;
                // ele.planmins = ele.planmins + currPlanmin;
                ele.minutes = ele.minutes + resultArray[ele.date.toISOString()].idlemin < 0 ? 0 : ele.minutes + resultArray[ele.date.toISOString()].idlemin;
               // ele.planmins = ele.planmins > 60 ? 60 : ele.planmins;
                //ele.minutes = ele.minutes > 60 ? 60 : ele.minutes;
                //ele.planmins = ele.planmins + ele.minutes > 60 ? 60 - ele.minutes : ele.planmins;
            } else {
                ele.planmins = ele.planmins;
            }
            if(parseInt(ele.planmins) > ceilValue){
                overflow = ele.planmins - ceilValue;
                ele.planmins = ceilValue;
            }else{
                overflow = 0;
            }
            console.log(" updated ele planmins : -> "+ ele.planmins)
        })
        console.log(JSON.stringify(devArray))
        res.json(devArray);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


module.exports = router;