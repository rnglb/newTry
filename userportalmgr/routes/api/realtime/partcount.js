const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');


let partcount = async function (partparam) {

    let fromTs = partparam.fromTs;
    let toTs = partparam.toTs;
    let deviceId = partparam.deviceId;
    let applId = partparam.applId;
    try {

        let db = await DB.Get();
        let devArray = [];

        /*Part count */
        let filter = {ts: {$gte: parseInt(fromTs), $lte: parseInt(toTs)}, applId: applId , deviceId : {$in : deviceId} };
        let group = { _id: "$deviceId", count: { $sum: "$fromState" } };
        let project = {_id: 0, deviceId: "$_id", value: "$count"};

        //change lifttransitions to mmumt0
        let teCursor = db.collection("events").aggregate([
            { "$match": filter },
            { "$group": group },
            { "$project": project }
        ])


        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            devArray.push(teDoc);
        }

        return devArray;

    } catch (err) {
        console.log(err);
        throw err;
    }

}
module.exports = partcount;