const mongoose = require('mongoose');
const configModule = require('../config-helper/config.js');
const validate = require('mongoose-validator');


let tagsSchema = new mongoose.Schema({ key: String, value: String });

let DeviceSchema = mongoose.Schema({
    M : { type: String },
	V : { type: String },
	T : { type: String },
	N : { type: String },
	I : { type: String },
	Tk : { type: String },
	W : { type: String },
	S : { type: String }
});

let DeviceDetails = module.exports = mongoose.model('DeviceDetail', DeviceSchema);