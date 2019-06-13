const mongoose = require('mongoose');
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');


let levelSchema = new mongoose.Schema({ level: Number, label: String });

let LocationConfigSchema = mongoose.Schema({
    tenantId: { type: String, lowercase: true, trim: true, index: true, unique: true, sparse: true },
    levelCount: { type: Number },
    levels: [levelSchema]
}, { timestamps: true, collection: 'locationConfig' });

LocationConfigSchema.index({ tenantId: 1 }, { unique: true })


let LocationConfig = module.exports = mongoose.model('LocationConfig', LocationConfigSchema);