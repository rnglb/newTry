process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const AWS = require('aws-sdk')
const fs = require('fs-extra')
const proxy = require('proxy-agent')
const AdmZip = require('adm-zip')
const uuidv1 = require('uuid/v1')
const formidable = require('formidable')
const path = require('path')

// Configure Environment
const configModule = require('../config-helper/config.js')
const configuration = configModule.configure(process.env.NODE_ENV)
// Configure Logging
const winston = require('winston')

winston.level = configuration.loglevel

// boschUp restricted credentials
AWS.config.update({
  "region": "ap-south-1"
})


AWS.config.apiVersions = {
  iotdata: '2015-05-28'
  // other service API versions
}

const iot = new AWS.Iot()

let allThings = {}

module.exports.Activatething = async function (input) {
  try {
    winston.info('activate input.certificateid ' + input.certId);
    let updatecert = await iot.updateCertificate({
      certificateId: input.certId, /* required */
      newStatus: 'ACTIVE'
    }).promise();
    return updatecert;

  } catch (e) {
    winston.debug(e, e.stack);
  }

}

module.exports.Deactivatething = async function (input) {
  try {
    winston.info('deactivate input.certificateid ' + input.certId)
    return iot.updateCertificate({
      certificateId: input.certId, /* required */
      newStatus: 'INACTIVE'
    }).promise();
  
  } catch (e) {
    winston.debug(e, e.stack);
  }
}

module.exports.Updatething = async function (input) {
    console.log(input)
    console.log(input.attributes)
  
    let obj = JSON.parse(input.attributes)
    let params = {
      thingName: input.devName, /* required */
      attributePayload: {
        attributes: obj, merge: true
      },
      thingTypeName: input.devType
    }

    return iot.updateThing(param).promise();
  
}

module.exports.DeviceCertURLs = async function (input) {
  try {
    let s3 = new AWS.S3()
    let result = [];

    let getSignedUrl = function (key) {
      return new Promise((resolve, reject) => {
        let params = {
          Bucket: 'cmdevicecerts', // get from constant
          Key: key,
          Expires: 90 //seconds
        }
        s3.getSignedUrl('getObject', params, (err, url) => {
          if (err) reject(err)
          resolve(url);
        })
      });
    }
    let certStr = `${input.tenantId}/devices-certificates/${input.devName}/${input.devName}`;
    let certs = [];
    certs.push({ name: "certificate", key: certStr + ".crt" });
    certs.push({ name: "privatekey", key: certStr + ".key" });
    certs.push({ name: "publickey", key: certStr + ".public.key" });

    for (const ele of certs) {
      try {
        const signedUrl = await getSignedUrl(ele.key);
        result.push({ name: ele.name, url: signedUrl });
      } catch (err) {
         winston.debug('Error getting Signed URL from S3')
         winston.debug(err)
      }
    }
    return result;
  } catch (err) {
    winston.debug('Error getting certificate URL from S3')
    winston.debug(err)
  }
}

module.exports.DownloadCertificates = async function (input) {
  return new Promise(function (resolve, reject) {
    try {
      let s3 = new AWS.S3()
      // creating archives
      let zip = new AdmZip()
      let options = {
        Bucket: 'cmdevicecerts', // get from constant
        Key: `${input.tenantId}/${input.devName}/${input.devName}.crt`
      }
      console.log(JSON.stringify(options))
      const s3Promisecert = s3.getObject(options).promise()
      s3Promisecert.then((data) => {
        zip.addFile('certificate.crt', Buffer.alloc(data.Body.length, data.Body), 'certificate file')
        let options = {
          Bucket: 'cmdevicecerts', // get from constant
          Key: `${input.tenantId}/${input.devName}/${input.devName}.key`
        }
        console.log(JSON.stringify(options))
        const s3Promiseprivate = s3.getObject(options).promise()
        s3Promiseprivate.then((data) => {
          zip.addFile('private.key', Buffer.alloc(data.Body.length, data.Body), 'private key')
          let options = {
            Bucket: 'cmdevicecerts', // get from constant
            Key: `${input.tenantId}/${input.devName}/${input.devName}.public.key`
          }
          console.log(JSON.stringify(options))
          const s3Promisepublic = s3.getObject(options).promise()
          s3Promisepublic.then((data) => {
            zip.addFile('public.key', Buffer.alloc(data.Body.length, data.Body), 'public key')
            let buf = zip.toBuffer()
            resolve(buf)
          }).catch((err) => {
            console.log("public key error")
            winston.debug(err)
          })
        }).catch((err) => {
          console.log("private key error")
          winston.debug(err)
        })
      }).catch((err) => {
        console.log("cert error")
        winston.debug(err)
      })
    } catch (error) {
      console.log("major error")
      winston.debug(error)
    }
  }).catch((err) => {
    winston.debug('Error Downloading certificates from S3')
    winston.debug(err)
  })
}

