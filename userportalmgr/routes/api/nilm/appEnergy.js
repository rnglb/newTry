const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var devices = require(__base + 'config/device');
var appls = require(__base + 'config/appliance');

router.get('/', async function (req, res) {

    var filter = {};
    let db = await DB.Get();
    var project = { _id: 0, token: 0, fromTs: 0, currAppEnergy: 0, prevAppEnergy: 0 };
    var sort = { toTs: -1 }

    var fromTs = req.query.fromTs || new Date().getTime() - 86400000; // Default 24 Hours ago
    var toTs = req.query.toTs || new Date().getTime();

    if (req.query.deviceId) {
        filter.deviceId = req.query.deviceId;
    }

    if (req.query.applId) {
        filter.applId = req.query.applId;
    }


    if (req.query.since) {
        filter.toTs = { $gte: parseInt(req.query.since), $lte: parseInt(toTs) };
    } else {
        filter.toTs = { $gte: parseInt(fromTs), $lte: parseInt(toTs) };
    }

    console.log(filter);

    db.collection('appenergy')
        .find(filter)
        .project(project)
        .sort(sort)
        .limit(300)
        .toArray(function (err, docs) {
            docs.map(function (doc) {
                doc.devDesc = devices[doc.deviceId] || 'Unknown Device'
                doc.appDesc = appls[doc.applId] || 'Unknown Appliance'
                doc.appEnergy = Number((doc.appEnergy).toFixed(3))
            })
            res.json(docs);
        });


});



module.exports = router;