const mongoose = require('mongoose');
const configModule = require('../config-helper/config.js');
const validate = require('mongoose-validator');

const permittedMertics = ['P-D', 'L-7', 'L-30'];
let dashboardSchema = mongoose.Schema({
    tenantId: { type: String },
    userId: {type: String, required: false},
    metric: { type: String, required: true, enum: permittedMertics },
    assetchoice: {
        text: { type: String, required: true }, 
        value: { type: String, required: true }, 
        type: { type: String, required: true },
         deviceId: { type: String, required: true },
        runrate: { type: Number, required: false },
        assetId: { type: String, required: false },
        factory: { type: String, required: false },
        location: { type: String, required: false },
        group: { type: String, required: false },
        tenantId: { type: String, required: false }
    },
    updatedBy: { type: String },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });


let ConfigDashboard = mongoose.model('ConfigDashboard', dashboardSchema);
module.exports = ConfigDashboard;