module.exports.DeleteCertificates = async function (tenantId, deviceId) {
  let bucket = 'cmdevicecerts'// get from constant
  let dir = `${tenantId}/${deviceId}/`
  let listParams = {
    Bucket: bucket,
    Prefix: dir
  }
  let s3 = new AWS.S3()
  let listedObjects = await s3.listObjectsV2(listParams).promise()

  /* if (listedObjects.Contents.length === 0) return; */

  let deleteParams = {
    Bucket: bucket,
    Delete: { Objects: [] }
  }

  listedObjects.Contents.forEach(({ Key }) => {
    deleteParams.Delete.Objects.push({ Key })
  })
  await s3.deleteObjects(deleteParams).promise()

  // if (listedObjects.Contents.IsTruncated) await DeleteCertificates(bucket, dir);
}

module.exports.Deletething = function (input) {
  return new Promise(function (resolve, reject) {
    iot.detachPrincipalPolicy({
      policyName: input.policyname, /* required */
      principal: input.principal /* required */
    }, (epp, dpp) => {
      if (epp) winston.info(epp, epp.stack) // an error occurred
      else {
        iot.detachThingPrincipal({
          principal: input.principal, /* required */
          thingName: input.devName /* required */
        }, (etp, dtp) => {
          if (etp) winston.info(etp, etp.stack) // an error occurred
          else {
            iot.updateCertificate({
              certificateId: input.certId, /* required */
              newStatus: 'INACTIVE'
            }, (ec, dc) => {
              if (ec) winston.info(ec, ec.stack) // an error
              // occurred
              else {
                iot.deleteCertificate({
                  certificateId: input.certId, /* required */
                  forceDelete: true
                }, (ec, dc) => {
                  if (ec) winston.info(ec, ec.stack) // an
                  // error
                  // occurred
                  else {
                    iot.deletePolicy({
                      policyName: input.policyname /* required */
                    }, (ed, dp) => {
                      if (ed) winston.info(ed, ed.stack) // an
                      // error
                      // occurred
                      else {
                        iot.deleteThing({
                          thingName: input.devName /* required */
                          /* expectedVersion: 0 */
                        }, (et, dt) => {
                          if (et) winston.info(et, et.stack) // an
                          // error
                          // occurred
                          else {
                            resolve(dt)
                          }
                        })
                      }
                    })
                  }
                })
              }
            })
          }
        })
      }
    })
  }).catch((err) => {
    winston.debug(err)
  })
}

module.exports.Creatething = async function (input) {
 let thing={}
  winston.debug('input.attributes ::')
    winston.debug(input.attributes)
    let obj
    try {
      obj = JSON.parse(input.attributes)
    } catch (error) {
      obj = { '': '' }
    }

    let device = {
      thingName: input.devName, /* required */
      attributePayload: {
        attributes: obj,
        merge: false
      },
      thingTypeName: input.devType
    }
  let policyDocument = "{ \"Version\": \"2012-10-17\", \"Statement\": [{ \"Effect\": \"Allow\", \"Action\":[\"iot:Publish\",\"iot:Subscribe\",\"iot:Connect\",\"iot:Receive\"], \"Resource\": [\"*\"] }, { \"Effect\": \"Allow\", \"Action\": [\"iot:Connect\"], \"Resource\": [\"*\"] }] }"
  let d,c,policy,principal,atp,act,upload,error;
  console.log('before create thing')
    try {
      
       [error,d]= await to((iot.createThing(device)).promise());
      console.log(error);
      if(d){
        console.log('thing created');
        allThings[d.thingName] = d;
        let policyname = d.thingName + '_' + uuidv1() + '_Policy';
        [error,c] =await to((iot.createKeysAndCertificate({ setAsActive: true })).promise());
        if(c){
          console.log('key & certificate generated');
          [error,policy]=await to((iot.createPolicy({policyDocument: policyDocument,policyName: policyname})).promise());
          console.log('Policy created');
        }
        
        if(policy){
          [error,principal]=await to((iot.attachPrincipalPolicy({policyName: policyname,principal: c.certificateArn})).promise());
          console.log('principal Attached');
        }
        
        if(principal){
          [error,atp]=await to((iot.attachThingPrincipal({principal: c.certificateArn,thingName: d.thingName})).promise());
          console.log('Thing attached');
        }
        if(atp){
          [error,act]=await to((iot.acceptCertificateTransfer({certificateId: c.certificateId,setAsActive: true})).promise());
          console.log('Certificate transferred');
        }
        
        if(act){
          [error,upload]=await to((uploadCertificatesToS3(input.tenantId, d.thingName, c)).promise());
          console.log('Uploaded');
        }
        if(upload)
          winston.info('upload Complete.');
        c.thingArn = d.thingArn;
        c.thingId = d.thingId;
        c.policyname = policyname;
        thing=c;
        //console.log(JSON.stringify(c));
        console.log('Error:'+JSON.stringify(error));
        }
      return thing;
    } catch (error) {
      winston.debug(error);
    }
 
}

