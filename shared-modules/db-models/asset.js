const mongoose = require('mongoose');
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');

let devSchema = new mongoose.Schema({ devName: String, devType: String , devId: Number});
var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

let AssetSchema = mongoose.Schema({
    tenantId: { type: String, lowercase: true, trim: true, index: true, required: true,
sparse: true  },
    assetId: { type: String, unique: true ,required: true },    
    assetName: { type: String,required: true },
    assetType: { type: String,required: true },
    assetModel: { type: String,required: true },
    assetMake: { type: String ,required: true},
    internalname: { type: String },
    internalcode: { type: String },    
    factory: { type: Object,required: true },
    factoryId: { type: ObjectId  },
    location: { type: String },
    group: { type: String,required: true },
    hwId: { type: String },    
    computed: { type: Object , default : {} },
    devices: [devSchema],
    maintDt: { type: Date },
    maintcycle: { type: Number },
    maintunit: { type: String },    
    status: { type: String, default: 'new' },
    lastMsgts: { type: Number }

}, { timestamps: true , minimize: false});

AssetSchema.index({ tenantId: 1, assetId: 1 })


let Asset = module.exports = mongoose.model('Asset', AssetSchema);