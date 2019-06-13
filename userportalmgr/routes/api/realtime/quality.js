const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var appliance = require(__base + 'config/appliance');
var device = require(__base + 'config/device');
var request = require("request-promise");
var shift = require(__base + 'config/shift');

var moment = require('moment');

let quality = async function (partparam) {
    try {


        let fromTs = partparam.fromTs;
        let toTs = partparam.toTs;
        let deviceId = partparam.deviceId;
        let applId = partparam.applId;
        let userId = partparam.userId;
        let currshift= partparam.currentShift;

        let db = await DB.Get();
        let devArray = [];
        let macarray = [];

        /*Part count */
        let filter = { ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, applId: "020100000104", deviceId: { $in: deviceId } };
        let group = { _id: "$deviceId", count: { $sum: "$fromState" } };
        let project = { _id: 0, deviceId: "$_id", count: "$count" };

        //change lifttransitions to mmumt0
        let teCursor = db.collection("events").aggregate([
            { "$match": filter },
            { "$group": group },
            { "$project": project }
        ])

        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            devArray.push(teDoc);
            macarray[teDoc.deviceId] =teDoc.deviceId;
        }

        let dayStartmilli = moment().utcOffset(5.5).startOf('day').valueOf();
        let endStartmilli = moment().utcOffset(5.5).endOf('day').valueOf();
        let currmillisec = moment().utcOffset(5.5).valueOf()
        let val = [];
        var factories = [];
      
        try {
            let teCursor = db.collection("favMachines").aggregate([{ $match: { "userId": userId } },
            { $unwind: "$factorydetails" },
            { $project: { "fact": "$factorydetails.factory", "_id": 0 } }
            ])
            while (await teCursor.hasNext()) {
                val.push(await teCursor.next());
            }
            val.forEach((ele) => { factories.push(ele.fact) });
        }
        catch (err) {
            console.log(err);
        }

        // let currshift = "Shift1";
        // let match = { "name" :{$in :factories } };
        // let xshift = db.collection("factories").aggregate([{ $match: match },
        // { $unwind: "$shift" },
        // { $project: { shift: '$shift.shiftDetails' } },
        // { $unwind: "$shift" },
        // { $sort: { "shift.Order": 1 } },
        // {$project: {
        //         "Timings": "$shift.Timings", "Name": "$shift.Name", "Order": "$shift.Order",
        //         "Start": { $cond: { if: { $gt: ["$shift.Order", "1"] }, then: { "$add": [{ "$multiply": [{ "$multiply": [{ "$multiply": ["$shift.Timings.From", 60] }, 60] }, 1000] }, 1] }, else: { "$multiply": [{ "$multiply": [{ "$multiply": ["$shift.Timings.From", 60] }, 60] }, 1000] } } },
        //         "End": { "$multiply": [{ "$multiply": [{ "$multiply": ["$shift.Timings.To", 60] }, 60] }, 1000] }}},
        // { $sort: { "Order": 1 } }])

        // xshift.forEach((ele) => {
        //     if (!shiftset) {
        //         if (ele.name === "Shift1" && todaymillisec < ele.start) {
        //             currshift = "Shift3"
        //         } else if (ele.start < todaymillisec && ele.end > todaymillisec) {
        //             currshift = ele.name;
        //         }
        //     }
        // })
        let shiftfilter = { shift: currshift.toLowerCase(), fromTs: { $gte: dayStartmilli }, toTs: { $lte: endStartmilli }  ,machine: { $in: deviceId } };
        let qualresult = await db.collection("shiftDetails").find(shiftfilter).toArray()
        let resultarray = []
        qualresult.forEach((ele) => {
            resultarray[ele.machine] = ele;
        })
        devArray.forEach((ele) => {
            let macname = macarray[ele.deviceId];
            let macvalues = resultarray[macname];
            if (macvalues) {
                let reject = macvalues.rejectCount.startup + macvalues.rejectCount.production;
                let quality = ((ele.count - reject) / ele.count) * 100;
                ele.startup = macvalues.rejectCount.startup;
                ele.production = macvalues.rejectCount.production;
                ele.value = quality;
            } else {
                ele.value = 100;
            }
        })
        return devArray;
    } catch (err) {
        console.log(err);
       }
}

module.exports = quality;