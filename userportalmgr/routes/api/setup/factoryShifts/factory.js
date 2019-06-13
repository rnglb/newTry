const DB = require('../../../../../shared-modules/mongodb-helper')
var express = require('express');
var router = express.Router();
var ObjectID = require('mongodb').ObjectID;
var moment = require('moment');

const Factory = require('../../../../../shared-modules/db-models').Factory;
const Asset = require('../../../../../shared-modules/db-models').Asset;
const globalFuncs = require('../../../../../shared-modules/global-funcs-helper/global_functions.js'); //instantiate global functions

router.get('/getAll', async function (req, res) {
    try {
        let db = await DB.Get();
        let filter = {}
        if (req.user.tenantId !== 'system') {
            filter.tenantId = req.user.tenantId
        }

        let factories = await Factory.find(filter);

        res.json(factories);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }

})

router.get('/getShiftTime', async function (req, res) {
    try {
        let factoryId = req.query.factoryId;
        let day = parseInt(req.query.day);
        if (
            !factoryId ||
            !day
        ) {
            throw new Error('Invalid param')
        }

        let db = await DB.Get();
        let filter = { name: factoryId }
        if (req.user.tenantId !== 'system') {
            filter.tenantId = req.user.tenantId
        }

        let factories = await Factory.aggregate([
            {
                $match: filter,
            },
            {
                $unwind: { path: "$shift", preserveNullAndEmptyArrays: true }

            },
            {
                $match: { "shift.days": day }
            },
            {
                $unwind: { path: "$shift.shiftDetails", preserveNullAndEmptyArrays: true }

            },
            {
                $project: { _id: 0, factoryId: 1, name: "$shift.shiftDetails.Name", fromTime: "$shift.shiftDetails.Timings.From", toTime: "$shift.shiftDetails.Timings.To" }
            }
        ])

        res.json(factories);

    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }

})


router.post('/create', async function (req, res) {
    try {
        let db = await DB.Get();
        //    console.log(req);
        let factoryData = req.body.data;

        if (req.user.tenantId !== 'system') {
            factoryData.tenantId = req.user.tenantId
        }

        let nName = factoryData.nickName;
        let name = factoryData.name;
        let shiftarray = factoryData.shift;
        let isParamMissing = false;

        let totShiftTime = 0;

        if (
            !nName ||
            !name ||
            !shiftarray ||
            shiftarray.length < 1
        ) {
            console.log(JSON.stringify(factoryData))
            throw new Error('Either of nickName, name, shift is Invalid or missing ')
        }

        shiftarray.forEach((ele) => {
            totShiftTime = 0;
            if (!ele.days || ele.days.length < 0 || !ele.shiftDetails || ele.shiftDetails.length < 0) {
                throw new Error('Invalid param');
            } else {
                let sftDtls = ele.shiftDetails;
                sftDtls.forEach((detail) => {
                    let frm = parseInt(detail.Timings.From)
                    let to = parseInt(detail.Timings.To)
                    if (frm > to) {
                        to = 24 + to
                    }
                    detail.Timings.Fromts = frm * 60 * 60 * 1000
                    detail.Timings.Tots = to * 60 * 60 * 1000
                    detail.Timings.dur = detail.Timings.Tots - detail.Timings.Fromts
                    totShiftTime = totShiftTime + detail.Timings.dur;
                    if(parseInt(detail.Timings.dur) <= 0){
                        throw new Error('The Shift timings for a given shift are invalid [ totime is less than fromtime]')       
                    }
                });
                ele.runtimets = totShiftTime
                ele.downtimets = 86400000 - totShiftTime;

                if (parseInt(ele.downtimets) < 0) {
                    console.log(JSON.stringify(factoryData))
                    throw new Error('The Shift details mentioned are invalid or they are extending beyond 24 hrs')
                }
            }

        })



        //  console.log(JSON.stringify(req.body.data));
        factoryData['factoryId'] = req.body.data.nickName + "_" + req.body.data.name;
        let response = await Factory.create(req.body.data);
        await insertShiftSplit(name, req.user.tenantId, shiftarray, response._id);
        res.json(response);
    }
    catch (err) {
        console.log(err);
 ReE(res, { message: err.message }, 400)
//        res.json(err.message);
    }
})


