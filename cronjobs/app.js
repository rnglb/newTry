//
'use strict'
const configModule = require('../shared-modules/config-helper/config.js')
var config = configModule.configure(process.env.NODE_ENV)
var cron = require('node-cron');
var moment = require('moment');
var request = require('request');
const DB = require('../shared-modules/mongodb-helper')
const Event = require('../shared-modules/db-models').Event;
const Notifications = require('../shared-modules/db-models').Notifications;
var ObjectID = require('mongodb').ObjectID;
const assetmetrics =require('../shared-modules/portal-utility/realTimeMetricUtility');
 
//const assetmetrics = require('../../../../shared-modules/portal-utility/realTimeMetricUtility');

cron.schedule('55 55 23 * * *', async () => {
  try {
    let db = await DB.Get();
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 59);
    let downtimeArray = await db.collection("macDownTime").aggregate([
      {
        $match: { startTs: { $gte: startDate.getTime(), $lte: endDate.getTime() } }
      },
      {
        $project: { "startTs": 1, "endTs": 1, downTime: { $divide: [{ $subtract: ['$endTs', "$startTs"] }, 60000] }, "startTs": { $add: [new Date(0), "$startTs"] }, "endTs": { $add: [new Date(0), "$endTs"] }, "deviceId": 1, "reason": 1 }
      },
      {
        $group: {
          "_id": { "device": "$deviceId" }, downtime: { $sum: "$downTime" }, downtimeArray: { $push: { "startTs": "$startTs", "endTs": "$endTs", "downtime": "$downTime", "reason": "$reason.type" } }
        }
      }, {
        $project: { "deviceId": "$_id.device", downtimeArray: 1, downTime: 1, _id: 0, availability: { $subtract: [1440, "$downtime"] }, tenantId: '0121001', time: { $add: [new Date().getTime()] } }
      }
    ]).toArray();

    //  console.log(downtimeArray);

    let doc = {};
    db.collection("AggregatedDownTime").insert(downtimeArray, function (err, docs) {
      if (err) {
        console.error(err);
      } else {
        console.log("Multiple documents inserted to Collection");
      }
    });

  }
  catch (err) {
    console.log(err)
  }
})

// update next maintenance date in asset table
cron.schedule('*/5 * * * *', async () => {
console.log('#### start maintanence days update');
  try {
        var now =moment().utcOffset(5.5).startOf('day').valueOf();
        let db = await DB.Get();
        
        let result =  await db.collection("assets").aggregate([
                                            {$match: {status:{$in: ['new', 'active']}}},
                                            { $project: {
                                                    maintDt : 1,
                                                    _id:1, 
                                                    maintcycle:1, 
                                                    maintunit:1,
                                                    nextMainDt:1
                                                }
                                            }
                                            ]).toArray();
        result.forEach((asset)=>{
            
            if(asset.maintDt && asset.maintcycle && asset.maintunit){
                var cycleDt;
                var unit = asset.maintcycle;
    
                if(asset.nextMainDt){
                    var dt = asset.nextMainDt;
                    console.log('###->'+ dt);
                    console.log('#######--' + moment(parseInt(dt.getTime())).utcOffset(5.5).valueOf());
                    cycleDt = moment(parseInt(dt.getTime())).utcOffset(5.5).startOf('day').valueOf(); 
                }else{
                    var dt = asset.maintDt;
                    console.log('###->'+ dt);
                    cycleDt = moment(parseInt(dt.getTime())).utcOffset(5.5).startOf('day').valueOf(); 
                }
    
                if(cycleDt < now){
                    console.log('#### innnn');
                    if(asset.maintunit =='Months'){
                        while(cycleDt < now){
                            cycleDt = moment(cycleDt).add(unit,'months');
                        }
                        
                    }else{
                      console.log('### now  --> ' + now)
                      console.log('### cycle Dt 1  --> ' + cycleDt)
                        while(cycleDt < now){
                            cycleDt = moment(cycleDt).add(unit,'d');
                        }
                        console.log('### cycle Dt 2 --> ' + cycleDt)
                    }
                    asset.nextMainDt=moment(cycleDt).utcOffset(5.5).format();
                    console.log('### cycle Dt 2 --> ' + asset.nextMainDt)
                    db.collection("assets").updateOne({ _id: ObjectID(asset._id) }, {
                        $set: {
                          "nextMainDt" : asset.nextMainDt
                        }
                      }); 
                }
                
    
            }
            
        });
    
        
      }
      catch (err) {
        console.log(err)
      }
})

