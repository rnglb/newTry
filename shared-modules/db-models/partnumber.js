const mongoose = require('mongoose');
const configModule = require('../config-helper/config.js');
const validate = require('mongoose-validator');

let PartnumberSchema = mongoose.Schema({
    tenantId: { type: String, lowercase: true, trim: true, index: true, sparse: true },
    partnumber: { type: String },
    basenumber: { type: String },
    partname: { type: String },
    runrate: { type: Number },
    assetmap: { type: Object },
    status: { type: String }
}, { timestamps: true , minimize: false});

PartnumberSchema.index({ tenantId: 1, assetId: 1 })


let Partnumber = module.exports = mongoose.model('Partnumber', PartnumberSchema);