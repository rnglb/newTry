const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
const Notifications = require('../../../../shared-modules/db-models').Notifications;
var router = express.Router();


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
        let response = await Notifications.find({ "tenantId": req.user.tenantId })
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
        let response = await Notifications.update({ _id:_id }, { $set: data });
        res.json(response);
        res.status(200);
    }
    catch (err) {
        res.status(500).json(err);
    }

});

module.exports = router;