cron.schedule('55 55 23 * * *', async () => {
  try {
    let db = await DB.Get();
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 59);
    let downtimeArray = await db.collection("totenergy").aggregate([
      {
        $match: { fromTs: { $gte: startDate.getTime() }, toTs: { $lte: endDate.getTime() } }
      },
      {
        $project: { "hour": { "$hour": { date: { $add: [new Date(0), "$fromTs"] }, timezone: "+0530" } }, energy: "$totEnergy", Time: { $subtract: ['$toTs', "$fromTs"] }, "startTs": { $add: [new Date(0), "$fromTs"] }, "endTs": { $add: [new Date(0), "$toTs"] }, "deviceId": 1 }
      }, {
        $group: { "_id": { "deviceId": "$deviceId", "hour": "$hour" }, totEnergy: { $sum: "$energy" } }
      }, {
        $group: { "_id": "$_id.deviceId", totEnergy: { $sum: "$totEnergy" }, hourArray: { $push: "$_id.hour" }, energyArray: { $push: { "hour": "$_id.hour", "totEnergy": "$totEnergy" } } }
      }, {
        $project: { _id: 0, "deviceId": "$_id", "totEnergy": "$totEnergy", hourArray: 1, energyArray: 1, time: { $add: [new Date().getTime()] }, tenantId: '0121001' }
      }
    ]).toArray();



    downtimeArray.forEach(function (element) {
      //   console.log(JSON.stringify(element))
      let i = 0;
      while (i < 24) {
        if (!element.hourArray.includes(i)) {
          element.energyArray.push({ hour: i, "totEnergy": 0 });
        }
        i = i + 1;
      }
      delete element.hourArray

    })

    // console.log(JSON.stringify(downtimeArray));

    let doc = {};
    db.collection("AggregatedEnergy").insertMany(downtimeArray, function (err, docs) {
      if (err) {
        console.error(err);
      } else {
        console.log("Multiple documents inserted to Collection");
      }
    });

  }
  catch (err) {
    console.log(err)
  }
})

cron.schedule('55 55 23 * * *', async () => {
  try {
    let db = await DB.Get();
    let startDate = new Date();

    let endDate = new Date();

    let criteria = await db.collection("shifts").aggregate([
      {
        $match: { type: 'Standard', mode: 'Weekday' }
      },
      {
        $unwind: '$shiftDetails'
      },
      {
        $group: { "_id": "$type", 'startTime': { $min: "$shiftDetails.Timings.From" }, 'toTime': { $max: '$shiftDetails.Timings.To' } }
      }

    ]).toArray();
    console.log(JSON.stringify(criteria));

    startDate.setHours(criteria[0].startTime, 0, 0, 0);
    endDate.setHours(criteria[0].toTime, 0, 0, 0);
    let result = await db.collection("shiftDetails").aggregate([
      {
        $match: { fromTs: { $gte: startDate, $lte: endDate } }
      }, {
        $group: { "_id": { "shift": "$shift", "machine": "$machine" }, rejectCount: { $push: { "startup": "$rejectCount.startup", "production": "$rejectCount.production" } }, startup: { $sum: "$rejectCount.startup" }, production: { $sum: "$rejectCount.production" } }
      }, {
        $project: { "_id": 0, "shiftName": "$_id.shift", "machine": "$_id.machine", rejectCount: 1, startup: 1, production: 1, rejection: { $add: ["$startup", "$production"] }, time: { $add: [new Date().getTime()] } }
      }
    ]).toArray();

    // console.log(JSON.stringify(result))
    db.collection("AggregatedShiftDetails").insertMany(result, function (err, docs) {
      if (err) {
        console.error(err);
      } else {
        console.log("Multiple documents inserted to Collection");
      }
    });

  } catch (err) {

  }
})


