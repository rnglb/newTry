const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var request = require("request-promise");
var mongo = require('mongodb');
const Alerts = require('../../../../shared-modules/db-models').Alerts;
var moment = require('moment');


router.get('/', async function (req, res) {

    let start;
    let end;

    if (parseInt(req.query.fromDt) > parseInt(req.query.toDt)) {
        end = parseInt(req.query.fromDt) + 1;
        start = parseInt(req.query.toDt);
    } else {
        end = parseInt(req.query.toDt) + 1;
        start = parseInt(req.query.fromDt);
    }

    let deviceId = req.query.deviceId;
    let status = req.query.status;
    try {

        let db = await DB.Get();
        let devArray = [];
        let filter = { deviceId: deviceId, dateTs: { $gt: start, $lte: end }, status: status };
        console.log(filter);
        let sort = { mm: 1, hh: 1 };
        let teCursor = db.collection("machAlerts").aggregate([
            { "$match": filter },
            { "$sort": sort }
        ]);
        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            devArray.push(teDoc);
        }

        res.json(devArray);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


router.post('/', async function (req, res) {

    try {
        let o_id = new mongo.ObjectID(req.body._id);
        let db = await DB.Get();
        let filter = { '_id': o_id };
        delete req.body._id;
        let result = await db.collection("machAlerts").updateOne(filter, { $set: req.body });
        res.status(200).json({ message: 'Done' });
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
})



router.post('/createalert', async function (req, res) {
    try {


        let db = await DB.Get();
        req.body.data.tenantId = req.user.tenantId;
        req.body.data.userId = req.user.userId;
        let alertData = req.body.data;
        console.log(alertData);
        let response = await Alerts.create(alertData);
        res.json(response);
        res.status(200);
    }
    catch (err) {
        res.status(500).json(err);
    }
});

router.get('/getalert', async function (req, res) {
    try {
        let db = await DB.Get();
        // let alerts = await Alerts.find({ "tenantId": req.user.tenantId })
        let alerts = await Alerts.aggregate([{ $match: { "tenantId": req.user.tenantId, "userId": req.user.userId } },
        {
            $lookup: {
                from: "assets",
                localField: "asset",
                foreignField: "devices.devName",
                as: "Assets"
            }
        },
        {
            $project: {
                "criteria": 1, "eventtype": 1, "notifications": 1, "asset": 1,
                "assettype": 1, "tenantId": 1, "Assets.assetName": 1, "_id": 1
            }
        }]);
        res.json({ alerts });
        res.status(200);
    }
    catch (err) {
        res.status(500).json(err);
    }


});

router.put('/updatealert/:id', async function (req, res) {
    try {


        let db = await DB.Get();
        let response = await Alerts.update({ _id: req.params.id }, { $set: req.body.data.muted });
        res.json(response);
        res.status(200);
    }
    catch (err) {
        res.status(500).json(err);
    }
});

router.put('/modifyalert/:id', async function (req, res) {
    try {

        let db = await DB.Get();
        let alertData = req.body.data;
        let response = await Alerts.update({ _id: req.params.id }, { $set: alertData });
        res.json(response);
        res.status(200);
    }
    catch (err) {
        res.status(500).json(err);
    }
});

router.put('/updatemute', async function (req, res) {
    try {
        let db = await DB.Get();
        let data = req.body.data;
        let _id = data["id"];
        delete data["id"];
        let response = await Alerts.update({ _id: _id }, { $set: data });
        res.json(response);
        res.status(200);
    }
    catch (err) {
        res.status(500).json(err);
    }

});

router.get('/testalert', async function (req, res) {

    try {
        let db = await DB.Get();
        let alerts = [];
        let assets = [];
        let dayStartmilli = moment().utcOffset(5.5).startOf('day').valueOf();
        let currmillisec = moment().utcOffset(5.5).valueOf()
        let todaymillisec = currmillisec - dayStartmilli;
        let result = await db.collection("alerts").find({});// Get all the alerts defined
        for (let teDoc = await result.next(); teDoc != null; teDoc = await result.next()) {
            alerts.push(teDoc);
        }
        console.log('hello'); 
        alerts.forEach(async function (element) {
            //Reset alerts notification for every day 
            // await resetAlert(dayStartmilli, element);
            // Load the assets for different asset type like machine, group, location ,plant etc...
            assets = await getAssets(element.assettype.toUpperCase(), element.asset, element.tenantId);
            //Condition for Status Duration INACTIVE,OFF
            if (element.criteria.eventtype == "S-D") {
                let mode = (element.criteria.condition.param == 'SD-I' ? "inactive" : (element.criteria.condition.param == 'SD-O' ? "down" : ""))
                await assets.forEach(async function (ast) {
                    if ((ast.computed.NILM.deviceStatus.value == mode) &&
                        (((currmillisec - ast.computed.NILM.evtstate.changets) / 60000) > element.criteria.condition.duration)) {
                        if (element.muted == 0) {
                            // determine the  esc level 

                            // let tonotifyLevel = element.notifiedlvl == 0 ? 1 : element.notifiedlvl + 1;
                            // let userlevelName = tonotifyLevel == 1 ? element.notifications.level1.name : tonotifyLevel == 2 ? element.notifications.level2.name : element.notifications.level3.name;
                            // let userEmail = tonotifyLevel == 1 ? element.notifications.level1.name : tonotifyLevel == 2 ? element.notifications.level2.name : element.notifications.level3.name;
                            let notify = false;
                            let notifyName;
                            let notifyEmail;
                            let notifeddoc = "notifications.level$.notified";
                            let notifeddocts = "notifications.level$.notifiedts";

                            if (element.notifications.level1.notified == false) {
                                notifyName = element.notifications.level1.name;
                                notifyEmail = element.notifications.level1.email;
                                notify = true;
                                notifeddoc = replace(notifeddoc, '$', 1);
                                notifeddocts = replace(notifeddocts, '$', 1);
                            }

                            if (element.notifications.level1.notified == true && element.notifications.level2.notified == false && element.notifications.level2.name != null) {
                                notifyName = element.notifications.level2.name;
                                notifyEmail = element.notifications.level2.email;
                                notify = true;
                                notifeddoc = replace(notifeddoc, '$', 2);
                                notifeddocts = replace(notifeddocts, '$', 1);
                            }

                            if (element.notifications.level2.notified == true && element.notifications.level3.notified == false && element.notifications.level3.name != null) {
                                notifyName = element.notifications.level3.name;
                                notifyEmail = element.notifications.level3.email;
                                notify = true;
                                notifeddoc = replace(notifeddoc, '$', 3);
                                notifeddocts = replace(notifeddocts, '$', 1);
                            }

                            if (notify) {
                                let notobj = {
                                    medium: element.notifications.mode,
                                    criteria: 'Status Duration ' + ast.computed.NILM.deviceStatus.value.toUpperCase(),
                                    asset: ast.assetId,
                                    deviceId: ast.devices.devId,
                                    tenantId: element.tenantId
                                };
                                await Notifications.create(notobj);
                                let userDataBody = {
                                    "tenantId": element.tenantId,
                                    "template": "statusAlert",
                                    "to": notifyEmail,
                                    "cc": "",
                                    "emailVars": {
                                        "user": notifyName,
                                        "asset": ast.assetId,
                                        "status": ast.computed.NILM.deviceStatus.value
                                    }
                                }
                                await send_email(userDataBody);
                                await db.collection("alerts").updateOne({ _id: ObjectID(element._id) }, { $set: { notifeddoc: true, notifeddocts: currmillisec } }, { $inc: { emailcount: 1 } });
                            }
                        }
                        else if (element.muted == 1 && element.lastmutedts == null) {
                            let userDataBody = {
                                "tenantId": element.tenantId,
                                "template": "statusAlert",
                                "to": element.notifications.level1.email,
                                "cc": element.notifications.level2.email + ";" + element.notifications.level3.email,
                                "emailVars": {
                                    "user": element.notifications.level1.name,
                                    "asset": ast.assetId,
                                    "status": ast.computed.NILM.deviceStatus.value
                                }
                            }
                            await send_email(userDataBody);
                            await db.collection("alerts").updateOne({ _id: ObjectID(element._id) }, { $set: { lastmutedts: currmillisec }, $inc: { emailcount: 1 } });
                        }
                    }

                });

            }
            //Condition for Status Change INACTIVE,OFF,ON
            else if (element.criteria.eventtype == "S-C") {
                let mode = (element.criteria.condition.param == 'SC-I' ? "inactive" : (element.criteria.condition.param == 'SC-O' ? "down" : "active"))
                await assets.forEach(async function (ast) {
                    if (ast.computed.NILM.deviceStatus.value == mode) {
                        if (element.muted == 0) {
                            // determine the  esc level 

                            // let tonotifyLevel = element.notifiedlvl == 0 ? 1 : element.notifiedlvl + 1;
                            // let userlevelName = tonotifyLevel == 1 ? element.notifications.level1.name : tonotifyLevel == 2 ? element.notifications.level2.name : element.notifications.level3.name;
                            // let userEmail = tonotifyLevel == 1 ? element.notifications.level1.name : tonotifyLevel == 2 ? element.notifications.level2.name : element.notifications.level3.name;
                            let notify = false;
                            let notifyName;
                            let notifyEmail;
                            let notifeddoc = "notifications.level$.notified";
                            let notifeddocts = "notifications.level$.notifiedts";
                           console.log("1");
                            if (element.notifications.level1.notified == false) {
                                notifyName = element.notifications.level1.name;
                                notifyEmail = element.notifications.level1.email;
                                notify = true;
                                notifeddoc = notifeddoc.replace('$', 1);
                                notifeddocts = notifeddocts.replace('$', 1);
                                }

                            if (element.notifications.level1.notified == true && element.notifications.level2.notified == false && element.notifications.level2.name != null) {
                                notifyName = element.notifications.level2.name;
                                notifyEmail = element.notifications.level2.email;
                                notify = true;
                                notifeddoc = notifeddoc.replace('$', 2);
                                notifeddocts = notifeddocts.replace('$', 2);
                                                           }

                            if (element.notifications.level2.notified == true && element.notifications.level3.notified == false && element.notifications.level3.name != null) {
                                notifyName = element.notifications.level3.name;
                                notifyEmail = element.notifications.level3.email;
                                notify = true;
                                notifeddoc = notifeddoc.replace('$', 3);
                                notifeddocts = notifeddocts.replace('$', 3);

                                                            }
                           console.log("2");


                            if (notify) {
                              try
                                {
                                  console.log("2.5");  
                                  let notobj = {
                                    medium: element.notifications.mode,
                                    criteria: 'Status Duration ' + ast.computed.NILM.deviceStatus.value.toUpperCase(),
                                    asset: ast.assetId,
                                    deviceId: ast.devices.devId,
                                    tenantId: element.tenantId
                                };
                                await Notifications.create(notobj);
                                let userDataBody = {
                                    "tenantId": element.tenantId,
                                    "template": "statusAlert",
                                    "to": notifyEmail,
                                    "cc": "",
                                    "emailVars": {
                                        "user": notifyName,
                                        "asset": ast.assetId,
                                        "status": ast.computed.NILM.deviceStatus.value
                                    }
                                }
                                console.log('5' + JSON.Stringify(userDataBody));
                                //await send_email(userDataBody);
                                console.log("6");
                                //await db.collection("alerts").updateOne({ _id: ObjectID(element._id) }, { $set: { notifeddoc: true, notifeddocts: currmillisec } }, { $inc: { emailcount: 1 } });
                                console.log("7");
                                
                               }
                               catch(err){
}

                            }
                        }
                        else if (element.muted == 1 && element.lastmutedts == null) {
                            let userDataBody = {
                                "tenantId": element.tenantId,
                                "template": "durationAlert",
                                "to": element.notifications.level1.email,
                                "cc": element.notifications.level2.email + ";" + element.notifications.level3.email,
                                "emailVars": {
                                    "user": element.notifications.level1.name,
                                    "asset": ast.assetId,
                                    "status": ast.computed.NILM.deviceStatus.value,
                                    "dur": ast.computed.NILM.availmins.value
                                }
                            }
                            await send_email(userDataBody);
                            await db.collection("alerts").updateOne({ _id: ObjectID(element._id) }, { $set: { lastmutedts: currmillisec }, $inc: { emailcount: 1 } });
                        }

                    }
                })

            }
            //Condition for Metric Treshold Availability, Performance, Quality
            else if (element.criteria.eventtype == "M-T") {
                // Availability check for each asset, calculated till current time.
                if ((element.criteria.condition.param == 'MT-A')) {
                    await assets.forEach(async function (ast) {
                        try {
                            let shiftdtls = await shift(ast.factory);
                            let availpercent = (ast.computed.NILM.availmins.value / ((shiftdtls.toTs - shiftdtls.fromTs) * 1000 * 60)) * 100;
                            if (availpercent < element.criteria.condition.th1) {
                                let notobj = { medium: element.notifications.mode, criteria: 'Metric Threshold - Availabilty ' + ast.computed.NILM.availmins.value + ' % is lesser than treshold value :' + element.criteria.condition.th1 + '%', asset: ast.assetId, tenantId: element.tenantId };
                                await Notifications.create(notobj);
                                if (element.muted == 0) {
                                    let userDataBody = {
                                        "tenantId": element.tenantId,
                                        "template": "thresholdAlert",
                                        "to": element.notifications.level1.email,
                                        "cc": "",
                                        "emailVars": {
                                            "user": element.notifications.level1.name,
                                            "asset": ast.assetId,
                                            "value": ast.computed.NILM.availmins.value,
                                            "metric": "Availability",
                                            "currValue": availpercent
                                        }
                                    }
                                    await send_email(userDataBody);
                                    await db.collection("alerts").updateOne({ _id: ObjectID(element._id) }, { $inc: { emailcount: 1 } });
                                }
                                else if (element.muted == 1 && element.lastmutedts == null) {
                                    let userDataBody = {
                                        "tenantId": element.tenantId,
                                        "template": "thresholdAlert",
                                        "to": element.notifications.level1.email,
                                        "cc": element.notifications.level2.email + ";" + element.notifications.level3.email,
                                        "emailVars": {
                                            "user": element.notifications.level1.name,
                                            "asset": ast.assetId,
                                            "value": ast.computed.NILM.availmins.value,
                                            "metric": "Availability",
                                            "currValue": availpercent
                                        }
                                    }
                                    await send_email(userDataBody);
                                    await db.collection("alerts").updateOne({ _id: ObjectID(element._id) }, { $set: { lastmutedts: currmillisec }, $inc: { emailcount: 1 } });
                                }
                            }
                        }
                        catch (err) {

                        }
                    });
                }
                // Quality check for each asset, calculated till current time.
                else if ((element.criteria.condition.param == 'MT-Q')) {
                    await assets.forEach(async function (ast) {
                        let shiftdtls = await shift(ast.factory);
                        console.log('shift details=>' + JSON.stringify(shiftdtls));
                        let rejectcount = [];
                        //Get the rejected part count for the shift ,machine
                        let match = { shift: shiftdtls.currentShift, fromTs: { $gte: parseInt(shiftdtls.fromTs) }, toTs: { $lte: parseInt(shiftdtls.endTs) }, deviceId: ast.devices[0].devId.toString() };
                        console.log('MT-Q Match=>' + JSON.stringify(match));
                        let rejcount = await db.collection("shiftDetails").aggregate([{ $match: match },
                        { $group: { _id: "$machine", rejectcount: { $sum: { $add: ["$rejectCount.startup", "$rejectCount.production"] } } } },
                        { $project: { rejectcount: 1, _id: 0 } }]);
                        for (let teDoc = await rejcount.next(); teDoc != null; teDoc = await rejcount.next()) {
                            rejectcount.push(teDoc);
                        }
                        if (rejectcount[0]) {
                            let qualpercent = Math.round(((ast.computed.NILM.partcnt.value - rejectcount[0].rejectcount) / ast.computed.NILM.partcnt.value) * 100);
                            console.log('qualpercent=>' + qualpercent);
                            if (qualpercent < element.criteria.condition.th1) {
                                let notobj = { medium: element.notifications.mode, criteria: ' Metric Threshold - Quality ' + qualpercent + ' % is less than threshold value :' + element.criteria.condition.th1 + '%', asset: ast.assetId, tenantId: element.tenantId };
                                await Notifications.create(notobj);
                                if (element.muted == 0) {
                                    let userDataBody = {
                                        "tenantId": element.tenantId,
                                        "template": "thresholdAlert",
                                        "to": element.notifications.level1.email,
                                        "cc": "",
                                        "emailVars": {
                                            "user": element.notifications.level1.name,
                                            "asset": ast.assetId,
                                            "value": ast.computed.NILM.availmins.value,
                                            "metric": "Quality",
                                            "currValue": qualpercent
                                        }
                                    }
                                    await send_email(userDataBody);
                                    await db.collection("alerts").updateOne({ _id: element._id }, { $inc: { emailcount: 1 } });
                                }
                                else if (element.muted == 1 && element.lastmutedts == null) {
                                    let userDataBody = {
                                        "tenantId": element.tenantId,
                                        "template": "thresholdAlert",
                                        "to": element.notifications.level1.email,
                                        "cc": element.notifications.level2.email + ";" + element.notifications.level3.email,
                                        "emailVars": {
                                            "user": element.notifications.level1.name,
                                            "asset": ast.assetId,
                                            "value": ast.computed.NILM.availmins.value,
                                            "metric": "Quality",
                                            "currValue": qualpercent
                                        }
                                    }
                                    await send_email(userDataBody);
                                    await db.collection("alerts").updateOne({ _id: ObjectID(element._id) }, { $set: { lastmutedts: currmillisec }, $inc: { emailcount: 1 } });
                                }
                            }
                        }

                    });
                }
                //Performance calcuation 
                else if ((element.criteria.condition.param == 'MT-P')) {
                    await assets.forEach(async function (ast) {
                        let shiftdtls = await shift(ast.factory);
                        console.log('shift details=>' + JSON.stringify(shiftdtls));
                        let expectedrunrate = [];
                        //Get the expected run rate for the shift ,machine
                        let match = { shift: shiftdtls.currentShift, fromTs: { $gte: parseInt(shiftdtls.fromTs) }, toTs: { $lte: parseInt(shiftdtls.endTs) }, deviceId: ast.devices[0].devId.toString() };
                        console.log('MT-P Match=>' + JSON.stringify(match));
                        // let exprunrate = await db.collection("shiftDetails").aggregate([{ $match: match },
                        // {
                        //   $lookup: {
                        //     from: "partnumbers",
                        //     localField: "partNo",
                        //     foreignField: "partnumber",
                        //     as: "PartNumber"
                        //   }
                        // },
                        // { $project: { "PartNumber.runrate": 1 } },
                        // { $unwind: { path: "$PartNumber" } }]);
                        let exprunrate = await db.collection("shiftDetails").aggregate([{ $match: match }]);
                        for (let teDoc = await exprunrate.next(); teDoc != null; teDoc = await exprunrate.next()) {
                            expectedrunrate.push(teDoc);
                        }
                        if (expectedrunrate[0]) {
                            let partcnt = parseInt(ast.computed.NILM.partcnt.value);
                            let availmins = parseInt(ast.computed.NILM.availmins.value);
                            let expRR = parseInt(expectedrunrate[0].runrate)
                            let actperf = Math.round(((availmins / partcnt) / expRR) * 100);
                            if (actperf < (element.criteria.condition.th1)) {
                                let notobj = { medium: element.notifications.mode, criteria: 'Metric Threshold - Performance ' + actperf + ' % is less than threshold value :' + element.criteria.condition.th1 + '%', asset: ast.assetId, tenantId: element.tenantId };
                                await Notifications.create(notobj);
                                if (element.muted == 0) {
                                    let userDataBody = {
                                        "tenantId": element.tenantId,
                                        "template": "thresholdAlert",
                                        "to": element.notifications.level1.email,
                                        "cc": "",
                                        "emailVars": {
                                            "user": element.notifications.level1.name,
                                            "asset": ast.assetId,
                                            "value": ast.computed.NILM.availmins.value,
                                            "metric": "Performance",
                                            "currValue": actperf
                                        }
                                    }
                                    await send_email(userDataBody);
                                    await db.collection("alerts").updateOne({ _id: ObjectID(element._id) }, { $inc: { emailcount: 1 } });
                                }
                                else if (element.muted == 1 && element.lastmutedts == null) {
                                    let userDataBody = {
                                        "tenantId": element.tenantId,
                                        "template": "thresholdAlert",
                                        "to": element.notifications.level1.email,
                                        "cc": element.notifications.level2.email + ";" + element.notifications.level3.email,
                                        "emailVars": {
                                            "user": element.notifications.level1.name,
                                            "asset": ast.assetId,
                                            "value": ast.computed.NILM.availmins.value,
                                            "metric": "Performance",
                                            "currValue": actperf
                                        }
                                    }
                                    await send_email(userDataBody);
                                    await db.collection("alerts").updateOne({ _id: ObjectID(element._id) }, { $set: { lastmutedts: currmillisec }, $inc: { emailcount: 1 } });
                                }
                            }
                        }

                    });
                }
            }
        });
        res.json(200);
    }
    catch (err) {
        res.json(500);
        console.log(err);
    }
    async function getAssets(type, assetId, tenantId) {
        try {
            let db = await DB.Get();
            let assets = [];
            let result = []
            if (type == 'MACHINE') {
                result = await db.collection("assets").find({ "devices.devId": parseInt(assetId), tenantId: tenantId });
                for (let teDoc = await result.next(); teDoc != null; teDoc = await result.next()) {
                    assets.push(teDoc);
                }

            }
            else if (type == 'GROUP') {
                result = await db.collection("assets").find({ group: assetId, tenantId: tenantId });
                for (let teDoc = await result.next(); teDoc != null; teDoc = await result.next()) {
                    assets.push(teDoc);
                }
            }
            else if (type == 'LOCATION') {
                result = await db.collection("assets").find({ location: assetId, tenantId: tenantId });
                for (let teDoc = await result.next(); teDoc != null; teDoc = await result.next()) {
                    assets.push(teDoc);
                }
            }

            return assets;
        }
        catch (err) {
            return err;
        }

    }
    async function shift(factory) {
        try {
            console.log('factory=>' + factory);
            let db = await DB.Get();
            let retobj, fromTs, toTs, endTs;
            let currentShift = 'shift 1';
            let currentday = moment().isoWeekday();
            console.log('current day=>' + currentday);
            let shift = [];
            let match = { "name": factory };
            let dayStartmilli = moment().utcOffset(5.5).startOf('day').valueOf();
            let currmillisec = moment().utcOffset(5.5).valueOf()
            let todaymillisec = currmillisec - dayStartmilli;
            console.log('shift match=>' + JSON.stringify(match));
            let xshift = await db.collection("factories").aggregate([{ $match: match },
            { $unwind: "$shift" },
            { $match: { "shift.days": parseInt(currentday) } },
            { $project: { shift: '$shift.shiftDetails' } },
            { $unwind: "$shift" },
            {
                $project: {
                    "Timings": "$shift.Timings", "Name": "$shift.Name", "Order": "$shift.Order",
                    "Start": { $cond: { if: { $gt: ["$shift.Order", "1"] }, then: { "$add": [{ "$multiply": [{ "$multiply": [{ "$multiply": ["$shift.Timings.From", 60] }, 60] }, 1000] }, 1000] }, else: { "$multiply": [{ "$multiply": [{ "$multiply": ["$shift.Timings.From", 60] }, 60] }, 1000] } } },
                    "End": { "$multiply": [{ "$multiply": [{ "$multiply": ["$shift.Timings.To", 60] }, 60] }, 1000] }
                }
            },
            { $sort: { "Order": 1 } }]);
            for (let teDoc = await xshift.next(); teDoc != null; teDoc = await xshift.next()) {
                await shift.push(teDoc);
            }
            console.log('shift length=>' + shift.length);
            await shift.forEach((element) => {
                if (element.Name.toLocaleLowerCase === "shift 1" && todaymillisec < element.Start) {
                    fromTs = dayStartmilli - 7200000;
                    toTs = currmillisec;
                    currentShift = 'shift 3';
                    endTs = dayStartmilli + 21600000;
                    retobj = { fromTs: fromTs, toTs: toTs, endTs: endTs, currentShift: currentShift.split(" ").join("").toLocaleLowerCase() };
                } else if ((element.Start < todaymillisec) && (element.End > todaymillisec)) {
                    fromTs = dayStartmilli + element.Start;
                    toTs = currmillisec;
                    currentShift = element.Name;
                    endTs = dayStartmilli + element.End;
                    retobj = { fromTs: fromTs, toTs: toTs, endTs: endTs, currentShift: currentShift };

                }
            });
            return retobj;
        }
        catch (err) {
            return err;
        }
    }

    async function send_email(userDataBody) {
        try {
            let url =
                request({
                    url: config.url.email + "/sendMail",
                    method: "POST",
                    headers: { 'content-type': 'application/json' },
                    json: true,
                    body: userDataBody
                }, function (error, response, body) {
                    if (error) {
                        console.log(error);
                        return url;

                    }
                    console.log("received response")
                    console.log(body)
                    return url;

                });
        }
        catch (err) {
        }
    }

    async function resetAlert(todaymillsec, alert) {
        try {
            if (alert.lastmutedts < todaymillsec) {
                await db.collection("alerts").update({ _id: ObjectID(element._id) }, { $set: { lastmutedts: null, emailcount: 0, muted: 0 } });
            }
            return "Success";
        }
        catch (err) {
            return err;
        }
    }






})


module.exports = router;