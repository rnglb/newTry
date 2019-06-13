const mongoose = require('mongoose');
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');

let PermissionMenuSchema = mongoose.Schema({
    menu: [
        {
            Dashboard: {
                OpenAlert: {type:String}
            },
            Assets: {
                Default: {type:String}
            },
            Alerts: {
                Alertdata:{type:String}
            },
            Setup: {
                Locations: {type:String},
                Assets: {type:String},
                Users: {type:String}
            }
        }
    ],
    name: {type:String,unique: true }
}  
, { timestamps: true });


PermissionMenuSchema.index({ name: 1})

let PermissionMenu = module.exports = mongoose.model('MenuPermissions', PermissionMenuSchema);