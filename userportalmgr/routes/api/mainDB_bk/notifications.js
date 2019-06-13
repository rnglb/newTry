const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
const Notifications = require('../../../../shared-modules/db-models').Notifications;
const Alerts = require('../../../../shared-modules/db-models').Alerts;
var router = express.Router();
var ObjectID = require('mongodb').ObjectID;

router.post('/createnotification', async function (req, res) {
    try {
        let db = await DB.Get();
        req.body.data.tenantId = req.user.tenantId
        let notdata = req.body.data;
        let response = await Notifications.create(notdata);
        res.json(response);
        res.status(200);
    }
    catch (err) {
        res.status(500).json(err);
    }
});

router.get('/getnotification', async function (req, res) {
    try {
        let db = await DB.Get();
        let response = await Notifications.find({ "tenantId": req.user.tenantId,"userId": req.user.userId }).sort({_id:-1});
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
        let _id = ObjectID(data.id);
        let response = await Alerts.updateOne({ '_id':_id }, { $set: {'muted' : parseInt(data.muted)  } });
        res.json(response);
        res.status(200);
    }
    catch (err) {
        res.status(500).json(err);
    }

});

module.exports = router;
