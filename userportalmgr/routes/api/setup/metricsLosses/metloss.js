const DB = require('../../../../../shared-modules/mongodb-helper/mongodb-helper')
var express = require('express');
var router = express.Router();
const Tenants = require('../../../../../shared-modules/db-models').Tenant;
var downtimereason = require('../../../../../shared-modules/db-models').DownTimeReasons;

router.get('/getAll', async function (req, res) {
    try {

        let db = await DB.Get();
        let metrics = await Tenants.find({});
        res.json(metrics);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }

})

router.get('/getprevmaint/:tenantId', async function (req, res) {
    try {
        let db = await DB.Get();
        let metrics = await Tenants.find({ "tenantId": req.params.tenantId }).select({ "preventiveMaintenance": 1, "_id": 0 });
        res.json(metrics);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }

})
router.get('/getsmallstops/:tenantId', async function (req, res) {
    try {
        let db = await DB.Get();
        let metrics = await Tenants.find({ "tenantId": req.params.tenantId }).select({ "smallStops": 1, "_id": 0 });
        res.json(metrics);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }

})

router.put('/updateprevmaint', async function (req, res) {
    try {
        let db = await DB.Get();
console.log(JSON.stringify(req.body.data))
        let response = await Tenants.update({ tenantId: req.body.data.tenantId }, { $set: { 'preventiveMaintenance': req.body.data.preventiveMaintenance } });
        res.json(response);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }
})

router.put('/updatesmallstops', async function (req, res) {
    try {
        let db = await DB.Get();
        let response = await Tenants.update({ tenantId: req.body.data.tenantId }, { $set: { "smallStops": req.body.data.smallStops } });
        res.json(response);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }
})

router.get('/getdnwtimereason/:tenantId', async function (req, res) {
    try {
        let db = await DB.Get();
         let reasons = await downtimereason.find({$or: [{isCommon: 1}, {"tenantId":  req.params.tenantId}]});
        if (reasons[0] == null || reasons.length == 0) {
            let val = [{ "tenantId": req.params.tenantId, "downTimeReasons": "Setup Time", "isPrimary": 1, "isSecondaryReasonsNeeded": 0, "secondaryReasons": [] },
            { "tenantId": req.params.tenantId, "downTimeReasons": "Tooling Issue", "isPrimary": 1, "isSecondaryReasonsNeeded": 1, "secondaryReasons": [] },
            { "tenantId": req.params.tenantId, "downTimeReasons": "Machine Issue", "isPrimary": 1, "isSecondaryReasonsNeeded": 1, "secondaryReasons": [] },
            { "tenantId": req.params.tenantId, "downTimeReasons": "Operator not available", "isPrimary": 1, "isSecondaryReasonsNeeded": 0, "secondaryReasons": [] },
            { "tenantId": req.params.tenantId, "downTimeReasons": "Material not available", "isPrimary": 1, "isSecondaryReasonsNeeded": 0, "secondaryReasons": [] },
            { "tenantId": req.params.tenantId, "downTimeReasons": "Other reasons", "isPrimary": 1, "isSecondaryReasonsNeeded": 0, "secondaryReasons": [] }];
            for (var i = 0, len = val.length; i < len; i++) {
                await downtimereason.create(val[i]);
            }
            reasons = await downtimereason.find({$or: [{isCommon: 1}, {"tenantId":  req.params.tenantId}]});
        }
        res.json(reasons);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }

})
router.post('/insertdnwtimereason', async function (req, res) {
    try {
        let db = await DB.Get();
        let response = await downtimereason.create(req.body.data);
        res.json(response);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }
})

router.put('/updatednwtimereason', async function (req, res) {
    try {
        let db = await DB.Get();
        let response = await downtimereason.update({ "tenantId": req.body.data.tenantId, "downTimeReasons": req.body.data.olddownTimeReasons}, { $set: { "downTimeReasons": req.body.data.newdownTimeReasons}});
        res.json(response);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }
})

router.delete('/deletenwtimereason', async function (req, res) {
    try {
        let db = await DB.Get();
        let response = await downtimereason.remove({ "_id": req.body.data._id});
        res.json(response);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }
})

router.get('/getsecondaryreason/:tenantId/:downTimeReason', async function (req, res) {
    let db = await DB.Get();
    let response = await downtimereason.find({ '$and': [{"tenantId": req.params.tenantId, "downTimeReasons": req.params.downTimeReason, "isSecondaryReasonsNeeded": 1 }]});
    res.json(response);
})

router.put('/updatesecondaryreason', async function (req, res) {
    let db = await DB.Get();
    let response = await downtimereason.update({ '$and': [{ "tenantId": req.body.data.tenantId, "downTimeReasons": req.body.data.downTimeReason, "isSecondaryReasonsNeeded": 1 } ]}, { $set: { "secondaryReasons": req.body.data.secondaryReasons } })
    res.json(response);

})
module.exports = router;