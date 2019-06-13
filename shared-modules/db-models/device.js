const mongoose = require('mongoose');
//const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');

let typeSchema = new mongoose.Schema({ key: String, value: String, desc: String });
let tagsSchema = new mongoose.Schema({ key: String, value: String });

let DeviceSchema = mongoose.Schema({
    tenantId: { type: String, lowercase: true, trim: true, index: true, sparse: true },
    devType: { type: String },
    devName: { type: String, unique: true},
    hardwareID:{ type:String},
    devId: {type: Number, unique: true},
    devPolicy: { type: String },   
    active: { type: String }, 
    assetId : { type: String },
    assetAttached: { type: Boolean, default: false },
    deviceTypeKeys: { type: Object, default: {} },   
    deviceKeys: { type: Object , default: {}},  
    certId: { type: String },
    policyName: { type: String},
    principal: { type: String },    
    thingArn: { type: String },
    thingid: { type: String },
    tags: [tagsSchema]
}, { timestamps: true , minimize: false});


let Device = module.exports = mongoose.model('Device', DeviceSchema);