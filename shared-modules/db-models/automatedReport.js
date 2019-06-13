const mongoose = require('mongoose');
const configModule = require('../config-helper/config.js');
const validate = require('mongoose-validator');


let autoreportSchema = mongoose.Schema({
    tenantId: { type: String },
    userId: { type: String },
    assetType: { type: String, required: true },
    assetchoice: [{ text: { type: String, required: true }, value: { type: String, required: true }, type: { type: String, required: true } }],
    updatedBy: { type: String },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

let autoReport = mongoose.model('AutomatedReport', autoreportSchema);
module.exports = autoReport;