module.exports.getJobstatusCron = async function (otaUpdateId) {
  return new Promise(function (resolve, reject) {
    let params = {
      otaUpdateId: otaUpdateId /* required */
    }
    iot.getOTAUpdate(params, function (err, data) {
      if (err) {
        winston.debug(err, err.stack) // an error occurred
        resolve('error')
      } else {
        resolve(data.otaUpdateInfo.otaUpdateStatus) // successful response
      }
    })
  }).catch((err) => {
    winston.debug(err)
  })
}

module.exports.getJobIdArnCron = async function (otaUpdateId) {
  return new Promise(function (resolve, reject) {
    let params = {
      otaUpdateId: otaUpdateId /* required */
    }
    iot.getOTAUpdate(params, function (err, data) {
      if (err) {
        winston.debug(err, err.stack) // an error occurred
        resolve('error')
      } else {
        let returner = {}
        returner.awsIotJobId = data.otaUpdateInfo.awsIotJobId
        returner.awsIotJobArn = data.otaUpdateInfo.awsIotJobArn

        resolve(returner) // successful response
      }
    })
  }).catch(err => {
    winston.debug(err)
  })
}
module.exports.updateEventconfig = async function (data) {
  return new Promise(function (resolve, reject) {
    winston.debug('updateEvent :: ' + data)
    var params = {
      eventConfigurations: {
        'JOB_EXECUTION': {
          Enabled: true
        }
      }
    }
    iot.updateEventConfigurations(params, function (err, data) {
      if (err) {
        winston.debug(err, err.stack) // an error occurred
        resolve('error')
      } // an error occurred
      else {
        resolve(data) // successful response
      }
    })
  })
}

module.exports.updatedeviceShadow = async function (deviceName, document) {
  return new Promise(function (resolve, reject) {
    winston.debug('updateEvent :: ' + deviceName)
    winston.debug('updateEvent document :: ' + document)
    var param1 = {
      'reported': { 'temp': 55 }
    }
    let buf = Buffer.from(JSON.stringify(param1))

    var params = {
      payload: document, /* required */ /* Strings will be Base-64 encoded on your behalf */
      thingName: deviceName /* required */
    }

    iotdata.updateThingShadow(params, function (err, data) {
      if (err) {
        winston.debug(err, err.stack) // an error occurred
        resolve('error')
      } else {
        // an error occurred
        resolve(data) // successful response
      }
    })
  })
}

module.exports.getOTAstatusCron = async function (otaJobId, thingname) {
  return new Promise(function (resolve, reject) {
    let params = {
      jobId: otaJobId,
      /* required */
      thingName: thingname
      /* required */
    }
    iot.describeJobExecution(params, function (err, data) {
      if (err) {
        winston.debug(err, err.stack) // an error occurred
        resolve('error')
      } else {
        resolve(data.execution.status) // successful response
      }
    })
  }).catch((err) => {
    winston.debug(err)
  })
}

function uploadCertificatesToS3(tenantId, deviceId, certsData) {
  console.log('Before Upload Certificate')
  return Promise.all([
    new Promise(function (resolve, reject) {
      let base64data = new Buffer(certsData.certificatePem, 'binary')
      let s3 = new AWS.S3()
      s3.putObject({
        Bucket: 'cmdevicecerts',
        Key: `${tenantId}/${deviceId}/${deviceId}.crt`,
        Body: base64data
      }, function (err, data) {
        if (err) winston.info('Error S3', deviceId)
      })
    }),
    new Promise(function (resolve, reject) {
      let base64data = new Buffer(certsData.keyPair.PrivateKey, 'binary')
      let s3 = new AWS.S3()
      s3.putObject({
        Bucket: 'cmdevicecerts',
        Key: `${tenantId}/${deviceId}/${deviceId}.key`,
        Body: base64data
      }, function (err, data) {
        if (err) winston.info('Error S3', deviceId)
      })
    }),
    new Promise(function (resolve, reject) {
      let base64data = new Buffer(certsData.keyPair.PublicKey, 'binary')
      let s3 = new AWS.S3()
      s3.putObject({
        Bucket: 'cmdevicecerts',
        Key: `${tenantId}/${deviceId}/${deviceId}.public.key`,
        Body: base64data
      }, function (err, data) {
        if (err) winston.info('Error S3', deviceId)
      })
    })
  ])
}