cron.schedule('55 55 23 * * *', async () => {
  try {
    let db = await DB.Get();
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 59);

    let result = await Event.aggregate([
      {
        $match: { ts: { $gte: startDate.getTime(), $lte: endDate.getTime() } }
      },
      {
        $project: { "hour": { "$hour": { date: { $add: [new Date(0), "$ts"] }, timezone: "+0530" } }, "deviceId": 1, "fromState": 1, "ts": 1 }
      },
      {
        $group: { "_id": { "hour": "$hour", "device": "$deviceId" }, partCount: { $sum: "$fromState" } }
      },
      {
        $group: { "_id": "$_id.device", partCount: { $sum: "$partCount" }, hourArray: { $push: "$_id.hour" }, partArray: { $push: { "partCount": "$partCount", "hour": "$_id.hour" } } }
      }, {
        $project: { "_id": 0, "deviceId": "$_id", partCount: 1, partArray: 1, hourArray: 1, time: { $add: [new Date().getTime()] }, tenantId: '0121001' }
      }
    ])
    //    console.log(JSON.stringify(result));

    result.forEach(function (element) {
      let i = 0;
      while (i < 24) {
        if (!element.hourArray.includes(i)) {
          element.partArray.push({ hour: i, "partCount": 0 });
        }
        i = i + 1;
      }
      delete element.hourArray

    })

    db.collection("AggregatedPartCount").insertMany(result, function (err, docs) {
      if (err) {
        console.error(err);
      } else {
        console.log("Multiple documents inserted to Collection");
      }
    });


  }
  catch (err) {
    console.log(err);

  }
})


/** Cron JOB for Notification Generation */
cron.schedule('*/5 * * * *', async () => {
  try {
    let db = await DB.Get();
    let alerts = [];
    let assets = [];
    let dayStartmilli = moment().utcOffset(5.5).startOf('day').valueOf();
    let currmillisec = moment().utcOffset(5.5).valueOf()
    let todaymillisec = currmillisec - dayStartmilli;
    let result = await db.collection("alerts").find({});// Get all the alerts defined
    for (let teDoc = await result.next(); teDoc != null; teDoc = await result.next()) {
      alerts.push(teDoc);
    }

    alerts.forEach(async function (element) {
      // Load the assets for different asset type like machine, group, location ,plant etc...
      assets = await getAssets(element.assettype.toUpperCase(), element.asset, element.tenantId);
      //Condition for Status Duration INACTIVE,OFF
      if (element.criteria.eventtype == "S-D") {
        let mode = (element.criteria.condition.param == 'SD-I' ? "down" : (element.criteria.condition.param == 'SD-O' ? "off" : ""))
        await assets.forEach(async function (ast) {
          if (ast.computed.NILM.deviceStatus.value != mode && element.active == 1) {
            console.log('resetting');
            // await resetAlert(ObjectID(element._id));

            await db.collection("alerts").updateOne({ _id: ObjectID(element._id) }, {
              $set: {
                "notifications.level1.notified": false, "notifications.level1.notifiedts": null,
                "notifications.level2.notified": false, "notifications.level2.notifiedts": null,
                "notifications.level3.notified": false, "notifications.level3.notifiedts": null,
                "active": 0, "stop": 0, "stopts": null
              }
            });
          }
          else if ((ast.computed.NILM.deviceStatus.value == mode) && (element.stop == 0) &&
            (((currmillisec - ast.computed.NILM.evtstate.changets) / 60000) > element.criteria.condition.duration)) {
            await send_notification(element, ast, db, 'durationAlert', "Status Duration", null, ast.computed.NILM.deviceStatus.value);
          }

        });

      }
      //Condition for Status Change INACTIVE,OFF,ON
      else if (element.criteria.eventtype == "S-C") {
        let mode = (element.criteria.condition.param == 'SC-I' ? "down" : (element.criteria.condition.param == 'SC-O' ? "off" : "active"))
        await assets.forEach(async function (ast) {
          //Reset Alert
          if (ast.computed.NILM.deviceStatus.value != mode && element.active == 1) {
            console.log('resetting');
            // await resetAlert(element._id);
            await db.collection("alerts").updateOne({ _id: ObjectID(element._id) }, {
              $set: {
                "notifications.level1.notified": false, "notifications.level1.notifiedts": null,
                "notifications.level2.notified": false, "notifications.level2.notifiedts": null,
                "notifications.level3.notified": false, "notifications.level3.notifiedts": null,
                "active": 0, "stop": 0, "stopts": null
              }
            });
          }
          else if (ast.computed.NILM.deviceStatus.value == mode && element.stop == 0) {
            await send_notification(element, ast, db, 'statusAlert', "Status", null, ast.computed.NILM.deviceStatus.value);
          }
        })

      }
      //Condition for Metric Treshold Availability, Performance, Quality
      else if (element.criteria.eventtype == "M-T") {
        // Availability check for each asset, calculated till current time.
        await assets.forEach(async function (ast) {
          let shiftdtls = await shift(ast);
          let result = await assetmetrics.getRealTimeMetric(ast, shiftdtls, element.tenantId);
          if (result) {
            let avail = parseInt(result[ast.assetId].avail);
            let qual = parseInt(result[ast.assetId].quality);
            let perf = parseInt(result[ast.assetId].performance.perf);

            if (element.criteria.condition.param == 'MT-A' && avail < element.criteria.condition.th1 && element.stop == 0) {
              send_notification(element, ast, db, 'thresholdAlert', 'Availabiltiy', element.criteria.condition.th1, Math.round(avail));
            }
            else if (element.criteria.condition.param == 'MT-Q' && qual < element.criteria.condition.th1 && element.stop == 0) {
              send_notification(element, ast, db, 'thresholdAlert', 'Quality', element.criteria.condition.th1, Math.round(qual));
            }
            else if (element.criteria.condition.param == 'MT-P' && perf < element.criteria.condition.th1 && element.stop == 0) {
              send_notification(element, ast, db, 'thresholdAlert', 'Performance', element.criteria.condition.th1, Math.round(perf));
            }
            // Resetting 
            else if (element.active == 1 &&
              (element.criteria.condition.param == 'MT-A' && avail >= element.criteria.condition.th1) ||
              (element.criteria.condition.param == 'MT-Q' && qual >= element.criteria.condition.th1) ||
              (element.criteria.condition.param == 'MT-P' && perf >= element.criteria.condition.th1)) {

              await db.collection("alerts").updateOne({ _id: ObjectID(element._id) }, {
                $set: {
                  "notifications.level1.notified": false, "notifications.level1.notifiedts": null,
                  "notifications.level2.notified": false, "notifications.level2.notifiedts": null,
                  "notifications.level3.notified": false, "notifications.level3.notifiedts": null,
                  "active": 0, "stop": 0, "stopts": null
                }
              });

            }
          }
        });
      }
    });
  }
  catch (err) {
    console.log(err);
  }
});


