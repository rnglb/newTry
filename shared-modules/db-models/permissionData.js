const mongoose = require('mongoose');
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');

let PermissionDataSchema = mongoose.Schema({
    
    permissionName: { type: String},
    permissionDescription:{ type: String },
    assetLocation:{ type: String  },
    assetType:{type: String  },
    assetModel:{ type: String },
    assetID:{ type: String },
    id:{ type: String }

});

//PermissionDataSchema.index({ name: 1 })

let PermissionData = module.exports = mongoose.model('DataPermissions', PermissionDataSchema);