function createReadStream(filename) {
  return new Promise(function (resolve, reject) {
    function onError(err) {
      reject(err)
    }

    function onReadable() {
      cleanup()
      resolve(stream)
    }

    function cleanup() {
      stream.removeListener('readable', onReadable)
      stream.removeListener('error', onError)
    }

    var stream = fs.createReadStream(filename)
    stream.on('error', onError)
    stream.on('readable', function () {
      resolve(stream)
    })
  })
}

function uploadImagetoToS3(tenantId, today, uniqueId, fileName, directory) {
  return Promise.all([
    new Promise(function (resolve, reject) {
      winston.debug('tenant ' + tenantId)
      winston.debug('fileName ' + fileName)
      winston.debug('directory ' + directory)
      winston.debug('uniqueId ' + uniqueId)
      // let base64data = fs.createReadStream(path.join(directory, fileName));
      winston.debug('uploading from folder :: ' + path.join(directory, fileName))
      fs.readFile(path.join(directory, fileName),
        { 'encoding': 'binary' },
        function (err, data) {
          if (err) {
            winston.info(err)
          } else {
            var contents = data
            let base64data = new Buffer(contents, 'binary')
            let s3 = new AWS.S3()
            let params = {
              Bucket: 'otaupdatefiles',
              Key: `${tenantId}/devices-images/${today}/${uniqueId}/${fileName}`,
              Body: base64data
            }
            let s3options = { partSize: 10 * 1024 * 1024, queueSize: 1 }

            s3.upload(params, s3options, function (err, data) {
              if (err) {
                winston.debug(err)
                winston.info('Error S3')
                reject(err)
              }
            }).promise().then(function (values) {
              resolve(params.Key)
            })
          }
        })
    })
  ])
}

// for greengrass
module.exports.AddDevicestoGatewayGroup = async function (input) {
  return new Promise(function (resolve, reject) {
    greengrass.createDeviceDefinition({
      Name: input.deviceName + '_Definition'
    }, (CDDER, CDD) => {
      if (CDDER) {
        winston.info(CDDER)
      } else {
        let jsonarr = []
        new Promise(function (resolve, reject) {
          input.forEach(function (element, index, initialArray) {
            var item = {}
            item['CertificateArn'] = element.principal
            item['Id'] = String(index)
            item['SyncShadow'] = true
            item['ThingArn'] = element.thingArn
            jsonarr.push(item)
          })
          resolve()
        }).then(function (values) {
          let params = {
            DeviceDefinitionId: CDD.Id, /* required */
            Devices: jsonarr
          }
          greengrass.createDeviceDefinitionVersion(params, (CDDVER, CDDV) => {
            if (CDDVER) {
              winston.info(CDDVER, CDDVER.stack)
            } else {
              winston.info('new')
              CDDV.DeviceDefinitionId = CDD.Id
              resolve(CDDV)
            }
          })
        })
      }
    })
  }).catch((err) => {
    winston.debug(err)
  })
}

module.exports.CreateOTAJob = async function (arr, param) {
  return new Promise(function (resolve, reject) {
    let OTAupdateuniqueId = uuidv1()
    let streamIduniqueId = uuidv1()
    let targets = arr
    let filename = param.s3imageFilename
    winston.info(':: ' + param.s3key)
    var streamparams = {
      files: [ /* required */
        {
          fileId: 0,
          s3Location: {
            bucket: 'otaupdatefiles', /* required */
            // key: `${param.tenantId}/devices-images/${param.dateFolder}/${param.s3imageFileuuid}/${param.s3imageFilename}` /* required */
            key: param.s3key
          }
        }
        /* more items */
      ],
      roleArn: 'arn:aws:iam::169679812726:role/IOT_ALL', /* required */
      streamId: streamIduniqueId, /* required */
      description: 'Get file as stream'
    }

    iot.createStream(streamparams, function (strerr, strdata) {
      if (strerr) {
        winston.info('strerr, strerr.stack')
        winston.info(strerr, strerr.stack)
        resolve('err')
      }// an error occurred
      else {
        winston.info(': :3s-1: :')
        iot.createOTAUpdate({
          files: [ /* required */
            {
              fileName: filename,
			   fileLocation: {
				  stream: {
					fileId: 0,
					streamId: strdata.streamId
				  }
			   }
            }
            /* more items */
          ],
          otaUpdateId: OTAupdateuniqueId, /* required */
          roleArn: 'arn:aws:iam::169679812726:role/IOT_ALL', /* required */
          targets: targets,
          description: 'OTA UPDATE ',
          targetSelection: 'SNAPSHOT'
        }, function (OTAerr, OTAdata) {
          if (OTAerr) {
            winston.info('OTAerr, OTAerr.stack')
            winston.info(OTAerr, OTAerr.stack)
            resolve('err')
          }// an error occurred
          else {
            iot.getOTAUpdate({
              otaUpdateId: OTAdata.otaUpdateId /* required */
            }, function (err, GOTAdata) {
              if (err) {
                winston.info(err, err.stack)
              } // an error occurred
              else {
                winston.info('success OTA' + GOTAdata) // successful response
                winston.info('success OTA jobid' + GOTAdata.otaUpdateInfo.awsIotJobId) // successful respons
                winston.info('OTAdata.otaUpdateId' + OTAdata.otaUpdateId) // successful respons

                OTAdata.jobId = GOTAdata.otaUpdateInfo.awsIotJobId
                OTAdata.jobArn = GOTAdata.otaUpdateInfo.awsIotJobArn

                resolve(OTAdata)
              }
            })
          }
        })
      }
    })
  }).catch((err) => {
    winston.debug(err)
  })
}