cron.schedule('*/5 * * * *', async () => {
  try {
    let db = await DB.Get();
    let currmillisec = moment().valueOf();
    let result = await db.collection("assets").updateMany({ $expr: { $gt: [{ $subtract: [currmillisec, "$computed.NILM.lastMsgts.ts"] }, 5 * 60000] }, 
																		"computed.NILM.lastMsgts.ts": { $ne: 0 }, "computed.NILM.deviceStatus.value": { $ne: "off" } },
															{ $set: { "computed.NILM.deviceStatus.value": "off" } });
	}
  catch (err) {
    console.log(err);
  }
});

async function send_notification(element, ast, db, template, event, treshold, value) {
  let currmillisec = moment().utcOffset(5.5).valueOf();
  try {
    let level = 0;
    console.log(element.notifications.level1.notified);
    console.log(element.notifications.level2.notified);
    console.log(element.notifications.level3.notified);
    console.log(currmillisec - ast.computed.NILM.deviceStatus.ts);
    if (element.notifications.level1.notified == false) {
      level = 1;
    }
    else if (element.notifications.level1.notified == true && element.notifications.level2.notified == false &&
      (((currmillisec - element.notifications.level1.notifiedts) / 1000) / 60) > element.notifications.per_dur) {
      level = 2;
    }
    else if (element.notifications.level2.notified == true && element.notifications.level3.notified == false &&
      (((currmillisec - element.notifications.level2.notifiedts) / 1000) / 60) > element.notifications.per_dur) {
      level = 3;
    }
    console.log('level=>' + level);
    let maxlevel = element.notifications.level3.userId != null ? 3 : element.notifications.level2.userId != null ? 2 : element.notifications.level1.userId != null ? 1 : 0;
    console.log('maxlevel=>' + maxlevel);
    let notobj = {};
    if (level != 0) {
      console.log('construct notification object');
      let user = level == 1 ? element.notifications.level1.userId : level == 2 ? element.notifications.level2.userId :
        level == 3 ? element.notifications.level3.userId : "";
      notobj = {
        alertId: element._id,
        medium: element.notifications.mode,
        criteria: event + ' ' + ast.computed.NILM.deviceStatus.value,
        asset: ast.assetId,
        deviceId: ast.devices.devId,
        tenantId: element.tenantId,
        userId: user
      };

      console.log('user=>' + user);
      let tecursor = db.collection("appusers").find({ $or: [{ userId: user }, { email: user }] });
      let emailArray = [];
      for (let teDoc = await tecursor.next(); teDoc != null; teDoc = await tecursor.next()) {
        emailArray.push(teDoc);
      }
      console.log('Before Creating Notification' + JSON.stringify(notobj));
      await Notifications.create(notobj);
      console.log('Before Creating Notification');

      let email = element.notifications.mode.includes("E-mail ");
      let sms = element.notifications.mode.includes("SMS ");
      console.log('email=>' + email);
      console.log('sms=>' + sms);

      let durmin = Math.round((currmillisec - ast.computed.NILM.evtstate.changets) / 60000);
      if (email) {
        let userDataBody = {
          "tenantId": element.tenantId,
          "template": template,
          "to": emailArray[0].email,
          "cc": "",
          "emailVars": {
            "user": emailArray[0].firstName,
            "userId": user,
            "asset": ast.assetId,
            "date": moment().utcOffset(5.5).format('MMMM Do YYYY, h:mm:ss a'),
            "status": ast.computed.NILM.deviceStatus.value,
            "tsmin":durmin ,
            "value": treshold+'%',
            "metric": event,
            "currValue": value+'%',
            "mutestatus": "Active",
            "level": level 
          }
        }
console.log(JSON.stringify(userDataBody))
        await send_email(userDataBody);
      }
      if (sms) {
let eventmsg = event;
if(event == "Status"){
eventmsg = "Status of machine is "+ast.computed.NILM.deviceStatus.value;
}
        let smsBody = {
          "Message": "Alert for Event defined by " + user + "  \r\n Machine Name:" + ast.assetId + " \r\n Description: " + eventmsg + " \r\n Escalation Level:" + level + " \r\n Mute Status:0",
          "PhoneNumber": emailArray[0].phone
        };
        await send_SMS(smsBody);
      }
      await db.collection("alerts").updateOne({ _id: ObjectID(element._id) },
        {
          $set: {
            ["notifications.level" + level + ".notified"]: true,
            ["notifications.level" + level + ".notifiedts"]: currmillisec,
            "stop": level === maxlevel ? 1 : 0,
            "stopts": level === maxlevel ? currmillisec : null,
            "active": 1
          },
          $inc: { emailcount: email == true ? 1 : 0 },
          $inc: { smscount: sms == true ? 1 : 0 }
        });
    }

    console.log('Here 6')
    return "success";
  }
  catch (err) {

  }
}

