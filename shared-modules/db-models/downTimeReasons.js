const mongoose = require('mongoose');
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');

let downtimereason = mongoose.Schema({
    tenantId: { type: String, trim: true, index: true},
    downTimeReasons: { type: String },
    isPrimary:{type :Number},
    isSecondaryReasonsNeeded :{type: Number},
    secondaryReasons:{type :Array}
}, { timestamps: true });

downtimereason.index({ tenantId: 1 });
let DownTimeReasons=  module.exports = mongoose.model('DownTimeReason', downtimereason);