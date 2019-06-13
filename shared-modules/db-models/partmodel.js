const mongoose = require('mongoose');
var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;
	
let PartmodelSchema = mongoose.Schema({
    tenantId: { type: String, lowercase: true, trim: true, index: true, sparse: true },
    assetId: { type: ObjectId,required: true  },
    partId: { type: ObjectId,required: true  },	
    model: { type: Object,required: true },
    version: { type: String }
}, { timestamps: true });

PartmodelSchema.index({ tenantId: 1, assetId: 1, partId: 1 })


let Partmodel = module.exports = mongoose.model('partmodel', PartmodelSchema);