async function insertShiftSplit(name, tenantId, shiftarray, id) {
    let db = await DB.Get();
    let weekdays = [1, 2, 3, 4, 5, 6, 7]
    let shiftsplit = [];
    let tsPtr = 0;
    let dur = 0;
    let sno = 1;

    await db.collection("shiftbreakups").deleteMany({ "tenantId": tenantId, "factoryId":  ObjectID(id) })

    weekdays.forEach((wday) => {
        shiftarray.forEach((ele) => {

            if (ele.days.indexOf(wday) > -1) {
                let sftDtls = ele.shiftDetails;
                sftDtls.forEach((detail) => {
                    if (parseInt(detail.Timings.From) > parseInt(detail.Timings.To)) {
                        detail.Timings.To = 24 + detail.Timings.To
                    }
                    if (detail.Timings.From > tsPtr) {
                        //  console.log("1")
                        dur = detail.Timings.From - tsPtr;
                        shiftsplit.push({ "sno": sno, "factoryId": ObjectID(id), "factory": name, "tenantId": tenantId, "frmHr": tsPtr, "toHr": detail.Timings.From, "name": "down", "type": "down", "duration": dur, "day": wday });
                        sno++;
                        tsPtr = detail.Timings.From;
                        //   console.log( "pushed => "+ JSON.stringify({ "sno": sno, "type": "down", "hr": dur, day: wday  }))
                        //   console.log(" currentPtr => "+tsPtr)
                        if (detail.Timings.From < detail.Timings.To && parseInt(detail.Timings.To) < 24) {
                            //   console.log("1.1");
                            dur = detail.Timings.To - detail.Timings.From;
                            shiftsplit.push({ "sno": sno,"factoryId": ObjectID(id), "factory": name, "tenantId": tenantId, "frmHr": detail.Timings.From, "toHr": detail.Timings.To, "type": "up", "name": detail.Name, "duration": dur, day: wday });
                            sno++;
                            tsPtr = detail.Timings.To;
                            //   console.log( "pushed => "+ JSON.stringify({ "sno": sno, "type": detail.Name, "hr": dur , day: wday}))
                            //   console.log(" currentPtr => "+tsPtr)
                        } else {
                            //  console.log("1.2");
                            dur = 24 - detail.Timings.From;
                            shiftsplit.push({ "sno": sno,"factoryId": ObjectID(id), "factory": name, "tenantId": tenantId, "frmHr": detail.Timings.From, "toHr": 24, "type": "up", "name": detail.Name, "duration": dur, day: wday });
                            sno++;
                            //     console.log( "pushed => "+ JSON.stringify({ "sno": sno, "type": detail.Name, "hr": dur , day: wday}))
                            //    console.log(" currentPtr => 24")
                            dur = detail.Timings.To - 24;
                            shiftsplit.push({ "sno": sno,"factoryId": ObjectID(id), "factory": name, "tenantId": tenantId, "frmHr": 0, "toHr": dur, "type": "up", "name": detail.Name, "duration": dur, day: wday + 1 });
                            sno++;
                            tsPtr = detail.Timings.To - 24;
                            // console.log( "pushed => "+ JSON.stringify({ "sno": sno, "type": detail.Name, "hr": dur , day: wday}))
                            //   console.log(" currentPtr => "+tsPtr)
                        }

                    } else if (detail.Timings.From < detail.Timings.To && detail.Timings.To < 24) {
                        //    console.log("2")
                        if (tsPtr > detail.Timings.From) {
                            dur = 24 - tsPtr;
                            shiftsplit.push({ "sno": sno,"factoryId": ObjectID(id), "factory": name, "tenantId": tenantId, "frmHr": tsPtr, "toHr": 24, "type": "down", "name": "down", "duration": dur, day: wday - 1 });
                            sno++;
                            //   console.log( "pushed => "+ JSON.stringify({ "sno": sno, "type": detail.Name, "hr": dur , day: wday}))
                            //   console.log(" currentPtr => 24")
                            dur = detail.Timings.From;
                            shiftsplit.push({ "sno": sno,"factoryId": ObjectID(id), "factory": name, "tenantId": tenantId, "frmHr": 0, "toHr": detail.Timings.From, "type": "down", "name": "down", "duration": dur, day: wday });
                            sno++;
                            tsPtr = detail.Timings.From;
                            //  console.log( "pushed => "+ JSON.stringify({ "sno": sno, "type": detail.Name, "hr": dur , day: wday}))
                            //  console.log(" currentPtr => "+tsPtr)
                        }
                        dur = detail.Timings.To - detail.Timings.From;
                        shiftsplit.push({ "sno": sno,"factoryId": ObjectID(id), "factory": name, "tenantId": tenantId, "frmHr": detail.Timings.From, "toHr": detail.Timings.To, "type": "up", "name": detail.Name, "duration": dur, day: wday });
                        sno++;
                        tsPtr = detail.Timings.To;
                        //  console.log( "pushed => "+ JSON.stringify({ "sno": sno, "type": detail.Name, "hr": dur , day: wday}))
                        //  console.log(" currentPtr => "+tsPtr)
                    } else {
                        //   console.log("3")
                        dur = 24 - detail.Timings.From;
                        shiftsplit.push({ "sno": sno,"factoryId": ObjectID(id), "factory": name, "tenantId": tenantId, "frmHr": detail.Timings.From, "toHr": 24, "type": "up", "name": detail.Name, "duration": dur, day: wday });
                        sno++;
                        //   console.log( "pushed => "+ JSON.stringify({ "sno": sno, "type": detail.Name, "hr": dur , day: wday}))
                        //   console.log(" currentPtr => 24")
                        dur = detail.Timings.To - 24;
                        shiftsplit.push({ "sno": sno,"factoryId": ObjectID(id), "factory": name, "tenantId": tenantId, "frmHr": 0, "toHr": dur, "type": "up", "name": detail.Name, "duration": dur, day: wday + 1 });
                        sno++;
                        tsPtr = detail.Timings.To - 24;
                        //  console.log( "pushed => "+ JSON.stringify({ "sno": sno, "type": detail.Name, "hr": dur , day: wday}))
                        //  console.log(" currentPtr => "+tsPtr)
                    }
                });
            }
        })

    })

    await db.collection("shiftbreakups").insertMany(shiftsplit);

}

