const mongoose = require('mongoose');
const configModule = require('../..//shared-modules/config-helper/config.js');


let RawenergySchema = mongoose.Schema({
    tenantId: { type: String, lowercase: true, trim: true, index: true, sparse: true },
    did: { type: String },
    ts: { type: Number },
    src: { type: Number },
    vlta: { type: Number },
    vltb: { type: Number },
    vltc: { type: Number },
    cura: { type: Number },
    curb: { type: Number },
    curc: { type: Number },
    pfa: { type: Number },
    pfb: { type: Number },
    pfc: { type: Number },
    frqa: { type: Number },
    frqb: { type: Number },
    frqc: { type: Number },
    thda: { type: Number },
    thdb: { type: Number },
    thdc: { type: Number },
    rxpa: { type: Number },
    rxpb: { type: Number },
    rxpc: { type: Number },
    count: { type: Number }
});


let Rawenergy = module.exports = mongoose.model('RawEnergy', RawenergySchema, 'rawEnergy');