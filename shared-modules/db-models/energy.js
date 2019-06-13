const mongoose = require('mongoose');
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');

let EnergySchema = mongoose.Schema({
    tenantId: { type: String, lowercase: true, trim: true, index: true, sparse: true },
    did: { type: String },
    fts: { type: Number },
    ts: { type: Number },
    kwh: { type: Number },
    kwhd: { type: Number },
    src: { type: Number },
    count: { type: Number }
});

let Energy = module.exports = mongoose.model('Energy', EnergySchema, 'energy');