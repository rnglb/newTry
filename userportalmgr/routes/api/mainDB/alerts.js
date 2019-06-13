const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var request = require("request-promise");
var mongo = require('mongodb');
const Alerts = require('../../../../shared-modules/db-models').Alerts;

router.get('/', async function (req, res) {

    let start;
    let end;

    if (parseInt(req.query.fromDt) > parseInt(req.query.toDt)) {
        end = parseInt(req.query.fromDt) + 1;
        start = parseInt(req.query.toDt);
    } else {
        end = parseInt(req.query.toDt) + 1;
        start = parseInt(req.query.fromDt);
    }

    let deviceId = req.query.deviceId;
    let status = req.query.status;
    try {

        let db = await DB.Get();
        let devArray = [];
        let filter = { deviceId: deviceId, dateTs: { $gt: start, $lte: end }, status: status };
        console.log(filter);
        let sort = { mm: 1, hh: 1 };
        let teCursor = db.collection("machAlerts").aggregate([
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

    try {
        let o_id = new mongo.ObjectID(req.body._id);
        let db = await DB.Get();
        let filter = { '_id': o_id };
        delete req.body._id;
        let result = await db.collection("machAlerts").updateOne(filter, { $set: req.body });
        res.status(200).json({ message: 'Done' });
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
})



router.post('/createalert', async function (req, res) {
    try {


        let db = await DB.Get();
        console.log('TenantId=>'+ req.user.tenantId);
        req.body.data.tenantId = req.user.tenantId;
	req.body.data.userId = req.user.userId;
        let alertData = req.body.data;
        console.log(alertData);
        let response = await Alerts.create(alertData);
        res.json(response);
        res.status(200);
    }
    catch (err) {
        res.status(500).json(err);
    }
});

router.get('/getalert', async function (req, res) {
    try {
        let db = await DB.Get();
        // let alerts = await Alerts.find({ "tenantId": req.user.tenantId })
        let alerts = await Alerts.aggregate([{ $match: { "tenantId": req.user.tenantId } },
                                             { $lookup: {   from: "assets",
                                                            localField: "asset",
                                                            foreignField: "devices.devName",
                                                            as: "Assets" }}, 
                                             { $project: { "criteria": 1, "eventtype": 1, "notifications": 1, "asset": 1,
                                                           "assettype": 1, "tenantId": 1, "Assets.assetName": 1, "_id": 1 }}]);
        res.json({ alerts });
        res.status(200);
    }
    catch (err) {
        res.status(500).json(err);
    }


});

router.put('/updatealert/:id', async function (req, res) {
    try {


        let db = await DB.Get();
        let response = await Alerts.update({_id:req.params.id},{$set:req.body.data.muted});
        res.json(response);
        res.status(200);
    }
    catch (err) {
        res.status(500).json(err);
    }
});

router.put('/modifyalert/:id', async function (req, res) {
    try {

        let db = await DB.Get();
        let alertData = req.body.data;
        let response = await Alerts.update({_id:req.params.id},{$set:alertData});         
        res.json(response);
        res.status(200);
    }
    catch (err) {
        res.status(500).json(err);
    }
});

router.put('/updatemute', async function (req, res) {
    try {
        let db = await DB.Get();
        let data = req.body.data;
        let _id = data["id"];
        delete data["id"];
        let response = await Alerts.update({ _id:_id }, { $set: data });
        res.json(response);
        res.status(200);
    }
    catch (err) {
        res.status(500).json(err);
    }

});



module.exports = router;