const DB = require('../../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
const Shift = require('../../../../../shared-modules/db-models').Shift;

router.get('/getAll', async function (req, res) {
    try {
        let db = await DB.Get();
        downTimeCursor = await Shift.find({tenantId: req.user.tenantId});
       
        res.json(downTimeCursor);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }

})

router.post('/create', async function (req, res) {
    try {
        let db = await DB.Get();
        console.log(req.body);
        let shiftData=req.body.data;
        req.body.data.tenantId = req.user.tenantId;
        shiftData['shiftId']=shiftData.type+"_"+shiftData.mode;
        let response = await Shift.create(req.body.data);
        res.json(response);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }
})

router.put('/update', async function (req, res) {
    try {
        let db = await DB.Get();
        console.log(req.body);
        let shiftData=req.body;
        let response = await Shift.update({tenantId:  req.user.tenantId, shiftId:shiftData.shiftId},{$set:shiftData});
        res.json(response);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }
})

router.delete('/delete/:shiftId', async function (req, res) {
    try {
        let db = await DB.Get();
        console.log('req.params._id: '+req.params.shiftId);
        let response = await Shift.remove({tenantId:  req.user.tenantId, shiftId:req.params.shiftId});
        res.json(response);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }
})

module.exports = router;