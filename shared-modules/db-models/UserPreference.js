const mongoose = require('mongoose')
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');

let UserPerferenceSchema = mongoose.Schema({
    tenantId: { type: String, lowercase: true, trim: true, index: true, required: true,
        sparse: true  },    
	template:{type:String},
    userType : mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true })


let UserPerference = module.exports = mongoose.model('UserPerference', UserPerferenceSchema)
