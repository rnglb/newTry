const mongoose = require('mongoose');
const configModule = require('../config-helper/config.js');
const validate = require('mongoose-validator');


const permittedParams = ['SC-I', 'SC-O', 'SC-A', 'SD-I', 'SD-O', 'MT-A', 'MT-P', 'MT-Q'];
const permittedEvents = ['S-C', 'S-D', 'M-T'];

let AlertSchema = mongoose.Schema({
    asset: { type: String, required: true },
    assettype: { type: String, required: true },
    tenantId: { type: String, required: true },
    userId: { type: String, required: true },
    criteria: { eventtype: { type: String, enum: permittedEvents, required: true }, condition: { param: { type: String, enum: permittedParams, required: true }, duration: { type: Number }, th1: { type: Number }, th2: { type: Number } } },
    notifications: { per_dur: { type: String }, mode: [{ type: String }], level1: { userId: { type: String }, name: { type: String }, email: { type: String }, phno: { type: Number }, notified: { type: Boolean, default: false }, notifiedts: { type: Date } }, level2: { userId: { type: String }, name: { type: String }, email: { type: String }, phno: { type: Number }, notified: { type: Boolean, default: false }, notifiedts: { type: Date } }, level3: { userId: { type: String }, name: { type: String }, email: { type: String }, phno: { type: Number }, notified: { type: Boolean, default: false }, notifiedts: { type: Date } } },
    muted: { type: Number, required: true, default: 0 },
    lastmutedts: { type: Date, default: Date.now },
    emailcount: { type: Number, default: 0 },
    smscount: { type: Number, default: 0 },
    noofexecutions: { type: Number, default: 0 },
    stop: { type: Number, default: 0 },
    stopts: { type: Date },
    updatedBy: { type: String },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });


let Alerts = mongoose.model('Alert', AlertSchema);
module.exports = Alerts;