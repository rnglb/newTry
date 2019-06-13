const mongoose = require('mongoose')
const configModule = require('../..//shared-modules/config-helper/config.js')
const validate = require('mongoose-validator')


let TrainingSchema = mongoose.Schema({
  deviceId: { type: String },
  ergdid: { type: String },
  token: { type: String },
  data: { type: String },
  valid: {type: Boolean},
  ts: { type: Number }
})

let Training = module.exports = mongoose.model('Training', TrainingSchema, 'training')

