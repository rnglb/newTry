const mongoose = require('mongoose');
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');

let ImageSchema = mongoose.Schema({
    tenantId: { type: String, lowercase: true, trim: true, index: true, sparse: true },
    uniqueId: { type: String, unique: true },
    fileName: { type: String },
    s3key: { type: String },
    description: { type: String },
    version: { type: String },
    type: { type: String }
}, { timestamps: true });

ImageSchema.index({ tenantId: 1, fileName: 1 })


let Image = module.exports = mongoose.model('Image', ImageSchema,'otaImage');