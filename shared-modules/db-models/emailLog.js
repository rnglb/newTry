const mongoose = require('mongoose');
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');



let emailLogSchema = mongoose.Schema({
    tenantId: { type: String, lowercase: true, required: true, trim: true, sparse: true },
    template: { type: String, required: true },
    to: { type: String, required: true },
    cc: { type: String },
    emailVars: { type: Object },
    ts: { type: Number, required: true },
    response: { type: Object },
    success: { type: Boolean }
});

emailLogSchema.index({ tenantId: 1, template: 1, ts: 1 }, { unique: true })


let EmailLog = module.exports = mongoose.model('EmailLog', emailLogSchema);