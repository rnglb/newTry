const mongoose = require('mongoose');
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');

let PermissionAPISchema = mongoose.Schema({
    permissionName: { type: String},
    permissionDescription:{ type: String },
    id:{ type: String  },
    value:{ type: String },
    method:{ type: String },
    module:{ type: String },

});

//PermissionAPISchema.index({ id: 1 })

let PermissionAPI = module.exports = mongoose.model('APIPermissions', PermissionAPISchema);
