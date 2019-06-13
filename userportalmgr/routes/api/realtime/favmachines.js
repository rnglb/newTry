
const DB = require('../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();

// api for insert  user fav information 
// eg : user 1, [MAC1, MAC2,MAC3]
router.post('/insert', async function insert(req, res) {
    try {
        let db = await DB.Get();
        console.log(req.user.email);
        let userId = req.user.email; // should not be null
        let machines = req.body.machines;// expected to be a string array
        let data = { userId: userId, machines: machines }
        db.collection("favMachines").insertOne(data, function (err, result) {
            if (err) throw err;
            console.log(result)
            res.json({ status: "Success", result: result });
            res.status(200);
        });
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ err: err })
    };
});

// api to modify  user fav information 
// eg : user 1, [MAC1, MAC2,MAC3]
router.put('/update', async function update(req, res) {
    try {
        let db = await DB.Get();
        //       let userId = req.body.userId;
        let userId = req.user.email;
        let machines = req.body.machines;// expected to be a string array
        db.collection("favMachines").updateOne(
            { "userId": userId },
            { "$set": { "machines": machines, "userId": userId } },
            { upsert: true }, function (err, result) {
                if (err) { throw err };
                console.log(result)
                res.status(200).json({ status: "Success", result: result });
            });
    }
    catch (err) {
        console.log(err)
    }
    res.status(500).json({ err: err });
});

// api to retrieve user fav machine info
router.get('/', async function get(req, res) {
    try {
        let usrid = req.query.userId;
        if (req.query.userId == null) {
            usrid = req.user.email
        }
        console.log(usrid)
        let db = await DB.Get();
        let query = { userId: { $eq: usrid } };
        db.collection("favMachines").find(query).toArray(function (err, result) {
            if (err) {
                throw err;
            }
            res.json({ status: "Success", result: result[0] });
            res.status(200);
        });
    }

    catch (err) {
        console.log(err);
        res.status(500).json({ err: err })
    }
});
module.exports = router;