module.exports.UploadImages = async function (req, tenantId) {
  return new Promise(async function (resolve, reject) {
    // create an incoming form object
    var form = new formidable.IncomingForm()
    let filename
    let uniqueId
    let resolver = {}
    let d = new Date()
    let today = d.getDate() + '-' + (d.getMonth() + 1) + '-' + d.getFullYear()
    console.log("inside aws helper req: " + req)
    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = true
    // store all uploads in the /uploads directory
    // every time a file has been uploaded successfully,
    // rename it to it's orignal name
    form.parse(req).on('file', async function (field, file) {
      //  console.log('Got file:', name)
      // specify that we want to allow the user to upload multiple files in a single request
      //  form.multiples = true;
      // store all uploads in the /uploads directory locally
      form.uploadDir = path.join(__dirname, '/uploads')
      uniqueId = uuidv1()
      filename = file.name
      fs.rename(file.path, path.join(form.uploadDir, file.name), (err) => {
        if (err) {
          winston.info('error' + err)
        } else {
          new Promise(function (resolve, reject) {
            resolver.fileName = filename
            resolver.uniqueId = uniqueId
            resolver.today = today
            resolver.tenantId = tenantId
            resolve()
          })
        }
      })
      // tenantId, deviceId, uniqueId, fileName,directory
    }).on('error', function (err) {
      winston.debug(err)
      resolve('error')
    }).on('end', function () {
      new Promise(function (resolve, reject) {
        uploadImagetoToS3(tenantId, today, uniqueId, filename, form.uploadDir).then(function (filekey) {
          console.log("fileKey :" + filekey)
          resolve(filekey)
        })
      }).then(function (filekey) {
        console.log("fileKey :" + filekey)
        resolver.s3key = filekey;
        resolve(resolver)
      })
    })
  }).catch((err) => {
    winston.debug(err)
    resolve('error');
  })
}

module.exports.UpdateDevicestoGatewayGroup = async function (gatewayinput, input, action) {
  return new Promise(function (resolve, reject) {
    let deviceName
    let thingArn
    input.map((item) => {
      deviceName = item.deviceName
      thingArn = item.thingArn
    })

    greengrass.getDeviceDefinitionVersion({
      DeviceDefinitionId: gatewayinput.DeviceDefinitionId,
      DeviceDefinitionVersionId: gatewayinput.DeviceDefinitionVersionId
    }, (GDDER, GDD) => {
      if (GDDER) {
        winston.info(GDDER)
      } else {
        greengrass.createDeviceDefinition({
          Name: deviceName + '_Definition'
        }, (CDDER, CDD) => {
          if (CDDER) {
            winston.info(CDDER)
          } else {
            let jsonarr = []
            new Promise(function (resolve, reject) {
              if (action === 'Delete') {
                for (var key in GDD) {
                  if ((GDD.hasOwnProperty(key))) {
                    if (key.toString() === 'Definition') {
                      for (var newkey in GDD[key]) {
                        GDD[key][newkey].forEach((someval, somekey) => {
                          if (thingArn !== someval['ThingArn']) {
                            var item = {}
                            item['CertificateArn'] = someval['CertificateArn']
                            item['Id'] = String(somekey)
                            item['SyncShadow'] = true
                            item['ThingArn'] = someval['ThingArn']
                            jsonarr.push(item)
                          }

                          /* for (const finalkey of Object.keys(someval)) {
                                                        winston.info(finalkey, someval[finalkey]);
                                                    } */
                        })
                      }
                    }
                  }
                }
                resolve()
              } else {
                let counter = 0
                for (var GDDkey in GDD) {
                  if ((GDD.hasOwnProperty(GDDkey))) {
                    if (GDDkey.toString() === 'Definition') {
                      for (var GDDnewkey in GDD[GDDkey]) {
                        GDD[GDDkey][GDDnewkey].forEach((someval, somekey) => {
                          if (thingArn !== someval['ThingArn']) {
                            var item = {}
                            item['CertificateArn'] = someval['CertificateArn']
                            item['Id'] = String(++counter)
                            item['SyncShadow'] = true
                            item['ThingArn'] = someval['ThingArn']
                            jsonarr.push(item)
                          }
                        })
                      }
                    }
                  }
                }
                input.forEach(function (element, index, initialArray) {
                  var item = {}
                  item['CertificateArn'] = element.principal
                  item['Id'] = String(++counter)
                  item['SyncShadow'] = true
                  item['ThingArn'] = element.thingArn
                  jsonarr.push(item)
                })
                resolve()
              }
            }).then(function (values) {
              let params = {
                DeviceDefinitionId: CDD.Id, /* required */
                Devices: jsonarr
              }
              greengrass.createDeviceDefinitionVersion(params, (CDDVER, CDDV) => {
                if (CDDVER) {
                  winston.info(CDDVER, CDDVER.stack)
                } else {
                  winston.info('new')
                  CDDV.DeviceDefinitionId = CDD.Id
                  resolve(CDDV)
                }
              })
            })
          }
        })
      }
    })
  }).catch((err) => {
    winston.debug(err)
  })
}

