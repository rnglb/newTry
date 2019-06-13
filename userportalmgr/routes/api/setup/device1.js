const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
const Device = require('../../../../shared-modules/db-models').Device;

router.get('/getAll', async function (req, res) {
    try {
        let db = await DB.Get();
        let assets = await Device.find();
       
        res.json(assets);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }

})

router.get('/get/:deviceId', async function (req, res) {
    try {
        let db = await DB.Get();
        let assets = await Device.find({"devId":req.params.deviceId});
        res.json(assets);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }

})

router.post('/create', async function (req, res) {
    try {
        let db = await DB.Get();
        console.log(req.body.data);
        let response = await Device.create(req.body.data);
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
        console.log(req.body.data);
        let response = await Device.update({devId:req.body.data.devId},{$set:req.body.data});
        res.json(response);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }
})

router.delete('/delete/:deviceId', async function (req, res) {
    try {
        let db = await DB.Get();
        console.log('req.params._id: '+req.params.deviceId);
        let response = await Device.remove({devId:req.params.deviceId});
        res.json(response);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }
})

module.exports = router;