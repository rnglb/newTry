const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var appliance = require(__base + 'config/appliance');
var device = require(__base + 'config/device');
var request = require("request-promise");
var shift = require(__base + 'config/shift');

var moment = require('moment');



router.get('/', async function (req, res) {
    try {
        if (!req.query.deviceId || !req.query.applId || !req.query.fromTs || !req.query.toTs) {
            throw new Error('Invalid param - deviceId: ' + req.query.deviceId + ' applId: ')
        }

        let fromTs = req.query.fromTs;
        let toTs = req.query.toTs;
        let deviceId = req.query.deviceId;
        let db = await DB.Get();
        let devArray = [];

        /*Part count */
        let filter = { ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId, applId: "020100000104" };
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

        let dayStartmilli = moment(parseInt(fromTs)).valueOf();
        let endStartmilli = moment(parseInt(toTs)).valueOf();

        // let dayStartmilli = moment().utcOffset(5.5).startOf('day').valueOf();
        // let endStartmilli = moment().utcOffset(5.5).endOf('day').valueOf();
        // let currmillisec = moment().utcOffset(5.5).valueOf()
        // let todaymillisec = currmillisec - dayStartmilli;
        // let shiftset = false;

        // let result = {};

        // let currshift = "shift1";

        // shift.forEach((ele) => {
        //     if (!shiftset) {
        //         if (ele.name === "shift1" && todaymillisec < ele.start) {
        //             currshift = "shift3"
        //         } else if (ele.start < todaymillisec && ele.end > todaymillisec) {
        //             currshift = ele.name;
        //         }
        //     }
        // })

        if (devArray.length > 0) {
            let shiftfilter = { deviceId: deviceId, fromTs: { $gte: parseInt(dayStartmilli) }, toTs: { $lte: parseInt(endStartmilli) } };
            let group = { _id: "$machine", startup: { $sum: "$rejectCount.startup" }, production: { $sum: "$rejectCount.production" } };
            let project = { startup: 1, production: 1 };

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
                let quality = ((devArray[0].count - reject) / devArray[0].count) * 100;
                devArray[0].startup = val[0].startup;
                devArray[0].production = val[0].production;
                devArray[0].quality = quality;
            }
            else {
                let emptyresult = { "startup": 0, "production": 0, "quality": 100 };
                devArray[0]=emptyresult;            }
        }
        else {
            let emptyresult = { "startup": 0, "production": 0, "quality": 100 };
            devArray.push(emptyresult);
        }
        res.json(devArray);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})

router.get('/qualityMetric', async function (req, res) {
    try {

        let devTz = 'Asia/Calcutta'
        let db = await DB.Get();
        let match = { ts: { $gte: parseInt(req.query.fromTs), $lt: parseInt(req.query.toTs) }, deviceId: req.query.deviceId, applId: "020100000104" };
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
            }, count: { "$sum": "$fromState" }
        };
        let project = {
            _id: 0,
            date: {
                $dateFromString: {
                    dateString: { $concat: ["$_id.dd", "-", "$_id.mm", "-", "$_id.yy"] },
                    timezone: devTz
                }
            }, count: 1
        };

        console.log('filter=>'+JSON.stringify(match));
        console.log('group =>'+JSON.stringify(group ));
        console.log('project =>'+JSON.stringify(project ));
     
        let teCursor = await db.collection("events").aggregate([
            { "$match": match },
            { "$group": group },
            { "$project": project }
        ]);
              var array_1 = [];
        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            array_1.push(teDoc);
        }
        match = { fromTs: { $gte: parseInt(req.query.fromTs)}, toTs: {$lte: parseInt(req.query.toTs) }, deviceId: req.query.deviceId };
        group = {
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
            }, value: { "$sum": { "$add": ["$rejectCount.startup", "$rejectCount.production"] } }
        };

        project = {
            _id: 0,
            date: {
                $dateFromString: {
                    dateString: { $concat: ["$_id.dd", "-", "$_id.mm", "-", "$_id.yy"] },
                    timezone: devTz
                }
            }, value: 1
        };



        let resultCursor = await db.collection("shiftDetails").aggregate([
            { "$match": match },
            { "$group": group },
            { "$project": project }
        ]);

      
        var array_2 = [];
        for (let teDoc = await resultCursor.next(); teDoc != null; teDoc = await resultCursor.next()) {
            array_2.push(teDoc);
        }
        let resultArray = [];
        var found = false;
        let result = {};
        array_1.forEach((itr) => {
            found = false;
            array_2.forEach((idx) => {
                if (itr.date.valueOf() == idx.date.valueOf()) {
                    found = true;
                    let qual = ((itr.count - idx.value) / itr.count * 100);
                    qual = qual < 0 ? 0 : qual;
                    result = { Date: itr.date.toISOString(), Quality: qual }
                    resultArray.push(result);
                }
            })
            if (!found) {
                resultArray.push({ Date: itr.date.toISOString(), Quality: 100 });
            }
        })
        res.json(resultArray);
    }
    catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
})

module.exports = router;