const mongoose = require('mongoose');
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');

let EventSchema = mongoose.Schema({
    tenantId: { type: String, lowercase: true, trim: true, index: true, sparse: true },
    did: { type: String },
    ts: { type: Number },
    aid: { type: String },
    fst: { type: Number },
    tst: { type: Number },
    pkp: { type: Number },
    count: { type: Number }
});

let Event = module.exports = mongoose.model('Event', EventSchema);