module.exports.UpdateSubscriptionFordevices = async function (gatewayinput, input, action) {
  return new Promise(function (resolve, reject) {
    //  CreateNewSubscriptionFordevices
    let deviceName
    let thingArn
    input.map((item) => {
      winston.info(item.deviceName)
      winston.info(item.thingArn)
      deviceName = item.deviceName
      thingArn = item.thingArn
    })

    greengrass.getSubscriptionDefinitionVersion({
      SubscriptionDefinitionId: gatewayinput.SubscriptionDefinitionId, /* required */
      SubscriptionDefinitionVersionId: gatewayinput.SubscriptionDefinitionVersionId /* required */
    }, (GSDVER, GSDV) => {
      if (GSDVER) {
        winston.info(GSDVER)
      } else {
        greengrass.createSubscriptionDefinition({
          Name: deviceName + '_Definition'
        }, (CSDER, CSD) => {
          if (CSDER) {
            winston.info(CSDER)
          } else {
            let jsonarrsub = []
            new Promise(function (resolve, reject) {
              if (action === 'Delete') {
                for (let key in GSDV) {
                  if ((GSDV.hasOwnProperty(key))) {
                    if (key.toString() === 'Definition') {
                      let counter = 0
                      for (let newkey in GSDV[key]) {
                        GSDV[key][newkey].forEach((someval, somekey) => {
                          let sub = '/' + deviceName + 'topic/update'
                          if (sub !== someval['Subject']) {
                            var item = {}
                            item['Id'] = String(++counter)
                            item['Source'] = someval['Source']
                            item['Subject'] = someval['Subject']
                            item['Target'] = someval['Target']
                            jsonarrsub.push(item)
                          }

                          /* for (const finalkey of Object.keys(someval)) {
                                                        winston.info(finalkey, someval[finalkey]);
                                                    } */
                        })
                      }
                    }
                  }
                }
                resolve()
              } else {
                let counter = 0
                input.forEach(function (element, index, initialArray) {
                  for (let i = 0; i < 2; i++) {
                    var item = {}
                    if (i < 1) {
                      item = {}
                      item['Id'] = String(++counter)
                      item['Source'] = 'cloud'
                      item['Subject'] = '/' + deviceName + 'topic/update'
                      item['Target'] = element.thingArn
                      jsonarrsub.push(item)
                    } else {
                      item = {}
                      item['Id'] = String(++counter)
                      item['Source'] = element.thingArn
                      item['Subject'] = '/' + deviceName + 'topic/update'
                      item['Target'] = 'cloud'
                      jsonarrsub.push(item)
                    }
                  }
                })
                for (let key in GSDV) {
                  if ((GSDV.hasOwnProperty(key))) {
                    if (key.toString() === 'Definition') {
                      for (let newkey in GSDV[key]) {
                        GSDV[key][newkey].forEach((someval, somekey) => {
                          if (thingArn !== someval['Target'] && thingArn !== someval['Source']) {
                            var item = {}
                            item['Id'] = String(++counter)
                            item['Source'] = someval['Source']
                            item['Subject'] = someval['Subject']
                            item['Target'] = someval['Target']
                            jsonarrsub.push(item)
                          }
                        })
                      }
                    }
                  }
                }
                resolve()
              }
            }).then(function (values) {
              let params = {
                SubscriptionDefinitionId: CSD.Id, /* required */
                Subscriptions: jsonarrsub
              }
              winston.debug(params)
              greengrass.createSubscriptionDefinitionVersion(params, (CSDVER, CSDV) => {
                if (CSDVER) {
                  winston.info(CSDVER, CSDVER.stack)
                } else {
                  winston.info('new')
                  CSDV.SubscriptionDefinitionId = CSD.Id
                  resolve(CSDV)
                }
              })
            })
          }
        })
      }
    })
  }).catch((err) => {
    winston.debug(err)
  })
}

