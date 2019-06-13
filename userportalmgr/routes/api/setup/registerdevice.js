//  Express
const express = require('express')
var router = express.Router();

// Configure Environment
const DB = require('../../../../shared-modules/mongodb-helper/mongodb-helper.js')
const configModule = require('../../../../shared-modules/config-helper/config.js')
var configuration = configModule.configure(process.env.NODE_ENV)

// Configure Logging
const winston = require('winston')
winston.level = configuration.loglevel

// Include Custom Modules
const Device = require('../../../../shared-modules/db-models').Device;

let awshelper = require('../../../../shared-modules/aws-helper/awshelper.js')

/**
* @api {post} /device Create Device
* @apiName createDevice
* @apiGroup Device Manager
* @apiDescription Create a Device
* @apiParam {Object} Device Object.
*/
router.post('/', async function (req, res) {
  var devicedata = req.body

  let err, thing, result;
  if (!devicedata.tenantId) {
    devicedata.tenantId = req.user.tenantId
  }
  // set active param
  devicedata.active = 'false';
  winston.info('invoked create device manager')
  try {

    if (
      !devicedata.assetName ||
      !devicedata.tenantId ||
      !devicedata.hardwareID
    ) {
      winston.debug('Missing required params : ' + JSON.stringify(devicedata))
      throw new Error('Missing required params')
    }

    let device = {
      "devName": devicedata.assetName,
      "hardwareID": devicedata.hardwareID,
      "tenantId": devicedata.tenantId,
      "devType": "NILM",
      "active" : false,
      "attributes": "{\"CREATEDBY\": \"" + req.user.email + "\"}",      
      "deviceTypeKeys": { "mode": { "value": "normal", "desc": "{datalog/normal} mode of operation" }, "ota": { "value": "n", "desc": "{y/n} ota job update" } }
    }

    let maxDevId = await Device.findOne({}).sort('-devId').select('devId -_id');
    device.devId = maxDevId.devId + 1;

    //      device.devId = 1000001;
    [err, thing] = await to(Device.create(device));

    if (err) {
      winston.debug('Error in inserting Device: ' + JSON.stringify(err.message))
      throw new Error('Error in inserting Device: ' + err.message)
    }

    let attrVal = JSON.parse(device.attributes);
    attrVal.TenantId = device.tenantId.toString();
    attrVal.DeviceId = device.devId.toString();
    attrVal.hardwareID = device.hardwareID;

    device.attributes = JSON.stringify(attrVal);
    console.log(JSON.stringify(device))
    let newThing = await awshelper.Creatething(device);

    if (!newThing.certificateId) {
      throw new Error('Error Creating Device Thing');
    }

    let deviceDoc = {
      "state": { "desired": {} }
    };
    let deviceKeys = {}
    let typeKeys = JSON.parse(device.deviceTypeKeys)

    for (var key in typeKeys) {
      if (typeKeys.hasOwnProperty(key)) {
        deviceDoc["state"]["desired"][key] = typeKeys[key].value
        deviceKeys[key] = typeKeys[key].value
      }
    }

    console.log(deviceDoc)
    let data = await awshelper.updatedeviceShadow(device.devName, JSON.stringify(deviceDoc))

    result = await Device.update({ devName: device.devName, tenantId: device.tenantId }, {
      $set: {
        certId: newThing.certificateId,
        policyname: newThing.policyname,
        principal: newThing.certificateArn,
        thingArn: newThing.thingArn,
        thingId: newThing.thingId,
        active: true,
        deviceTypeKeys: typeKeys,
        deviceKeys: deviceKeys
      }
    });

    ReS(res, { header: 'Device Registered' }, 200)
  } catch (err) {
    console.log(err)
    winston.error('Error in Device Creation: ' + err.message)
    ReE(res, { message: "Error creating Device" }, 400)
  }

})



/**
 * @api {put} /device/assigndevice Update asset information for device
 * @apiName API assign/unassign asset to Device
 * @apiGroup Device Manager
 * @apiParam 
 * @apiDescription Assign/unassign asset to device
 */
router.put('/device/assigndevice', async function (req, res) {
  let result;
  winston.info('invoked assign device')
  try {

    if (
      !req.body.devName ||
      !req.body.tenantId
    ) {
      throw new Error('Invalid param')
    }

    let params = { devName: req.body.devName };
    if (!req.body.tenantId) {
      params.tenantId = req.body.tenantId
    } else {
      params.tenantId = req.body.tenantId
    }

    let updateValues = {}

    if (!req.body.assetId) {
      updateValues.assetId = ""
      updateValues.assetAttached = false
    } else {
      updateValues.assetId = req.body.assetId
      updateValues.assetAttached = true
    }

    result = await Device.updateOne(params, updateValues);
    winston.debug('result: ' + JSON.stringify(result));
    ReS(res, { message: 'Device Assigned' }, 200)

  } catch (err) {
    winston.error('Error in Device Assign: ' + err.message)
    ReE(res, { message: "Error assigning Device" }, 400)
  }
})




/**
 * @api {get} /Device/health Request API Health information
 * @apiName API Health Info
 * @apiGroup Device Manager
 * @apiDescription Get the API Name  and isAlive flag
 */
router.post('/updateEvent', async function (req, res) {
  if (req.body.enabled) {
    let data = await awshelper.updateEventconfig(req.body.enabled)
    winston.debug(data)
    res.status(200).send({ service: 'updateEvent', status: req.body.enabled })
  }
})

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

module.exports = router;


