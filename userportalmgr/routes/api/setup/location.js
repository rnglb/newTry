const DB = require('../../../../shared-modules/mongodb-helper/mongodb-helper')
var express = require('express');
var router = express.Router();

const Location = require('../../../../shared-modules/db-models').Location;

router.get('/getAll', async function (req, res) {
    try {
      //  let project = "partnumber partname basenumber runrate status tenantId"
        let locations = await Location.find({ "tenantId": req.user.tenantId }).sort({ _id: -1 });
        res.json(locations);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }

})

router.get('/:location', async function (req, res) {
    try {
        let locations = await Location.findOne({ "locname": req.params.location, "tenantId": req.user.tenantId },{_id:0,locname:1});
        res.json(locations);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }

})


/**
 * @api {post} /createlocation Create Location
 * @apiName createlocation
 * @apiGroup Asset Manager
 * @apiDescription Create a Location
 * @apiParam {Object} Location Object.
 */
router.post('/createloc', async function (req, res) {
    var locdata = req.body;
    locdata.tenantId = req.user.tenantId;

    // construct the helper object
    try {
        let location = await Location.create(locdata);
        console.log(`Location ${locdata.locname}  created`);
        return ReS(res, { message: `Location ${locdata.locname}  created`, data: location })

    } catch (err) {
        console.log('Error creating new Part number: ' + err.message);
        return ReE(res, { message: { "Error": "Error creating Location, error:" + err.message } });
    }
});


/**
 * @api {put} /Asset Update Asset Details
 * @apiName UpdateAsset
 * @apiGroup Asset Manager
 * @apiDescription UPdate a Asset
 * @apiParam {Object} Asset Object.
 */
router.put('/updateloc', async function (req, res) {
    console.log('Updating Location: ' + req.body.locname);

    // init the params from the request data
    var keyParams = {
        tenantId: req.user.tenantId,
        locname: req.body.locname
    }

    let result
     console.log(JSON.stringify(keyParams))
     console.log(req.body)

    try {

        result = await Location.update(keyParams, { $set: req.body.data });


        if (result.nModified === 1) {
            console.log('Location ' + req.body.locname + ' updated');
            ReS(res, { message: 'Location ' + req.body.locname + ' updated' })
        } else {
            console.log('Error updating Location: ' + req.body.locname);
            ReE(res, { message: 'Error updating Location: ' + req.body.locname })
        }

    } catch (err) {
        console.log('Error updating Location: ' + err.message);
        ReE(res, { message: 'Error updating Location: ' + req.body.locname + 'Error : ' + err.message })
    }
});

router.delete('/:location', async function (req, res) {
    var keyParams = {
        tenantId: req.user.tenantId,
        locname: req.params.location
    }
    try {
        console.log('req.params._id: ' + req.params.location);
        let response = await Location.remove(keyParams);
        res.json(response);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }
})

module.exports = router;