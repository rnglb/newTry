const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var devices = require(__base + 'config/device');

router.get('/', async function (req, res) {

    var filter = {};

    var project = { _id: 0, token: 0, fromTs: 0, currTotEnergy: 0, prevTotEnergy: 0 };
    var sort = { $natural: -1 }

    var fromTs = req.query.fromTs || new Date().getTime() - 3600000; // Default 24 Hours ago
    var toTs = req.query.toTs || new Date().getTime();

    if (req.query.deviceId) {
        filter.deviceId = req.query.deviceId;
    }

    let db = await DB.Get();

    if (req.query.since) {
        filter.toTs = { $gte: parseInt(req.query.since), $lte: parseInt(toTs) };
    } else {
        filter.toTs = { $gte: parseInt(fromTs), $lte: parseInt(toTs) };
    }


    console.log(filter);

    db.collection('totenergy')
        .find(filter)
        .project(project)
        .sort(sort)
        .limit(300)
        .toArray(function (err, docs) {
            docs.map(function (doc) {
                doc.devDesc = devices[doc.deviceId] || 'Unknown Device'
                doc.totEnergy = Number((doc.totEnergy).toFixed(2))
            })
            res.json(docs);
        });

});



module.exports = router;