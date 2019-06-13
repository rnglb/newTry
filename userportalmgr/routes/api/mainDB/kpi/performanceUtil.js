const DB = require('../../../../../shared-modules/mongodb-helper');

function PerformaceUtil() {

    async function getPerformanceImpl(fromTs, toTs, attr, deviceId, applId, isHourly, devTz) {
        let db = await DB.Get();
        let devArray = [];

        let filter = { ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId };

        // if (applId === 'all') {
        //     filter.applId = { "$in": ["020100000101", "020100000102", "020100000103"] };
        // } else {
        //     filter.applId = applId;
        // }

        let project = {
            _id: 0, ts: 1, toState: 1, fromState: 1, applId: 1, partNumbe:1, runRate:1,
            tsDiff: { $subtract: ["$ts", "$prevTs"] }
        };

        let sort = { date: 1 };
        let group = {
            "_id": {
                partNumber:"$partNumber",
                runRate:"$runRate",
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
            }, minutes: {
                "$sum": {
                    $cond: {
                        if: {
                            $and: [{ $eq: ["$applId", "020100000101"] }, { $eq: ["$toState", 1] }]
                        },
                        then: "$tsDiff",
                        else: 0
                    }
                }
            }, count: {
                "$sum": {
                    $cond: {
                        if: {
                            $eq: ["$applId", "020100000104"]
                        },
                        then: "$fromState",
                        else: 0
                    }
                }
            }
        };
        if (!isHourly) {
            group["_id"]["hh"] = "00"
        }
        let project1 = {
            _id: 0,
            partNumber:"$_id.partNumber",
            runRate:"$_id.runRate",
            date: {
                $dateFromString: {
                    dateString: { $concat: ["$_id.dd", "-", "$_id.mm", "-", "$_id.yy", "T", "$_id.hh", ":00:00.000"] },
                    timezone: devTz
                }
            }, minutes: 1, count: 1
        };

        // let project2 = {
        //     _id: 0, date: 1, minutes: 1, count: 1, perf: 1
        // };
        
        let teCursor = db.collection("events").aggregate([
            { "$match": filter },
            { "$project": project },
            { "$group": group },
            { "$project": project1 },
            { "$sort": sort }
        ]);


        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            teDoc.minutes = Math.round(teDoc.minutes / 1000 / 60)
            devArray.push(teDoc);
        }



        let dwntimefilter = {
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

        let dwntimeproject = {
            _id: 0, startTs: 1, endTs: 1, deviceId: 1,
            tsDiff: { $subtract: ["$endTs", "$startTs"] }
        };

        let dwntimesort = { date: 1 };
        let dwntimegroup = {
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
            idlemin: {
                "$sum": {
                    $cond: {
                        if: {
                            $lte: ["$tsDiff", 180000]
                        },
                        then: "$tsDiff",
                        else: 0
                    }
                }
            }
        };
        if (!isHourly) {
            group["_id"]["hh"] = "00"
        }
        let dwntimeproject1 = {
            _id: 0,
            date: {
                $dateFromString: {
                    dateString: { $concat: ["$_id.dd", "-", "$_id.mm", "-", "$_id.yy", "T", "$_id.hh", ":00:00.000"] },
                    timezone: devTz
                }
            }
            , idlemin: 1
        };

        let planteCursor = db.collection("macDownTime").aggregate([
            { "$match": dwntimefilter },
            { "$project": dwntimeproject },
            { "$group": dwntimegroup },
            { "$project": dwntimeproject1 },
            { "$sort": dwntimesort }
        ]);


        let resultArray = [];

        for (let teDoc = await planteCursor.next(); teDoc != null; teDoc = await planteCursor.next()) {
            if (teDoc.idlemin > 0)
                teDoc.idlemin = Math.round(teDoc.idlemin / 1000 / 60)
            resultArray[teDoc.date.toISOString()] = { "idlemin": teDoc.idlemin };
        }

        devArray.forEach((ele) => {
            if (resultArray[ele.date.toISOString()]) {
                ele.minutes = ele.minutes + resultArray[ele.date.toISOString()].idlemin;
            }
            
            if (ele.minutes > 0)
                ele.perf = ele.count / (ele.minutes / 60)
            
            //ele.perf = (60/ele.runRate) * (ele.count/(60)) * 100;
            ele.perf=ele.count;
            ele.irr = ele.runRate;
        })

        return devArray;
    }

    async function getTotalPerformanceImpl(fromTs,toTs,attr,deviceId,applId,tenantId) {
        let db = await DB.Get();
        let devArray = [];

        let filter = { ts: { $gte: parseInt(fromTs), $lte: parseInt(toTs) }, deviceId: deviceId };

        let project = {
            _id: 0, ts: 1, toState: 1, fromState: 1, applId: 1, deviceId: 1,
            tsDiff: { $subtract: ["$ts", "$prevTs"] }
        };

        let sort = { date: 1 };
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
            _id: 0,
            minutes: 1, count: 1
        };


        let teCursor = db.collection("events").aggregate([
            { "$match": filter },
            { "$project": project },
            { "$group": group },
            { "$project": project1 }
        ])


        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            teDoc.minutes = Math.round(teDoc.minutes / 1000 / 60)
            teDoc.perf = 0;
            devArray.push(teDoc);
        }

        console.log(JSON.stringify(devArray))

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
        console.log('TenantId=>' + tenantId);
        let tenantData = await db.collection("tenants").findOne({ tenantId: tenantId });
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
                                $in: ["$reasontype", ["lunchBreak", "preventiveMaintenance", "plannedShutdown"]]
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
                                $in: ["$reasontype", ["lunchBreak", "plannedShutdown"]]
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
            devArray[0].perf = devArray[0].count/ (devArray[0].minutes / 60)
        }

        if (devArray.length < 1) {
            devArray.push({ minutes: 0, count: 0, perf: 0 })
        }

        // let shiftColl;

        let shiftColl = await db.collection("shiftDetails").find({
            deviceId: deviceId, $and: [
                { fromTs: { $gte: parseInt(fromTs) } },
                { toTs: { $lte: parseInt(toTs) } }
            ]
        }).toArray();

        let arr = 0;
        if (shiftColl) {
            shiftColl.forEach((ele) => {
                if (ele.runrate) {
                    arr = arr + ele.runrate;
                }
            });
        }

        let resultdoc = devArray[0]

        if (arr > 0) {
            arr = (arr / shiftColl.length);
            resultdoc['percent'] = (resultdoc.perf / arr) * 100
        } else {
            resultdoc['percent'] = 100
        }
        resultdoc['irr'] = arr

        devArray[0] = resultdoc;

        return devArray;
    }

    return {
        getPerformance: getPerformanceImpl,
        getTotalPerformance: getTotalPerformanceImpl
    }
}

module.exports = PerformaceUtil();