async function getAssets(type, assetId, tenantId) {
  try {
    let db = await DB.Get();
    let assets = [];
    let result = []
    if (type == 'MACHINE') {
      result = await db.collection("assets").find({ "devices.devId": parseInt(assetId), tenantId: tenantId });
      for (let teDoc = await result.next(); teDoc != null; teDoc = await result.next()) {
        assets.push(teDoc);
      }

    }
    else if (type == 'GROUP') {
      result = await db.collection("assets").find({ group: assetId, tenantId: tenantId });
      for (let teDoc = await result.next(); teDoc != null; teDoc = await result.next()) {
        assets.push(teDoc);
      }
    }
    else if (type == 'LOCATION') {
      result = await db.collection("assets").find({ location: assetId, tenantId: tenantId });
      for (let teDoc = await result.next(); teDoc != null; teDoc = await result.next()) {
        assets.push(teDoc);
      }
    }

    return assets;
  }
  catch (err) {
    return err;
  }

}
async function shift(asset) {
  let dayStartmilli = moment().utcOffset(5.5).startOf('day').valueOf();
  try {
    let shiftData = await db.collection("shiftDetails").find(
      {
        assetId: { $eq: assetId },
        shift: { $eq: asset.computed.NILM.shift.name },
        fromTs: { $gte: dayStartmilli }
      }
    ).sort({ _id: -1 }).toArray();
    return shiftData;
    /*   console.log('factory=>' + factory);
    let db = await DB.Get();
    let retobj, fromTs, toTs, endTs;
    let currentShift = 'shift 1';
    let currentday = moment().isoWeekday();
    console.log('current day=>' + currentday);
    let shift = [];
    let match = { "name": factory };
    let dayStartmilli = moment().utcOffset(5.5).startOf('day').valueOf();
    let currmillisec = moment().utcOffset(5.5).valueOf()
    let todaymillisec = currmillisec - dayStartmilli;
    console.log('shift match=>' + JSON.stringify(match));
    let xshift = await db.collection("factories").aggregate([{ $match: match },
    { $unwind: "$shift" },
    { $match: { "shift.days": parseInt(currentday) } },
    { $project: { shift: '$shift.shiftDetails' } },
    { $unwind: "$shift" },
    {
      $project: {
        "Timings": "$shift.Timings", "Name": "$shift.Name", "Order": "$shift.Order",
        "Start": { $cond: { if: { $gt: ["$shift.Order", "1"] }, then: { "$add": [{ "$multiply": [{ "$multiply": [{ "$multiply": ["$shift.Timings.From", 60] }, 60] }, 1000] }, 1000] }, else: { "$multiply": [{ "$multiply": [{ "$multiply": ["$shift.Timings.From", 60] }, 60] }, 1000] } } },
        "End": { "$multiply": [{ "$multiply": [{ "$multiply": ["$shift.Timings.To", 60] }, 60] }, 1000] }
      }
    },
    { $sort: { "_id": -1 } }]);
    for (let teDoc = await xshift.next(); teDoc != null; teDoc = await xshift.next()) {
      await shift.push(teDoc);
    }
    console.log('shift length=>' + shift.length);
    // await shift.forEach((element) => {
    //   if (element.Name.toLocaleLowerCase === "shift 1" && todaymillisec < element.Start) {
    //     fromTs = dayStartmilli - 7200000;
    //     toTs = currmillisec;
    //     currentShift = 'shift 3';
    //     endTs = dayStartmilli + 21600000;
    //     retobj = { fromTs: fromTs, toTs: toTs, endTs: endTs, currentShift: currentShift.split(" ").join("").toLocaleLowerCase() };
    //   } else if ((element.Start < todaymillisec) && (element.End > todaymillisec)) {
    //     fromTs = dayStartmilli + element.Start;
    //     toTs = currmillisec;
    //     currentShift = element.Name;
    //     endTs = dayStartmilli + element.End;
    //     retobj = { fromTs: fromTs, toTs: toTs, endTs: endTs, currentShift: currentShift };

    //   }
    // });*/


  }
  catch (err) {
    return err;
  }
}

