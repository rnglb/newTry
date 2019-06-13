
var express = require('express');
var router = express.Router();
const AssetGroup = require('../../../../shared-modules/db-models').Assetgroup;

router.get('/getAll', async function (req, res) {
    try {
        let groups = await AssetGroup.find({ "tenantId": req.user.tenantId }).sort({ _id: -1 });
        res.json(groups);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }

})

/**
 * @api {post} /Asset Create Asset Group
 * @apiName createAssetGroup
 * @apiGroup Asset Manager
 * @apiDescription Create a Asset Group
 * @apiParam {Object} Asset Object.
 */
router.post('/creategroup', async function (req, res) {
    var asset = req.body;
    asset.tenantId = req.user.tenantId;
 
    // construct the helper object
    try {
console.log(asset)
        let result = await AssetGroup.create(asset);
        return ReS(res, { message: `Asset Group ${asset.groupName}  created`, data: result })

    } catch (err) {
        return ReE(res, { message: { "Error": "Error creating Asset Group, error:" + err.message } });
    }
});


module.exports = router;