module.exports.CreateNewSubscriptionFordevices = async function (input) {
  return new Promise(function (resolve, reject) {
    // CreateNewSubscriptionFordevices
    let deviceName
    let thingArn
    input.map((item) => {
      winston.info(item.deviceName)
      winston.info(item.thingArn)
      deviceName = item.deviceName
      thingArn = item.thingArn
    })
    greengrass.createSubscriptionDefinition({
      Name: deviceName + '_Definition'
    }, (CSDER, CSD) => {
      if (CSDER) {
        winston.info(CSDER)
      } else {
        let jsonarrsub = []
        new Promise(function (resolve, reject) {
          let counter = 0
          input.forEach(function (element, index, initialArray) {
            for (var i = 0; i < 2; i++) {
              var item = {}
              if (i < 1) {
                item = {}
                item['Id'] = String(++counter)
                item['Source'] = 'cloud'
                item['Subject'] = '/' + element.deviceName + 'topic/update'
                item['Target'] = element.thingArn
                jsonarrsub.push(item)
              } else {
                item = {}
                item['Id'] = String(++counter)
                item['Source'] = element.thingArn
                item['Subject'] = '/' + element.deviceName + 'topic/update'
                item['Target'] = 'cloud'
                jsonarrsub.push(item)
              }
            }
          })
          resolve()
        }).then(function (values) {
          let params = {
            SubscriptionDefinitionId: CSD.Id, /* required */
            Subscriptions: jsonarrsub
          }
          winston.debug(params)
          greengrass.createSubscriptionDefinitionVersion(params, (CSDVER, CSDV) => {
            if (CSDVER) {
              winston.info(CSDVER, CSDVER.stack)
            } else {
              winston.info('new')
              CSDV.SubscriptionDefinitionId = CSD.Id
              resolve(CSDV)
            }
          })
        })
      }
    })
  }).catch((err) => {
    winston.debug(err)
  })
}

module.exports.UpdateGatewayGroup = async function (input) {
  return new Promise(function (resolve, reject) {
    var Obj = {}
    if (input.GroupId) Obj['GroupId'] = input.GroupId
    if (input.CoreDefinitionVersionArn) Obj['CoreDefinitionVersionArn'] = input.CoreDefinitionVersionArn
    if (input.DeviceDefinitionVersionArn) Obj['DeviceDefinitionVersionArn'] = input.DeviceDefinitionVersionArn
    if (input.FunctionDefinitionVersionArn) Obj['FunctionDefinitionVersionArn'] = input.FunctionDefinitionVersionArn
    if (input.LoggerDefinitionVersionArn) Obj['LoggerDefinitionVersionArn'] = input.LoggerDefinitionVersionArn
    if (input.ResourceDefinitionVersionArn) Obj['ResourceDefinitionVersionArn'] = input.ResourceDefinitionVersionArn
    if (input.SubscriptionDefinitionVersionArn) Obj['SubscriptionDefinitionVersionArn'] = input.SubscriptionDefinitionVersionArn
    winston.debug(JSON.stringify(Obj))
    greengrass.createGroupVersion(Obj, function (err, ccv) {
      if (err) winston.debug(err, err.stack)
      else {
        resolve(ccv)
      }
    })
  }).catch((err) => {
    winston.debug(err)
  })
}

module.exports.UpdateDeployment = async function (input, deploymentType) {
  return new Promise(function (resolve, reject) {
    greengrass.createDeployment({
      GroupId: input.GroupId,
      DeploymentId: input.DeploymentId,
      DeploymentType: deploymentType,
      GroupVersionId: input.GroupVersionId
    }, (err, data) => {
      if (err) winston.debug(err, err.stack) // an error occurred
      else {
        // successful response
        resolve(data)
      }
    })
  }).catch((err) => {
    winston.debug(err)
  })
}

