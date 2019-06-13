const mongoose = require('mongoose');
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');

let UserRoleSchema = mongoose.Schema({
    
    roleName: { type: String},
    roleDescription:{type: String  },
    apiPermission:{ type: Array },
    dataPermission:{ type: Array  },
    
});

UserRoleSchema.index({ roleName: 1 })

let UserRole = module.exports = mongoose.model('UserRole', UserRoleSchema);