router.put('/update', async function (req, res) {
    try {
        let db = await DB.Get();
        console.log(req.body.data);
        let factoryData = req.body.data;


        if (req.user.tenantId !== 'system') {
            factoryData.tenantId = req.user.tenantId
        }

        let id = factoryData._id;
        let nName = factoryData.nickName;
        let name = factoryData.name;
        let shiftarray = factoryData.shift;
        let isParamMissing = false;

        let startDayTs = moment().utcOffset(5.5).startOf('day').valueOf();
        let currDayTs = moment().utcOffset(5.5).valueOf();

        let currTimeTs = currDayTs - startDayTs;

       let today = parseInt(moment().utcOffset(5.5).day());

                    if (today === 0) {
                        today = 7;
                    }

        let strtSftTs, endSftTs, sftName;

        let totShiftTime = 0;

        if (
            !id ||
            !nName ||
            !name ||
            !shiftarray ||
            shiftarray.length < 1
        ) {
            console.log(shiftarray.length)
            console.log(JSON.stringify(factoryData))
            throw new Error('Either of _id, nickName, name, shift is Invalid or missing ')
        }

        shiftarray.forEach((ele) => {
            totShiftTime = 0;
let isCurrShift = false;
            if (!ele.days || ele.days.length < 0 || !ele.shiftDetails || ele.shiftDetails.length < 0) {
                console.log(JSON.stringify(factoryData))
                throw new Error('Invalid param');
            } else {
                let sftDtls = ele.shiftDetails;
if (ele.days && ele.days.indexOf(today) > -1) {
isCurrShift = true;

}
                sftDtls.forEach((detail) => {
                    let frm = parseInt(detail.Timings.From)
                    let to = parseInt(detail.Timings.To)
                    if (frm > to) {
                        to = 24 + to
                    }
                    detail.Timings.Fromts = frm * 60 * 60 * 1000
                    detail.Timings.Tots = to * 60 * 60 * 1000
                    detail.Timings.dur = detail.Timings.Tots - detail.Timings.Fromts
                    totShiftTime = totShiftTime + detail.Timings.dur;
console.log("currTimeTs -->"+currTimeTs  )
console.log("Fromts -->"+detail.Timings.Fromts)
console.log("Tots-->"+detail.Timings.Tots)

                    if (isCurrShift  && currTimeTs > detail.Timings.Fromts && currTimeTs < detail.Timings.Tots) {
                        strtSftTs = detail.Timings.Fromts;
                        endSftTs = detail.Timings.Tots
                        sftName = detail.Name;
                    }

                    if (parseInt(detail.Timings.dur) <= 0) {
                        throw new Error('The Shift timings for a given shift are invalid [ totime is less than fromtime]')
                    }
                });
                ele.runtimets = totShiftTime
                ele.downtimets = 86400000 - totShiftTime;

                if (parseInt(ele.downtimets) < 0) {
                    console.log(JSON.stringify(factoryData))
                    throw new Error('The Shift details mentioned are invalid or they are extending beyond 24 hrs')
                }
            }

        })


        let response = await Factory.update({ _id: ObjectID(factoryData._id) }, { $set: factoryData });
        await insertShiftSplit(name, req.user.tenantId, shiftarray, factoryData._id);
        console.log(sftName)
        console.log(strtSftTs )
        console.log(endSftTs )
        await Asset.updateMany({
            "tenantId": req.user.tenantId,
            "factoryId": ObjectID(factoryData._id)
        },
            {
                $set: {
                     'factory' : factoryData.name,
                     'location' : factoryData.location,
                    'computed.NILM.shift.name': sftName,
                    'computed.NILM.shift.startsftts': strtSftTs ,
                    'computed.NILM.shift.endsftts': endSftTs ,
                    'computed.NILM.partcnt.value': 0,
                    'computed.NILM.availmins.value': 0,
                    'computed.NILM.energy.value': 0
                }
            })

        res.json(response);
    }
    catch (err) {
        console.log(err);
 ReE(res, { message: err.message }, 400)
//        res.json(err.message);
    }
})

router.delete('/delete/:factoryId', async function (req, res) {
    try {
        let db = await DB.Get();
        console.log('req.params._id: ' + req.params.factoryId);
        let response = await Factory.remove({ _id: req.params.factoryId });
        res.json(response);
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }
})

module.exports = router;