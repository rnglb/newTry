const mongoose = require('mongoose')
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');

let shiftSchema = mongoose.Schema({
	shiftId:{type:String},
    tenantId: {type:String},
  type : {type: String},
	mode : {type: String},
	days : {type: Array},
	shiftDetails: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true })


let Shift = module.exports = mongoose.model('Shift', shiftSchema)
