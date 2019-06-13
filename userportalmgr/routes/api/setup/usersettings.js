const Usersettings = require('../../../../shared-modules/db-models').Usersettings;
const DB= require('../../../../shared-modules/mongodb-helper');
var express = require('express');
const validator = require('validator');
var router = express.Router();

router.post('/create', async function (req, res) {
    try {
        let db = await DB.Get();
        req.body.data.tenantId = req.user.tenantId
        let alertData = req.body.data;
        let response = await Usersettings.create(alertData);
        res.json(response);
        res.status(200);
    }
    catch (err) {
        res.status(500).json(err);
    }
});

router.get('/get', async function (req, res) {
    try {
        let db = await DB.Get();
        let response = await Usersettings.find({ tenantId: req.user.tenantId })
        res.json(response);
        res.status(200);
    }
    catch (err) {
        res.status(500).json(err);
    }
});

router.put('/modify', async function (req, res) {
    try {
        let db = await DB.Get();
        let response = await Usersettings.update({_id:req.body.data._id},{$set:req.body.data});                            
        res.json(response);
        res.status(200);
    }
    catch (err) {
        res.status(500).json(err);
    }
});


module.exports = router;
