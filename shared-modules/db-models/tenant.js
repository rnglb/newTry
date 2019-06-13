const mongoose = require('mongoose');
const configModule = require('../config-helper/config.js');
const validate = require('mongoose-validator');

let TenantSchema = mongoose.Schema({
    tenantId: { type: String, lowercase: true, trim: true, index: true, unique: true, sparse: true },
    tenantName: { type: String, required: true },
    email: { type: String, required: true },
    plan: { type: String },
    enabled: { type: Boolean },
    licExpDate: { type: Date },
    licDueDate: { type: Date },
    preventiveMaintenance: { type: String }, 
    smallStops: { type: String} 
}, { timestamps: true });

 TenantSchema.index({ tenantId: 1 }, { unique: true })
 //let Tenants = module.exports = mongoose.model('Tenants', TenantSchema);
 let Tenants= mongoose.model('Tenant', TenantSchema);
  module.exports  = Tenants;