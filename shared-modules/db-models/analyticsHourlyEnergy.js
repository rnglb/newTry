const mongoose = require('mongoose')
// mongoose.connect('mongodb://analyticsEngine:analyticsEngine@localhost:27017/analyticsEngine?replicaSet=rs&authSource=analyticsEngine')
let energyHourlySchema = mongoose.Schema({
  did: {type: String},
  fts: {type: Number},
  tts: { type: Number },
  oNMain: { type: String },
  oNDg: { type: String },
  oNMainArray: { type: Array },
  oNDgArray: { type: Array },
  updatedBy: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true })

let energyHourly = module.exports = mongoose.model('energyHourly', energyHourlySchema)
