const mongoose = require('mongoose');
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');


let typeSchema = new mongoose.Schema({ key: String, value: String, desc: String });
let ModelInfoSchema = new mongoose.Schema({ key: String, value: String, desc: String });

let AssetModelSchema = mongoose.Schema({
    tenantId: { type: String, lowercase: true, trim: true, required: true },
    assetType: { type: String, lowercase: true, trim: true, required: true },
    assetModel: { type: String, lowercase: true, trim: true, required: true },
    mfr: { type: String, required: true },
    assetModelName: { type: String, required: true },
    assetTypeKeys: mongoose.Schema.Types.Mixed,
    assetModelKeys: mongoose.Schema.Types.Mixed,
    enabled: { type: String }
}, { timestamps: true, collection: 'assetModels', required: true });

AssetModelSchema.index({ tenantId: 1, assetType: 1, assetModel: 1 })


let AssetModel = module.exports = mongoose.model('AssetModel', AssetModelSchema);