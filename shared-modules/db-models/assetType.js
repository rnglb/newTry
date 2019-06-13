const mongoose = require('mongoose');
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');


let tagsSchema = new mongoose.Schema({ key: String, value: String });
let typeSchema = new mongoose.Schema({ key: String, type: String, desc: String, value: String });
let computedSchema = new mongoose.Schema({ key: String, type: String, desc: String, value: String });
let deviceTypeSchema = new mongoose.Schema({ devType: String, computed: [computedSchema] });

let AssetTypeSchema = mongoose.Schema({
    tenantId: { type: String, lowercase: true, trim: true, index: true, sparse: true },
    assetType: { type: String, lowercase: true, trim: true },
    assetTypeName: { type: String },
    devTypes: [deviceTypeSchema],
    assetTypeKeys: [typeSchema],
    enabled: { type: String }
}, { timestamps: true, collection: 'assetTypes' });

AssetTypeSchema.index({ tenantId: 1, assetType: 1 })


let AssetType = module.exports = mongoose.model('AssetType', AssetTypeSchema);