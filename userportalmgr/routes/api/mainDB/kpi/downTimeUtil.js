const DB = require('../../../../../shared-modules/mongodb-helper');

function DowntimeUtil() {

    async function getDownTimeImpl() {
        let downTimeArray = [];
        let db = await DB.Get();

        console.log('TenantId=>' + req.user.tenantId);
        let tenantData = await db.collection("tenants").findOne({ tenantId: req.user.tenantId });
        console.log(tenantData.smallStops + tenantData.preventiveMaintenance);
        let smallstops = tenantData.smallStops;
        if (smallstops == null) {
            smallstops = 0;
        }
        console.log(smallstops);
        let filter;
        if (tenantData.preventiveMaintenance == "plannedDowntime") {
            console.log("preventiveMaintenance - planneddowntime");
            filter = { 'reason.type': { $exists: true, $nin: ["lunchBreak", "preventiveMaintenance", "plannedShutdown"] } };
            console.log(JSON.stringify(filter))
        }
        else {
            filter = { 'reason.type': { $exists: true, $nin: ["lunchBreak", "plannedShutdown"] } };
            console.log(JSON.stringify(filter))
        }

        let downTimeCursor = db.collection("macDownTime").aggregate([
            {
                $match: filter
            }
            , {
                $project: { "reason": "$reason.type", deviceId: 1, timeData: { $subtract: ["$endTs", "$startTs"] } }
            },
            {
                $group: { _id: { "deviceId": '$deviceId', "reason": "$reason" }, timeData: { $sum: "$timeData" } }
            }, {
                $sort: { timeData: 1 }
            }
            , {
                $group: {
                    _id: "$_id.deviceId",
                    dataSet: { $addToSet: { reason: "$_id.reason", timeInMinutes: { $divide: ["$timeData", 60000] } } }

                }
            }
        ])

        for (let teDoc = await downTimeCursor.next(); teDoc != null; teDoc = await downTimeCursor.next()) {
            downTimeArray.push(teDoc);
        }

        console.log(downTimeArray)
        return downTimeArray;
    }

    return {
        getDownTime: getDownTimeImpl
    }

}
module.exports = DowntimeUtil();