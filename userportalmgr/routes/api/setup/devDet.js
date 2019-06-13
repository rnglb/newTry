'use strict';

//  Express
const express = require('express');
const router = express.Router();

const DB = require('../../../../shared-modules/mongodb-helper/mongodb-helper.js');
const deviceDetails = require('../../../../shared-modules/db-models').deviceDetails;

router.get('/deviceStatus/:I', async function (req, res) {
    try {
       //console.log("Hi");
        let db = await DB.Get();

        let deviceBased = await db.collection('devicelkps').aggregate([
            {
                $match: { 'deviceId': req.params.I }
            },
            {
                $lookup:
                {
                    from: "devicedetails",
                    localField: "deviceId",
                    foreignField: "I",
                    as: "devicelkps_docs"
                }
            }, {
                $project: { 'devicelkps_docs': 1 }
            }, {
                $unwind: "$devicelkps_docs"
            }, {
                $sort: { "devicelkps_docs._id": -1 }
            }, {
                $limit: 1
            }
        ]).toArray();

        
        if (deviceBased.length <= 0) {
            deviceBased = await db.collection('devicelkps').aggregate([
                {
                    $match: { 'deviceId': req.params.I }
                },
                {
                    $lookup:
                    {
                        from: "devicedetails",
                        localField: "ergdid",
                        foreignField: "I",
                        as: "devicelkps_docs"
                    }
                }, {
                    $project: { 'devicelkps_docs': 1 }
                }, {
                    $unwind: "$devicelkps_docs"
                }, {
                    $sort: { "devicelkps_docs._id": -1 }
                }, {
                    $limit: 1
                }
            ]).toArray();

        }

        if(deviceBased ==0){
            res.json([])
        }else{
            res.json(deviceBased);
        }
       
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }
})

//Link deviceId and ThingId
router.post('/dev/:deviceId', async function (req, res) {
    try {
        console.log("Hi");
        let db = await DB.Get();
        var d = new Date();
        var n = d.toISOString();
        let deviceLink = await db.collection('devicelkps').insert({
            "deviceId": req.body.deviceId,
            "ergdid": req.body.ergdid,
            "token": "97TW1o1apMn9d6Rn",
            "createdAt":n
        });
        res.json(deviceLink);

    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }
})

module.exports = router;