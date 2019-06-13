const autoReport = require('../../../../../shared-modules/db-models').AutomatedReport;
const DB= require('../../../../../shared-modules/mongodb-helper');
var express = require('express');
var router = express.Router();


router.post('/create', async function (req, res) {
    try {
        let db = await DB.Get();
        req.body.data.tenantId = req.user.tenantId
        req.body.data.userId = req.user.userId        
        let dataobj = req.body.data;
        await autoReport.findOneAndUpdate({ tenantId: req.user.tenantId, userId : req.user.userId }, dataobj, { upsert: true , new: true }, function (err, doc) {
            if (err) {
                throw err;
            }
            res.json(doc);
            res.status(200);

        });

       
    }
    catch (err) {
        res.status(500).json(err);
    }
});

router.get('/get', async function (req, res) {
    try {
        let db = await DB.Get();
        let response = await autoReport.find({ tenantId: req.user.tenantId, userId : req.user.userId })
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
        let data = req.body.data;
        let _id=data ["id"];
        delete data["id"];
        let response = await autoReport.update({_id:_id, tenantId: req.user.tenantId},{$set:data});                            
        res.json(response);
        res.status(200);
    }
    catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;