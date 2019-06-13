const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var request = require("request-promise");

// router.use('/',function (req, res){
//     console.log(req.body);
// })

router.get('/', async function (req, res) {

    let dd = parseInt(req.query.dd);
    let mm = parseInt(req.query.mm);
    let yy = parseInt(req.query.yy);
    let deviceId = req.query.deviceId;

    try {

        let db = await DB.Get();
        let responseObj = {};
        let devArray = [];

        let filter = { deviceId: deviceId, dd: dd, mm: mm, yy: yy };
        console.log(filter);
        let sort = { hh: 1 };

        let teCursor = db.collection("qualInput").aggregate([
            { "$match": filter },
            { "$sort": sort }
        ]);

        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            devArray.push(teDoc);
        }

        res.json(devArray);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})


router.post('/', async function (req, res) {
    let dd = parseInt(req.query.dd);
    let mm = parseInt(req.query.mm);
    let yy = parseInt(req.query.yy);
    let deviceId = req.query.deviceId;
    console.log('In Post')
    console.log(req.body);
    try {

        let db = await DB.Get();
        let responseObj = {};
        let filter = { deviceId: deviceId, dd: dd, mm: mm, yy: yy };

        await db.collection("qualInput").deleteMany(filter);

        await db.collection("qualInput").insertMany(req.body);

        res.status(200);


    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }


})


module.exports = router;