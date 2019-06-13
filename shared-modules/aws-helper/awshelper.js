process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
// const AWS = require('aws-sdk')
// const fs = require('fs-extra')
//const proxy = require('proxy-agent')
// const AdmZip = require('adm-zip')
// const uuidv1 = require('uuid/v1')
//const formidable = require('formidable')
// const path = require('path')

// Configure Environment
const configModule = require('../config-helper/config.js')
const configuration = configModule.configure(process.env.NODE_ENV)
// Configure Logging
// const winston = require('winston')

// winston.level = configuration.loglevel

// boschUp restricted credentials
//AWS.config.update({
  // "region": "ap-south-1"
// })


// AWS.config.apiVersions = {
//  iotdata: '2015-05-28'
  // other service API versions
// }


//const iot = new AWS.Iot()
//const iotdata = new AWS.IotData({ endpoint: 'https://a1v9hgf64nejdy-ats.iot.ap-south-1.amazonaws.com' })

let allThings = {}

module.exports.Activatething = async function (input) {
 
    return ;

  

}

module.exports.Deactivatething = async function (input) {
 
    return ;

}

module.exports.Updatething = async function (input) {
 
    return ;
 
}

module.exports.Creatething = async function (input) {
  return ;
  }

  let device = {
    
  }
 
module.exports.Deletething = async function () {
 
  }
function uploadCertificatesToS3(tenantId, deviceId, certsData) {
}
module.exports.DeviceCertURLs = async function () {
/*  try {
    let s3 = new AWS.S3({apiVersion: '2006-03-01'})
    let result = [];

    let getSignedUrl = async function (key) {
      try {
        let params = {
          Bucket: 'cmdevicecerts', // get from constant
          Key: key,
          Expires: 60 //seconds
        }
        console.log(params)
        let url = await s3.getSignedUrl('getObject', params).promise();
        return url;
      } catch (e) {
        winston.debug(e, e.stack);
      }

    } 

    let getSignedUrl = function (key) {
      return new Promise((resolve, reject) => {
        let params = {
          Bucket: 'cmdevicecerts', // get from constant
          Key: key,
          Expires: 60 //seconds
        }
        s3.getSignedUrl('getObject', params, (err, url) => {
          if (err) reject(err)
console.log(url)
          resolve(url);
        })
      });*/
    }
module.exports.DownloadCertificates = async function () {

    return ;
 
}

module.exports.DeleteCertificates = async function () {
}

module.exports.updatedeviceShadow1 = async function () {
 
    return;
  
}


module.exports.updatedeviceShadow = async function (deviceName, document) {
  return; // successful response
    
}

module.exports.UploadImages = async function (req, tenantId) {
  return ;
       
}
function uploadImagetoToS3(tenantId, today, uniqueId, fileName, directory) {
  return ;
}
module.exports.CreateOTAJob = async function (arr, param) {
  return ;
}
