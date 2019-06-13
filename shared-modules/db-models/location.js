const mongoose = require('mongoose');
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');


let LocationSchema = mongoose.Schema({
    tenantId: { type: String, lowercase: true, trim: true, index: true, sparse: true },
    locId: { type: String },
    locname: { type: String },
    country: { type: String },
    currency: { type: String },
    tz: { type: String },
    enabled: { type: Boolean }
}, { timestamps: true });

LocationSchema.index({ tenantId: 1, locName: 1 })


let Location = module.exports = mongoose.model('Location', LocationSchema);