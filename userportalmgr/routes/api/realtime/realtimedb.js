var express = require('express');
var router = express.Router();
var shift = require(__base + 'config/shift');
var request = require("request-promise");
const DB = require('../../../../shared-modules/mongodb-helper')
var moment = require('moment');
var ObjectID = require('mongodb').ObjectID;
const Factory = require('../../../../shared-modules/db-models').Factory;
const Asset = require('../../../../shared-modules/db-models').Asset;

const globalFuncs = require('../../../../shared-modules/global-funcs-helper/global_functions.js'); //instantiate global functions
const realTimeUtil = require('../../../../shared-modules/portal-utility/realTimeMetricUtility');

// Configure Logging
const winston = require('winston')
winston.level = "debug";

router.get('/', async function (req, res) {
console.log('###1223444');
    let dayStartmilli = moment().utcOffset(5.5).startOf('day').valueOf();
    var assetList = [];
    let rtArray= [];

    let db = await DB.Get();
    let userId = req.query.userId;

    if (req.query.userId == null) {
        userId = req.user.email
    }
    winston.info('## user id -> ' + userId);
    winston.info('#### dayStartmilli ->' + dayStartmilli);
    try {
        
        let teCursor = await db.collection("favMachines").aggregate([
            { $match: { "userId": userId } },
            { $unwind: "$machines" },
            { $lookup: {
                   from: "assets",
                   localField: "machines",
                   foreignField: "assetId",
                   as: "assetInfo"
                }
            },
            { $unwind: {
                        "path": "$assetInfo",
                        "preserveNullAndEmptyArrays": true
                    }
            },
            { $project: {  machines: 1 , "assetInfo":1 }}
        ]);
        
        while (await teCursor.hasNext()) {
            let data = await teCursor.next();
            let asset = data.assetInfo;
            let shiftData = await db.collection("shiftDetails")
                    .find({ assetName: asset.assetId, shift:asset.computed.NILM.shift.name, fromTs:{$gte:dayStartmilli} })
                    .sort({ _id: -1 }).toArray();
            asset.shifts=shiftData;
            assetList.push(asset);
        }
    }
    catch (err) {
        winston.info(err);
        res.status(500).json(err);
    }

    winston.info('##### data --->' + JSON.stringify(assetList));

    try {
        
        for (const asset of assetList) {
            let val = await realTimeUtil.getRealTimeMetric(asset, asset.shifts,req.user.tenantId);
            //winston.info('##### val -> ' + val);
            rtArray.push(val);
        }

        winston.info(JSON.stringify(rtArray))
        res.json(rtArray);

    }
    catch (err) {
        winston.info(err);
        res.status(500).json(err);
    }



})

router.get('/getdtls', async function (req, res) {
    
    let db = await DB.Get();
    let resultobj = [];
    let obj={};
    
    
    let activeShift= false;
    let userId;
    if (req.query.userId == null) {
        userId = req.user.email
    }
    let val = await db.collection("favMachines").aggregate([
        { $match: { "userId": userId } },
        { $unwind: "$machines" },
        { $lookup: {
               from: "assets",
               localField: "machines",
               foreignField: "assetId",
               as: "assetInfo"
            }
        },{ $unwind: "$assetInfo" },
        {$project: {"assetInfo.nextMainDt":1 ,"assetInfo.computed.NILM.shift.name":1 }}
        ]).toArray();

    if(val && val[0]){
        if(val[0].assetInfo.nextMainDt){
            var date = moment(JSON.stringify(val[0].assetInfo.nextMainDt), 'YYYY-MM-DD' ).toDate();
            obj.maintcycle = moment(date).diff(moment(), 'days') + 1;
            
        }else{
            obj.maintcycle="-";
        }
        if(val[0].assetInfo.computed.NILM.shift.name){
            activeShift=true;
        }
    }
    if(activeShift){
        winston.info('active shifttt-->' + req.query.deviceId)
        let teCursor = await db.collection("shiftDetails").findOne({
            "deviceId": req.query.deviceId,
            "status": "open"
        }, { "userId": 1, "partNo": 1, "lotNo": 1 });
        
        if (teCursor!=null) {
            winston.info('active shifttt 1')
            obj.userId=teCursor.userId;
            obj.partNo=teCursor.partNo;
            obj.lotNo=teCursor.lotNo;
            resultobj.push(obj);
            
            let veCursor = db.collection("appusers").find({ "email": resultobj[0].userId }).project({ "firstName": 1, "lastName": 1, "_id": 0 });
            while (await veCursor.hasNext()) {
                resultobj.push(await veCursor.next());
            }
        }
        else {
            winston.info('active shifttt 2')
            resultobj.push(obj);
        }
    }else{
        resultobj=[];
    }
    
    res.json({ status: "Success", result: resultobj });
    res.status(200);
});


module.exports = router;
