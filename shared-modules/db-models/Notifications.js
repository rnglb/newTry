const mongoose = require('mongoose');
const configModule = require('../config-helper/config.js');
const validate = require('mongoose-validator');


let NotificationSchema = mongoose.Schema({
    alertId:{type:Object},
    asset: { type: String  },
    tenantId: { type: String, required: true },
    userId: { type: String },
    userId:{type:String, required:true},
    criteria: {type:Object},
    medium: [{type:String}],
    esclvl : {type:Object},
    updatedBy: { type: String },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });


let Notifications = mongoose.model('Notification', NotificationSchema);
module.exports = Notifications;