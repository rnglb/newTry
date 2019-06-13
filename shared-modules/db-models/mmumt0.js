const mongoose = require('mongoose');
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');

let MMUMt0Schema = mongoose.Schema({
    tenantId: { type: String, trim: true, index: true, sparse: true },
    ts: { type: Number },
    did:{ type:String},
    mt: {type: Number},
    dr: { type: Number },   
    cfn: { type: Number }, 
    ds : { type: Number },
    nf: { type: Number},
    td: { type: Number },   
    ms: { type: Number },  
    mst: { type: Number },
    ma: { type: Number},
    mat: { type: Number },    
    md: { type: Number },
    mdt: { type: Number }
}, {minimize: false});

let MMUMt0 = module.exports = mongoose.model('MMUMt0', MMUMt0Schema,'mmumt0');