async function send_email(userDataBody) {
  try {
console.log(config.url.email + "/sendMail")
    let url =
      request({
        url: config.url.email + "/sendMail",
        method: "POST",
        headers: { 'content-type': 'application/json' },
        json: true,
        body: userDataBody
      }, function (error, response, body) {
        if (error) {
          console.log(error);
          return url;

        }
        console.log("received response from email")
        console.log('E-MAIL=>' + body)
        return url;

      });
  }
  catch (err) {
  }
}

async function send_SMS(smsBody) {
  console.log(smsBody)
  try {

    request({
      url: config.service_url + ":" + config.port.email + '/sms/sendSms',
      method: "POST",
      headers: { 'content-type': 'application/json' },
      json: true,
      body: smsBody
    }, function (error, response, body) {
      if (error) {
        console.log(error);
      }
      console.log("received response from sms")
      console.log('SMS=>' + body)
      return body;
    });
  }
  catch (err) {
  }


}

async function resetAlert(id) {
  try {
    console.log(id);
    await db.collection("alerts").updateOne({ _id: id }, {
      $set: {
        "notifications.level1.notified": false, "notifications.level1.notifiedts": null,
        "notifications.level2.notified": false, "notifications.level2.notifiedts": null,
        "notifications.level3.notified": false, "notifications.level3.notifiedts": null,
        "active": 0, "stop": 0, "stopts": null
      }
    });
    return "Success";
  }
  catch (err) {
    return err;
  }
}

async function getNotifyLevel(element, asset, currmillisec) {
  console.log('element=>' + element);
  if (element.notifications.level1.notified == false) {
    return 1;
  }
  if (element.notifications.level1.notified == true &&
    element.notifications.level2.notified == false &&
    element.notifications.level2.name != null &&
    (((currmillisec - asset.computed.NILM.deviceStatus.ts) / 1000) / 60) > element.notifications.per_dur) {
    return 2;
  }
  if (element.notifications.level2.notified == true &&
    element.notifications.level3.notified == false &&
    element.notifications.level3.name != null &&
    (((currmillisec - asset.computed.NILM.deviceStatus.ts) / 1000) / 60) > element.notifications.per_dur) {
    return 3;
  }
  return 0;
}

async function getStopLevel(element) {
  let maxlevel = element.notifications.level3.userId != null ? 3 : element.notifications.level2.userId != null ? 2 : element.notifications.level1.userId != null ? 1 : 0;
  return maxlevel;

}

