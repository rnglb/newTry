const mongoose = require('mongoose');
const configModule = require('../..//shared-modules/config-helper/config.js');
const validate = require('mongoose-validator');

/* let APIRoutesSchema = mongoose.Schema({
    apis: [{
        allows: [
            { type: String,
                api:[{ url: String }]  }
            
        ],
        
    }],
    moduleName: { type: String, unique: true }
}); */

let APIRoutesSchema = mongoose.Schema({
"attr":{
    "title":{type: String},
    "id":{type: String}
  },
  "children":{type: Array},
moduleName: { type: String, unique: true }
});


APIRoutesSchema.index({ moduleName: 1 })

let APIRoutes = module.exports = mongoose.model('APIRoutes', APIRoutesSchema);