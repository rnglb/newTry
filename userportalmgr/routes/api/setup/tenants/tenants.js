const DB = require('../../../../../shared-modules/mongodb-helper');
var express = require('express');
var router = express.Router();
const Tenants = require('../../../../../shared-modules/db-models').Tenants;


router.get('/get', async function (req, res) {
    try {
        let db = await DB.Get();
        let tenants = await Tenants.find({ "tenantId": req.query.tenantId });
        res.json(tenants);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }
})

module.exports = router;
