const mongoose = require('mongoose');
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');


let tagsSchema = new mongoose.Schema({ key: String, value: String });
let typeSchema = new mongoose.Schema({ key: String, type: String, desc: String, value: String });

let DeviceTypeSchema = mongoose.Schema({
    tenantId: { type: String, lowercase: true, trim: true, index: true, sparse: true },
    deviceType: { type: String, trim: true },
    name: { type: String },
    keys: [typeSchema],
    enabled: { type: String }
}, { timestamps: true, collection: 'deviceTypes' });

DeviceTypeSchema.index({ tenantId: 1, assetType: 1 })


let DeviceType = module.exports = mongoose.model('DeviceType', DeviceTypeSchema);