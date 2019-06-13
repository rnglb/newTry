const mongoose = require('mongoose');
const configModule = require('../config-helper/config.js');
const validate = require('mongoose-validator');

let AssetGroupSchema = mongoose.Schema({
    tenantId: { type: String, lowercase: true, trim: true, index: true, sparse: true },
    groupName: { type: String },
    groupDesc: { type: String }
}, { timestamps: true, minimize: false });

AssetGroupSchema.index({ tenantId: 1, groupName: 1 })

let AssetGroup = module.exports = mongoose.model('Assetgroup', AssetGroupSchema);