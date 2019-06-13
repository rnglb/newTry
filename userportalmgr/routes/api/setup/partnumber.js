const DB = require('../../../../shared-modules/mongodb-helper/mongodb-helper')
var express = require('express');
var router = express.Router();

const Partnumber = require('../../../../shared-modules/db-models').Partnumber;

router.get('/getAll', async function (req, res) {
    try {
        let project = "partnumber partname basenumber runrate status tenantId"
        let partnumbers = await Partnumber.find({ "tenantId": req.user.tenantId }, project).sort({ _id: -1 });
        res.json(partnumbers);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }

})

router.get('/:partnumber', async function (req, res) {
    try {
        let partnumbers = await Partnumber.find({ "partnumber": req.params.partnumber, "tenantId": req.user.tenantId });
        res.json(partnumbers);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }

})


/**
 * @api {post} /createpartno Create Partnumber
 * @apiName createpartno
 * @apiGroup Asset Manager
 * @apiDescription Create a Partnumber
 * @apiParam {Object} Partnumber Object.
 */
router.post('/createpartno', async function (req, res) {
    var partnodata = req.body;
    partnodata.tenantId = req.user.tenantId;

    // construct the helper object
    try {
        if (
            !partnodata.partnumber ||
            !partnodata.basenumber ||
            !partnodata.partname ||
            !partnodata.runrate ||
            parseInt(partnodata.runrate) <= 0
        ) {
            console.log(JSON.stringify(factoryData))
            throw new Error('Either of partnumber, basenumber, partname, runrate is Invalid or missing ')
        }

        let partno = await Partnumber.create(partnodata);
        console.log(`Partnumber ${partnodata.partnumber}  created`);
        return ReS(res, { message: `Partnumber ${partnodata.partnumber}  created`, data: partno })

    } catch (err) {
        console.log('Error creating new Part number: ' + err.message);
        return ReE(res, { message: { "Error": "Error creating Part number, error:" + err.message } });
    }
});

/**
 * @api {put} /Asset Update Asset Details
 * @apiName UpdateAsset
 * @apiGroup Asset Manager
 * @apiDescription UPdate a Asset
 * @apiParam {Object} Asset Object.
 */
router.put('/updatepartno', async function (req, res) {
    console.log('Updating partno: ' + req.body.partnumber);

    // init the params from the request data
    var keyParams = {
        tenantId: req.user.tenantId,
        partnumber: req.body.partnumber
    }

    let result
     console.log(JSON.stringify(keyParams))
     console.log(req.body)

    try {
        if (
            req.body.data.runrate &&
            parseInt(req.body.data.runrate) <= 0
        ) {
            console.log(JSON.stringify(factoryData))
            throw new Error('runrate is Invalid ')
        }

        result = await Partnumber.update(keyParams, { $set: req.body.data });


        if (result.nModified === 1) {
            console.log('Partnumber ' + req.body.partnumber + ' updated');
            ReS(res, { message: 'Partnumber ' + req.body.partnumber + ' updated' })
        } else {
            console.log('Error updating Partnumber: ' + req.body.partnumber);
            ReE(res, { message: 'Error updating Partnumber: ' + req.body.partnumber })
        }

    } catch (err) {
        console.log('Error updating Partnumber: ' + err.message);
        ReE(res, { message: 'Error updating Partnumber: ' + req.body.partnumber + 'Error : ' + err.message })
    }
});

router.delete('/:partnumber', async function (req, res) {
    var keyParams = {
        tenantId: req.user.tenantId,
        partnumber: req.params.partnumber
    }
    try {
        console.log('req.params._id: ' + req.params.partnumber);
        let response = await Partnumber.remove(keyParams);
        res.json(response);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }
})

module.exports = router;