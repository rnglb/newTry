const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var appliance = require(__base + 'config/appliance');
var device = require(__base + 'config/device');
var request = require("request-promise");

router.get('/', async function (req, res) {

    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;

    let attr = req.query.attr;
    let deviceId = req.query.deviceId;
    let applId = req.query.applId || '';
    let isHourly = (parseInt(toTs) - parseInt(fromTs) <= 86400000) ? true : false;    

    try {

        let db = await DB.Get();
        let devArray = [];
        let devTz = 'Asia/Calcutta'

        if (attr === 'total') {

            let filter = { toTs: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId, totEnergy: { $gte: 0 } };

            let sort = { date: 1 };
            let group = {
                "_id": {
                    hh: {
                        "$substr": [{
                            "$hour": {
                                date: { $add: [new Date(0), "$toTs"] }, timezone: devTz
                            }
                        }, 0, 2]
                    },
                    dd: {
                        "$substr": [{
                            "$dayOfMonth": {
                                date: { $add: [new Date(0), "$toTs"] }, timezone: devTz
                            }
                        }, 0, 2]
                    },
                    mm: {
                        "$substr": [{
                            "$month": {
                                date: { $add: [new Date(0), "$toTs"] }, timezone: devTz
                            }
                        }, 0, 2]
                    },
                    yy: {
                        "$substr": [{
                            "$year": {
                                date: { $add: [new Date(0), "$toTs"] }, timezone: devTz
                            }
                        }, 0, 4]
                    }
                }, totEnergy: { "$sum": "$totEnergy" }
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
                }, totEnergy: 1
            };
            // let project2 = {
            //     _id: 0, hour: { $hour: "$date" }, totEnergy: 1
            // };

            let teCursor = db.collection("totenergy").aggregate([
                { "$match": filter },
                { "$group": group },
                { "$project": project1 },
                { "$sort": sort }
            ])

            console.log(filter);

            for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
                teDoc.date = new Date(teDoc.date).toISOString();
                devArray.push(teDoc);
            }
        }

        if (attr === 'appl') {

            let filter = { toTs: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId, appEnergy: { $gte: 0 } };
            if (applId) {
                filter.applId = applId;
            }
            console.log(filter);
            let project = {
                _id: 0, toTs: 1, applId: 1, appEnergy: 1, hh: {
                    "$add": [{ "$hour": { "$add": [new Date(0), "$toTs", 19800000] } }, 1]
                }
            };
            console.log(project);
            let sort = { hh: 1 };
            let group = { _id: { hh: "$hh", applId: "$applId" }, totEnergy: { "$sum": "$appEnergy" } };
            let project1 = { _id: 0, hh: "$_id.hh", applId: "$_id.applId", totEnergy: 1 };
            let group1 = { _id: "$applId", applArray: { $push: { hh: "$hh", value: "$totEnergy" } } };
            let project2 = { _id: 0, applId: "$_id", applArray: 1 }

            let teCursor = db.collection("appenergy").aggregate([
                { "$match": filter },
                { "$project": project },
                { "$group": group },
                { "$project": project1 },
                { "$sort": sort },
                { "$group": group1 },
                { "$project": project2 }

            ])


            for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
                teDoc.name = appliance[teDoc.applId] || teDoc.applId
                devArray.push(teDoc);
            }
        }

        res.json(devArray);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


router.get('/energySumm', async function (req, res) {
    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;

    let attr = req.query.attr;
    let deviceId = req.query.deviceId;

    try {

        let db = await DB.Get();
        let devArray = [];
        let filter = { toTs: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId, totEnergy: { $gte: 0 } };
        let group = { _id: "0", totEnergy: { "$sum": "$totEnergy" } };
        let project1 = { _id: 0, totEnergy: 1 };

        let teCursor = db.collection("totenergy").aggregate([
            { "$match": filter },
            { "$group": group },
            { "$project": project1 }
        ])



        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            teDoc.totEnergy = Math.round(teDoc.totEnergy);
            devArray.push(teDoc);
        }
        res.json(devArray);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})

router.get('/newenergySumm', async function (req, res) {
    let fromTs = req.query.fromTs;
    let toTs = req.query.toTs;

    let attr = req.query.attr;
    let deviceId = req.query.deviceId;
    let reqtype = req.query.type;
    let assetArray = [];
let db = await DB.Get();
let devicelist = [];

    var findquery = {}, project = {};
        if (reqtype != undefined) {
            if (reqtype == "location") {
                project = 'assetId assetName assetModel assetType internalName internalCode assetMake factory group hwId status maintDt maintcycle maintunit devices.devName location -_id'
                findquery = { "assetId": req.params.assetId, "location": req.params.location };
            }
            else if(reqtype == "device"){
                findquery = { "devices.devName": req.params.deviceId };
            }
  	    let assetArray = await db.collection("assets").find(findquery, project).sort({ _id: -1 });

           for (let asDoc = await assetArray.next(); asDoc != null; asDoc = await assetArray.next()) {

 console.log("asDoc.devices >>>"+asDoc.devices);

              //devicelist.push(asDoc.devices.devName);
           }

        }
        else {
            findquery = { "devices.devName": req.params.deviceId }
        }
  

 console.log("reqtype >>>"+reqtype );

    try {

        
        let devArray = [];
        let filter = { toTs: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId, totEnergy: { $gte: 0 } };
        let group = { _id: "0", totEnergy: { "$sum": "$totEnergy" } };
        let project1 = { _id: 0, totEnergy: 1 };

        let teCursor = db.collection("totenergy").aggregate([
            { "$match": filter },
            { "$group": group },
            { "$project": project1 }
        ])



        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            teDoc.totEnergy = Math.round(teDoc.totEnergy);
            devArray.push(teDoc);
        }
        res.json(devArray);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


module.exports = router;