module.exports.CreateGatewayGroup = async function (input) {
  return new Promise(function (resolve, reject) {
    let obj = JSON.parse(input.attributes)
    let param = {
      Name: input.groupName
    }
    try {
      greengrass.createGroup(param, (err, CG) => {
        if (err) {
          winston.info(err)
        } else {
          iot.createThing({
            thingName: input.deviceName, /* required */
            attributePayload: {
              attributes: obj,
              merge: false
            },
            thingTypeName: input.deviceType
          }, (err, d) => {
            if (err) {
              winston.info(err)
            } else {
              allThings[d.thingName] = d
              iot.createKeysAndCertificate({ setAsActive: true }, (e, c) => {
                if (e) {
                  winston.info(e)
                } else {
                  /*
                                     * fs.writeFile(`certs/${d.thingName}.pem`,
                                     * c.certificatePem, (ef, f) => { if (ef) throw ef;
                                     * }); fs.writeFile(`certs/${d.thingName}priv.key`,
                                     * c.keyPair.PrivateKey, (ef, f) => { if (ef) throw
                                     * ef; });
                                     * fs.writeFile(`certs/${d.thingName}public.key`,
                                     * c.keyPair.PublicKey, (ef, f) => { if (ef) throw
                                     * ef; });
                                     */
                  // c.certificateId
                  let policyname = d.thingName + '_' + uuidv1() + '_Policy'
                  iot.createPolicy({
                    policyDocument: input.policyType,
                    policyName: policyname
                  }, function (err, data) {
                    if (err) {
                      winston.info(err)
                    } else {
                      iot.attachPrincipalPolicy({
                        policyName: policyname,
                        principal: c.certificateArn
                      }, (ee, cc) => {
                        if (ee) {
                          winston.info(ee)
                        } else {
                          iot.attachThingPrincipal({
                            principal: c.certificateArn,
                            thingName: d.thingName
                          }, (prerr, prdata) => {
                            if (prerr) {
                              winston.info(prerr)
                            } else {
                              iot.acceptCertificateTransfer({
                                certificateId: c.certificateId,
                                setAsActive: true
                              }, (ce, cd) => {
                                if (err) {
                                  winston.info(err)
                                } else {
                                  winston.info('cert activated.')
                                  uploadCertificatesToS3(input.tenantId, d.thingName, c)
                                  winston.info('upload Complete.')
                                  c.policyname = policyname
                                  greengrass.createCoreDefinition({
                                    Name: input.deviceName
                                  }, (CCDER, CCD) => {
                                    if (err) {
                                      winston.info(CCDER)
                                    } else {
                                      greengrass.createCoreDefinitionVersion({
                                        CoreDefinitionId: CCD.Id,
                                        Cores: [
                                          {
                                            CertificateArn: c.certificateArn,
                                            Id: '1',
                                            SyncShadow: true,
                                            ThingArn: d.thingArn
                                          }
                                          /* more items */
                                        ]
                                      }, (CCDVER, CCDV) => {
                                        if (err) {
                                          winston.info(CCDVER)
                                        } else {
                                          greengrass.createGroupCertificateAuthority({
                                            GroupId: CG.Id /* required */
                                          }, (err, CGCI) => {
                                            if (err) {
                                              winston.info(err, err.stack) // an error occurred
                                            } else {
                                              winston.debug(CG)
                                              greengrass.createGroupVersion({
                                                GroupId: CG.Id, /* required */
                                                CoreDefinitionVersionArn: CCDV.Arn
                                              }, function (err, ccv) {
                                                if (err) winston.debug(err, err.stack)
                                                else {
                                                  greengrass.createDeployment({
                                                    GroupId: CG.Id, /* required */
                                                    DeploymentType: 'NewDeployment',
                                                    GroupVersionId: ccv.Version
                                                  }, (err, data) => {
                                                    if (err) winston.debug(' 5 ::' + err, err.stack) // an error occurred
                                                    else {
                                                      winston.debug(' 6 ::' + data) // successful response
                                                      c.GroupId = CG.Id
                                                      c.deviceCoreName = input.deviceCoreName
                                                      c.CoreDefinitionVersionArn = CCDV.Arn
                                                      c.GroupVersionId = ccv.Version
                                                      c.thingArn = d.thingArn
                                                      c.thingId = d.thingId
                                                      c.DeploymentId = data.DeploymentId
                                                      c.DeploymentArn = data.DeploymentArn
                                                      resolve(c)
                                                    }
                                                  })
                                                }
                                              })
                                            } // successful response
                                          })
                                        }
                                      })
                                    }
                                  })
                                }
                              })
                            }
                          })
                        }
                      })
                    }
                  })
                }
              })
            }
          })
        }
      })
    } catch (error) {
      resolve('error')
    }
  }).catch((err) => {
    winston.debug(err)
  })
}
