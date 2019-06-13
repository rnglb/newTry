const mongoose = require('mongoose');
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');

let JobSchema = mongoose.Schema({
    tenantId: { type: String, lowercase: true, trim: true, index: true, sparse: true },
    uniqueId: { type: String },
    name: { type: String },
    desc: { type: String },
    version: { type: String },
    type: { type: String },   
    jobId: { type: String },
    jobArn: { type: String },
    otaUpdateId: { type: String },
    otaUpdateArn: { type: String },    
    otaUpdateStatus: { type: String },
    devices: { type: Object }
}, { timestamps: true });

JobSchema.index({ tenantId: 1 ,name :1})


let Job = module.exports = mongoose.model('Job', JobSchema, 'otaVersion');