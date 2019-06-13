const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');


let availability = async function (availparam) {

    let fromTs = availparam.fromTs;
    let toTs = availparam.toTs;

    let applId = availparam.applId;
    let deviceId = availparam.deviceId;
    let devArray = [];

    try {

        let db = await DB.Get();
        let responseObj = {};
        let totPeriod = parseInt(toTs) - parseInt(fromTs)

        let filter = { ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, applId: applId, deviceId : {$in : deviceId},  toState: 1};

        console.log(filter);
        let project = {
            _id: 0, ts: 1, toState: 1, deviceId: 1,
            tsDiff: { $subtract: ["$ts", "$prevTs"] }
        };

        let group = { _id: "$deviceId", minutes: { "$sum": "$tsDiff" } };
        let project1 = { _id: 0, deviceId: "$_id", value: "$minutes" , avail: {$multiply: [{$divide:["$minutes", totPeriod]},100]}};

        let filter1 = { tsDiff: { $gt: 1000 } };

        let teCursor = db.collection("events").aggregate([
            { "$match": filter },
            { "$project": project },
            { "$group": group },
            { "$project": project1 }
        ])

        
        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            teDoc.value = Math.round(teDoc.value / 1000 / 60)
            devArray.push(teDoc);
        }

        return devArray;

    } catch (err) {
        console.log(err);
        throw err;
    }

};

module.exports = availability;