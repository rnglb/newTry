const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');


let energy = async function (enerparam) {

    let fromTs = enerparam.fromTs;
    let toTs = enerparam.toTs;
    let deviceId = enerparam.deviceId;
    let applId = enerparam.applId;
    try {

        let db = await DB.Get();
        let devArray = [];

        /*Part count */
        let filter = { toTs: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, totEnergy: { $gte: 0 } ,deviceId : {$in : deviceId} };
        let group = { _id: "$deviceId", totEnergy: { "$sum": "$totEnergy" } };
        let project = {_id: 0, deviceId: "$_id", value: "$totEnergy"};

        let teCursor = db.collection("totenergy").aggregate([
            { "$match": filter },
            { "$group": group },
            { "$project": project }
        ])



        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            teDoc.value = Math.round(teDoc.value);
            devArray.push(teDoc);
        }

        return devArray;

    } catch (err) {
        console.log(err);
        throw err;
    }

}
module.exports = energy;