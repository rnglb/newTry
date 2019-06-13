const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');


let performance = async function (perfparam) {

    let fromTs = perfparam.fromTs;
    let toTs = perfparam.toTs;
    let remTs = perfparam.remTs;
    let deviceId = perfparam.deviceId;
    try {

        let db = await DB.Get();
        let devArray = [];

        /*Part count */
        let filter = { ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId : {$in : deviceId}};
        let project = {
            _id: 0, ts: 1, toState: 1, fromState: 1, applId: 1, deviceId: 1,
            tsDiff: { $subtract: ["$ts", "$prevTs"] }
        };
        let group = {
            "_id": "$deviceId"
            , minutes: {
                "$sum": {
                    $cond: { if: { $and: [{ $eq: ["$applId", "020100000101"] }, { $eq: ["$toState", 1] }] }, then: "$tsDiff", else: 0 }
                }
            }, count: {
                "$sum": {
                    $cond: { if: { $eq: ["$applId", "020100000104"] }, then: "$fromState", else: 0 }
                }
            }
        };

        let project1 = {
            _id: 0,deviceId: "$_id",
            minutes: 1, count: 1, perf: {
                $cond: {
                    if: {
                        $ne: ["$minutes", 0]
                    },
                    then: { $divide: ["$count", { $divide: [{ $divide: [{ $divide: ["$minutes", 1000] }, 60] }, 60] }] },
                    else: 0
                }
            }
        };

        let teCursor = db.collection("events").aggregate([
            { "$match": filter },
            { "$project": project },
            { "$group": group },
            { "$project": project1 }
        ])

        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            teDoc.minutes = Math.round(teDoc.minutes / 1000 / 60)

            let runrate = teDoc.count==0 && teDoc.minutes==0? 0: (teDoc.count/teDoc.minutes);
            console.log(runrate)
            console.log(remTs)
            let projcount = runrate * (remTs/1000/60);
            teDoc.value = { projcount: projcount + teDoc.count , perf: teDoc.perf }
            devArray.push(teDoc);
        }

        return devArray;

    } catch (err) {
        console.log(err);
        throw err;
    }

}
module.exports = performance;