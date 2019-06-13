const mongoose = require('mongoose')
const configModule = require('../..//shared-modules/config-helper/config.js')
const validate = require('mongoose-validator')


let DeviceLkpSchema = mongoose.Schema({
  deviceid: { type: String },
  ergdid: { type: String },
  token: { type: String }
}, { timestamps: true })

let Devicelkp = module.exports = mongoose.model('Devicelkp', DeviceLkpSchema)
