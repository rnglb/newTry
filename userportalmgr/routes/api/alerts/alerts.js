const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var device = require(__base + 'config/device');

/**
 * This function comment is parsed by doctrine
 * @route GET /
 * @group foo - Operations about alerts
 * @param {string} start.query.required - username or email - eg: user@domain
 * @param {string} end.query.required - user's password.
 * @param {string} type.query.required - user's password.
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 */

router.get('/', async function (req, res) {

    let start = req.query.start;
    let end = req.query.end;
    let type = req.query.type;
    // let days = req.query.days;

    try {

        let db = await DB.Get();
        let responseObj = [];

        let filter = { "alertType": type, "ts": { $gte: parseInt(start), $lte: parseInt(end) } };
        let sort = { ts: -1 };

        console.log(filter);

        let teCursor = db.collection("alerts").aggregate([
            { "$match": filter },
            { "$sort": sort }
        ]);

        const average = arr => arr.reduce((p, c) => p + c, 0) / arr.length;

        for (let teDoc = await teCursor.next(); teDoc != null; teDoc = await teCursor.next()) {
            if (type === 'Temp') {
                let avgBreach = average(teDoc.temps);
                if (avgBreach > teDoc.temp_bse * 1.5) {
                    teDoc.severity = 'high';
                } else if (avgBreach > teDoc.temp_bse * 1.2) {
                    teDoc.severity = 'medium';
                } else {
                    teDoc.severity = 'low';
                }
                responseObj.push(teDoc);
            }

            if (type === 'Energy') {
                teDoc.toTs = teDoc.ts + 86400000;
                if (teDoc.energy_bse > 0.5 && teDoc.name.substr(0, 7) !== 'Unknown') {
                    responseObj.push(teDoc);
                }
            }

            if (type === 'Others') {
                //teDoc.ts = start;
                responseObj.push(teDoc);
            }


        }

        res.json(responseObj);

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }

})

module.exports = router;