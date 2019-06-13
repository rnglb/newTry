const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var request = require("request-promise");
const qualInputsUtil =  require(__base + 'routes/api/mainDB/kpi/qualInputsUtils');
// router.use('/',function (req, res){
//     console.log(req.body);
// })

router.get('/', async function (req, res) {

    let dd = parseInt(req.query.dd);
    let mm = parseInt(req.query.mm);
    let yy = parseInt(req.query.yy);
    let deviceId = req.query.deviceId;

    try {
        let devArray = await qualInputsUtil.getQualInputs(dd,mm,yy,deviceId);
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
    let data = req.body;
    console.log('In Post')
    console.log(req.body);
    try {
        await qualInputsUtil.postQualInputs(dd,mm,yy,deviceId,data);
        res.status(200);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }


})


module.exports = router;