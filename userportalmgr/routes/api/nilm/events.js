const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var devices = require(__base + 'config/device');
var appls = require(__base + 'config/appliance');

router.get('/', async function (req, res) {

    var filter = {};
    let db = await DB.Get();
    var project = { _id: 0, token: 0, fromTs: 0 };
    var sort = { ts: -1, frameCount: -1 }

    var fromTs = req.query.fromTs || new Date().getTime() - 86400000; // Default 24 Hours ago
    var toTs = req.query.toTs || new Date().getTime();


    if (req.query.deviceId) {
        filter.deviceId = req.query.deviceId;
    }

    if (req.query.applId) {
        filter.applId = req.query.applId;
    }

    if (req.query.since) {
        filter.ts = { $gte: parseInt(req.query.since), $lte: parseInt(toTs) };
    } else {
        filter.ts = { $gte: parseInt(fromTs), $lte: parseInt(toTs) };
    }


    console.log(filter);


    var cursor = db.collection('events')
        .aggregate(
            [
                { $match: filter },
                {
                    $project: {
                        // dup: {$ne: ["$toState", "$prevToState"]},
                        toState: 1,
                        prevToState: 1,
                        deviceId: 1,
                        applId: 1,
                        fromState: 1,
                        ts: 1,
                        frameCount: 1
                    }
                },
                // {$match: {dup: true}},
                {
                    $project: {
                        _id: 0,
                        toState: 1,
                        deviceId: 1,
                        applId: 1,
                        fromState: 1,
                        ts: 1,
                        frameCount: 1
                    }
                },
                { $sort: sort },
                { $limit: 300 }
            ])

    cursor.toArray(function (err, docs) {
        docs.map(function (doc) {
            doc.devDesc = devices[doc.deviceId] || 'Unknown Device'
            doc.appDesc = appls[doc.applId] || 'Unknown Appliance'
        })
        // console.log(docs);
        res.json(docs);
    });






    // .find(filter)
    // .project(project)
    // .sort(sort)
    // .limit(300)
    // .toArray(function (err, docs) {
    //     docs.map(function (doc) {
    //         doc.devDesc = devices[doc.deviceId] || 'Unknown Device'
    //         doc.appDesc = appls[doc.applId] || 'Unknown Appliance'
    //     })
    //     res.json(docs);
    // });
    // })

})


router.get('/oee', async function (req, res) {

    var filter = {};
    let db = await DB.Get();
    var project = { _id: 0, token: 0, fromTs: 0 };
    var sort = { ts: -1, frameCount: -1 }

    var fromTs = req.query.fromTs || new Date().getTime() - 86400000; // Default 24 Hours ago
    var toTs = req.query.toTs || new Date().getTime();


    if (req.query.deviceId) {
        filter.deviceId = req.query.deviceId;
    }

    if (req.query.applId) {
        filter.applId = req.query.applId;
    }

    if (req.query.since) {
        filter.ts = { $gte: parseInt(req.query.since), $lte: parseInt(toTs) };
    } else {
        filter.ts = { $gte: parseInt(fromTs), $lte: parseInt(toTs) };
    }


    console.log(filter);

    var cursor = db.collection('events')
        .aggregate(
            [
                { $match: filter },
                {
                    $project: {
                        _id: 0,
                        toState: 1,
                        deviceId: 1,
                        applId: 1,
                        fromState: 1,
                        ts: 1,
                        frameCount: 1
                    }
                },
                { $sort: sort },
                { $limit: 300 }
            ])

    cursor.toArray(function (err, docs) {
        docs.map(function (doc) {
            doc.devDesc = devices[doc.deviceId] || 'Unknown Device'
            doc.appDesc = appls[doc.applId] || 'Unknown Appliance'
        })
        // console.log(docs);
        res.json(docs);
    });






    // .find(filter)
    // .project(project)
    // .sort(sort)
    // .limit(300)
    // .toArray(function (err, docs) {
    //     docs.map(function (doc) {
    //         doc.devDesc = devices[doc.deviceId] || 'Unknown Device'
    //         doc.appDesc = appls[doc.applId] || 'Unknown Appliance'
    //     })
    //     res.json(docs);
    // });
    // })

})

module.exports = router;