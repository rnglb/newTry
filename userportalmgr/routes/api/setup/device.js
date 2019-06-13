//  Express
const express = require('express')
var router = express.Router();
const cron = require('node-cron')

// Configure Environment
const DB = require('../../../../shared-modules/mongodb-helper/mongodb-helper.js')
const configModule = require('../../../../shared-modules/config-helper/config.js')
var configuration = configModule.configure(process.env.NODE_ENV)
const globalFuncs = require('../../../../shared-modules/global-funcs-helper/global_functions.js'); //instantiate global functions

// Configure Logging
const winston = require('winston')
winston.level = configuration.loglevel

// Include Custom Modules
const tokenManager = require('../../../../shared-modules/token-manager/token-manager.js')

const Device = require('../../../../shared-modules/db-models').Device;
const Image = require('../../../../shared-modules/db-models').Image;
const Job = require('../../../../shared-modules/db-models').Job;
const DeviceDtl = require('../../../../shared-modules/db-models').DeviceDetails;
const APIRoutes = require('../../../../shared-modules/db-models').APIRoutes;

let awshelper = require('../../../../shared-modules/aws-helper/awshelper.js')

/**
 * @api {get} / Request module health
 * @apiName Device Manager Health
 * @apiGroup Device Manager
 * @apiDescription Get the Module Name  and isAlive flag
 */
router.get('/', function (req, res) {
  ReS(res, { service: 'Device Manager', isAlive: true })
})


/**
 * @api {post} /device/search Get devices
 * @apiName search devices
 * @apiGroup Device Manager
 * @apiDescription Get all devices for the specified search criteria
 */
router.post('/device/search', async function (req, res) {
  winston.debug('Fetching devices for Tenant Id: ' + req.user.tenantId);
  let filter = {}

  for (var key in req.body) {
    if (key !== 'active' && key !== 'assetAttached') {
      filter[key] = { $regex: req.body[key], '$options': 'i' }
    } else {
      filter[key] = req.body[key]
    }

  }
  if (req.user.tenantId !== 'system') {
    filter.tenantId = req.user.tenantId
  }

  console.log(filter);

  // construct the helper object
  try {
    let devices = await Device.find(filter).sort({_id:-1});
    winston.debug('Devices for tenant ' + filter.tenantId + ' retrieved');
    ReS(res, { header: 'Devices', data: devices }, 200)
  } catch (err) {
    winston.error('Error getting Devices: ' + err.message);
    ReE(res, { message: "Error retrieving Devices" }, 400)
  }
});


/**
 * @api {get} /device/getactivedevices Get available active devices
 * @apiName API Devicelist Info
 * @apiGroup Device Manager
 * @apiParam {String} :tenantid.
 * @apiDescription Get List of devices available for tenant
 */
router.get('/device/getactivedevices', async function (req, res) {

  winston.debug('invoking getActiveDevices')

  var params = {
    active: 'true'
  }

  if (req.user.tenantId !== 'system') {
    params.tenantId = req.user.tenantId
  }

  try {
    // construct the helper object
    let db = await DB.Get()
    let devices = await Device.find(params)
    ReS(res, { header: 'Devices', data: devices }, 200)
  } catch (err) {
    winston.error('Error in retrieving active devices ' + err.message)
    ReE(res, { message: "Error retrieving active  Devices" }, 400)
  }

})

