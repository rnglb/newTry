const mongoose = require('mongoose')

let factorySchema = mongoose.Schema({
  factoryId:{type:String,unique:true},
  nickName: { type: String },
  name: {type: String},
  address: {type: String},
  timezone:{type:String},
  location:{type:String},
  wifissid:{type:String},
  wifipass:{type:String},
  shift: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  tenantId: { type: String, lowercase: true, trim: true, index: true, sparse: true }
}, { timestamps: true })


let Factory = module.exports = mongoose.model('Factory', factorySchema)