/**
* @api {post} /device Create Device
* @apiName createDevice
* @apiGroup Device Manager
* @apiDescription Create a Device
* @apiParam {Object} Device Object.
*/
router.post('/createdevice', async function (req, res) {
  var device = req.body

  let err, thing, result;
  if (!device.tenantId) {
    device.tenantId = req.user.tenantId
  }
  // set active param
  device.active = 'false';
  winston.info('invoked create device manager')
  try {

    if (
      !device.devName ||
      !device.tenantId ||

      !device.hardwareID
    ) {
console.log(JSON.stringify(device))
      throw new Error('Invalid param')
    }

    let maxDevId = await Device.findOne({}).sort('-devId').select('devId -_id');
    device.devId = maxDevId.devId + 1;

//      device.devId = 1000001;
    [err, thing] = await to(Device.create(device));

    if (err) {
      throw new Error('Error in inserting Device: ' + err.message)
    }

    let attrVal = JSON.parse(device.attributes);
    attrVal.TenantId = device.tenantId.toString();
    attrVal.DeviceId = device.devId.toString();
    attrVal.hardwareID = device.hardwareID;

    device.attributes = JSON.stringify(attrVal);
console.log( JSON.stringify(device))
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
 * @api {put} /device/:deviceName Update Device information
 * @apiName API Update Device
 * @apiGroup Device Manager
 * @apiParam {String}:deviceName.
 * @apiDescription ADD & Update device attributes
 */
router.put('/device/:deviceName', async function (req, res) {
  let err, thing, result;
  winston.info('invoked update device')
  try {
    if (
      !req.params.deviceName ||
      !req.user.tenantId ||
      !req.body.hardwareID ||
      !req.body.attributes
    ) {
      throw new Error('Invalid param')
    }

    let params = { devName: req.params.deviceName };
    if (!req.body.tenantId) {
      params.tenantId = req.user.tenantId
    } else {
      params.tenantId = req.body.tenantId
    }


    [err, thing] = await to(Device.find(params))
    if (err) {
      throw new Error('Error in retrieving Device: ' + err.message)
    }
    if (!thing) {
      throw new Error('Device not found')
    }

    let devicething = thing[0]

    devicething.attributes = req.body.attributes
    let updatedThing = await awshelper.Updatething(devicething);

    result = await Device.updateOne(params, { attributes: req.body.attributes });
    winston.log('result: ' + result);
    ReS(res, { header: 'Device Updated' }, 200)

  } catch (err) {
    winston.error('Error in Device Updation: ' + err.message)
    ReE(res, { message: "Error updating Device" }, 400)
  }
})





/**
 * @api {get} /Device/getdevicecertificate/:deviceName get device certificate
 * @apiName API Download Certificates
 * @apiGroup Device Manager
 * @apiParam {String} :deviceName.
 * @apiDescription Download Certificates for device
 */
router.get('/device/getdevicecertificate/:deviceTenant/:deviceName', async function (req, res) {
  winston.info('invoked cert download')
  try {
    if (
      !req.params.deviceName ||
      !req.params.deviceTenant ||
      !req.user.tenantId
    ) {
      throw new Error('Invalid param')
    }

    var options = {
      devName: req.params.deviceName
    }

    if (req.params.deviceTenant === 0) {
      options.tenantId = req.user.tenantId
    } else {
      options.tenantId = req.params.deviceTenant
    }

    winston.log(options)
    let cert = await awshelper.DeviceCertURLs(options);

    ReS(res, { header: 'Device deactivated', data: cert }, 200)
  } catch (err) {
    winston.error('Error in certificate download: ' + err.message)
    ReE(res, { message: "Error in certificate download" }, 400)
  }
})


/**
 * @api {post} /device/deactivate Deactivate a device
 * @apiName API Deactivate Device
 * @apiGroup Device Manager
 * @apiParam
 * @apiDescription Deactivate a Thing(device) certificate
 */
router.post('/device/deactivate', async function (req, res) {
  let device = req.body
  if (!device.tenantId) {
    device.tenantId = req.user.tenantId
  }
  try {
    if (
      !device.devName ||
      !device.tenantId ||
      !device.devType
    ) {
      throw new Error('Invalid param')
    }
console.log(JSON.stringify(device))
    let retrive = await Device.find({ devName: device.devName, tenantId: device.tenantId })
   console.log(retrive)
    await awshelper.Deactivatething(retrive[0])
    await Device.update({ devName: device.devName, tenantId: device.tenantId }, { $set: { active: 'false' } })
    ReS(res, { header: 'Device deactivated' }, 200)
  } catch (err) {
    winston.error('Error in device deactivation: ' + err.message)
    ReE(res, { message: "Error in device deactivation" }, 400)

  }
})


/**
 * @api {post} /device/activate Activate Device
 * @apiName API Activate Device
 * @apiGroup Device Manager
 * @apiParam
 * @apiDescription Activate a Thing(device) certificate
 */
router.post('/device/activate', async function (req, res) {
  let device = req.body
  if (!device.tenantId) {
    device.tenantId = req.user.tenantId
  }
  try {
    if (
      !device.devName ||
      !device.tenantId ||
      !device.devType
    ) {
      winston.error('Missing param: device.devName : ' + device.devName
        + ', device.tenantId: ' + device.tenantId
        + ', device.devType: ' + device.devType)
      throw new Error('Invalid param')
    }
    let retrive = await Device.find({ devName: device.devName, tenantId: device.tenantId })

    await awshelper.Activatething(retrive[0])
    await Device.update({ devName: device.devName, tenantId: device.tenantId }, { $set: { active: 'true' } })
    ReS(res, { header: 'Device Activated' }, 200)
  } catch (err) {
    winston.error('Error in device activation: ' + err.message)
    ReE(res, { message: "Error in device activation" }, 400)
  }
})


/**
 * @api {post} /device/updatedeviceShadow Update shadow information
 * @apiName API Update Shadow(Device)
 * @apiGroup Device Manager
 * @apiParam {String} :tenantid,{String} :deviceName.
 * @apiDescription To update the shadow information of (device) certificate
 */
router.post('/updatedeviceShadow', async function (req, res) {
  let input = req.body
  if (!input.tenantId) {
    input.tenantId = req.user.tenantId
  }


  if (input.devName && input.deviceDocument && input.tenantId && input.deviceTypeKeys) {
    try {
      // construct the helper object
      // let db = await DB.Get()
console.log(JSON.stringify(input));
      let retrive = await Device.find({ devName: input.devName, tenantId: input.tenantId })
console.log(retrive);
      if (retrive.length === 1) {
        let data = await awshelper.updatedeviceShadow(input.devName, input.deviceDocument)
        let devTypeKeyObj = JSON.parse(input.deviceTypeKeys)
        await Device.updateOne(
          { devName: input.devName, tenantId: input.tenantId },
          { deviceTypeKeys: devTypeKeyObj }
        )
        ReS(res, { header: 'Shadow updated', data: data }, 200)
      } else {
        res.status(400).send({ Error: 'Device not found' })
      }
    } catch (err) {
      winston.error('Error Updating Device: ' + err.message);
      res.status(400).send({ Error: 'Error Updating Device' })
    }
  } else {
    res.status(400).send('{"Error" : "Invalid param"}')
  }
})

/**
 * @api {post} /device/ota/getgetImageStatus Get OTA Images
 * @apiName search ota images
 * @apiGroup Device Manager
 * @apiDescription Get all ota image files for the specified search criteria
 */
router.post('/device/ota/getImage', async function (req, res) {

  winston.debug('Fetching devices for Tenant Id: ' + req.user.tenantId);

  let filter = {}
  for (var key in req.body) {
    filter[key] = { $regex: req.body[key], '$options': 'i' }
  }
  if (req.user.tenantId !== 'system') {
    filter.tenantId = req.user.tenantId
  }

  // construct the helper object
  try {
    // construct the helper object
    let db = await DB.Get()
    let devices = await Image.find(filter)

    winston.debug('Images for tenant ' + req.user.tenantId + ' retrieved');

    ReS(res, { header: 'Images', data: devices }, 200)

  } catch (err) {
    winston.error('Error getting Images: ' + err.message);
    ReE(res, { message: "Error retrieving Images" }, 400)
  }

})



/**
 * @api {post} /device/ota/uploadImage upload firmware image file
 * @apiName API Upload Firmware Image(Device)
 * @apiGroup Device Manager
 * @apiParam 
 * @apiDescription To upload firmware image file
 */
router.post('/device/ota/uploadImage', async function (req, res) {
  var upload = req.body
  if (!upload.tenantId) {
    upload.tenantId = req.user.tenantId
  }

  try {
    if (
      !req.get('description') ||
      !req.get('version') ||
      !req.get('type')
    ) {
console.log("image upload invalid param")
      throw new Error('Invalid param')
    }
    let version = await Image.find({ version: req.get('version'), type: req.get('type'), tenantId: upload.tenantId })

    if (version.length > 0) {
      throw new Error('File Version for Type exists')
    }

    awshelper.UploadImages(req, upload.tenantId).then(
      async (fileData) => {
        fileData.description = req.get('description')
        fileData.version = req.get('version')
        fileData.type = req.get('type')
        console.log("data " + JSON.stringify(fileData))
        //remove today field as the timestamp is automatically inserted
        delete fileData['today'];
        // badru
        console.log("fileDate for image craetion: " + fileData)
        await Image.create(fileData)
        ReS(res, { header: 'Image created', data: fileData }, 200)
      }
    )

  } catch (err) {
console.log("image upload invalid param"+ err.message)
    winston.error('Error in Image upload: ' + err.message)
    ReE(res, { message: "Error in Image upload" }, 400)
  }
})



/**
 * @api {post} /device/ota/getStatus Get OTA Jobs
 * @apiName search ota jobs
 * @apiGroup Device Manager
 * @apiDescription Get all ota jobs for the specified search criteria
 */
router.post('/device/ota/getjob', async function (req, res) {
  winston.debug('Fetching jobs for Tenant Id: ' + req.user.tenantId);
  let filter = {}
  for (var key in req.body) {
    filter[key] = { $regex: req.body[key], '$options': 'i' }
  }

  if (req.user.tenantId !== 'system') {
    filter.tenantId = req.user.tenantId
  }

  // construct the helper object
  try {
    // construct the helper object
    let devices = await Job.find(filter)

    winston.debug('Images for tenant ' + req.user.tenantId + ' retrieved');
    ReS(res, { header: 'JObs', data: devices }, 200)

  } catch (err) {
    winston.error('Error getting Jobs: ' + err.message);
    ReE(res, { message: "Error retrieving Jobs" }, 400)
  }

})



/**
 * @api {get} /device/createJob Create OTA Job 
 * @apiName Create OTA Job for devices
 * @apiGroup Device Manager
 * @apiDescription This function creates an ota job for selected devices
 */
router.post('/device/ota/createJob', async function (req, res) {
  var image = req.body
  if (!image.tenantId) {
    image.tenantId = req.user.tenantId
  }

  try {
    if (
      !image.s3key ||
      !image.s3imageFileuuid ||
      !image.s3imageFilename ||
      !image.tenantId ||
      !image.devices ||
      !image.type
    ) {
      throw new Error('Invalid param')
    }
    let params = {
      s3imageFilename: image.s3imageFilename,
      s3imageFileuuid: image.s3imageFileuuid,
      tenantId: image.tenantId
    }

    let retrive = await Image.find(params)
    if (!retrive) {
      throw new Error('Image file not found')
    }

    params['s3key'] = image.s3key;
    var devices = image.devices.split(',')
    let arr = []
    let deviceNamearr = {}
    let deviceObj = {}
    winston.log(devices)
    let requests = devices.reduce((promiseChain, element) => {
      return promiseChain.then(
        async () => {
          // let deviceVal = await Device.find({ devName: element, tenantId: req.user.tenantId });
          let deviceVal = await Device.find({ devName: element });
          console.log('deviceVal : ' + JSON.stringify(deviceVal))
          deviceVal.map(item => {
            arr.push(item.thingArn)
            deviceObj[item.devName] = ''
          })
        }
      )
    }, Promise.resolve())

    requests.then(async () => {
      if (image.overwrite === false) {
        let retrive = await Job.find({
          otaUpdateStatus: { $nin: ['CREATE_COMPLETE', 'CREATE_FAILED'] },
          devices: { $in: arr }
        })
        if (retrive.length > 0) {
          throw new Error('Device already exists and cannot overwrite');
        }
      }
      winston.debug('arr: ' + arr)
      if (arr.length < 1) {
        throw new Error('Device not found')
      }
      winston.debug("params :: " + JSON.stringify(params))
      let OTAresult = {}
      OTAresult = await awshelper.CreateOTAJob(arr, params);
      OTAresult.devices = deviceObj
      OTAresult.tenantId = image.tenantId
      OTAresult.version = image.version
      OTAresult.type = image.type
      OTAresult.name = image.name
      OTAresult.desc = image.description
      await Job.create(OTAresult)
      let deviceDocument = "{\"state\":{\"desired\":{\"ota\":\"y\"}}}"
      const pArray = devices.map(async devName => {
        const response = await awshelper.updatedeviceShadow(devName, deviceDocument)
        return response;
      });

      const deviceShawdows = await Promise.all(pArray);

      ReS(res, { header: 'Job created', data: OTAresult }, 200)
    })
  } catch (err) {
    winston.error('Error in job craetion: ' + err.message)
    ReE(res, { message: "Error job creation" }, 400)
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

router.get('/deviceStatus/:I', async function (req, res) {
    try {
        let db = await DB.Get();
		
		let devicedtls = await DeviceDtl.findOne({"I" : req.params.I  },{},{ sort: { _id: -1 }, limit: 1 })
//.sort({_id : -1})

if(!devicedtls){
devicedtls = {I: req.params.I, M : 'No Data found for device' };
}


            res.json(devicedtls);

       
    }
    catch (err) {
        console.log(err);
        res.json(err.message);
    }
})

module.exports = router;


