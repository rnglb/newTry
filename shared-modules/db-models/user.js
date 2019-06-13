const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const bcrypt_p = require('bcrypt-promise');
const jwt = require('jsonwebtoken');
const validate = require('mongoose-validator');
const configModule = require('../../shared-modules/config-helper/config.js');

var config = configModule.configure(process.env.NODE_ENV);

let tagsSchema = new mongoose.Schema({ key: String, value: String });

let UserSchema = mongoose.Schema({
    firstName: { type: String },
    lastName: { type: String },
    company: { type: String },
    phone: {
        type: String, lowercase: true, trim: true, index: true, sparse: true, unique: false, required: true, //sparse is because now we have two possible unique keys that are optional
        validate: [validate({
            validator: 'isNumeric',
            arguments: [7, 20],
            message: 'Not a valid phone number.',
        })]
    },
    email: {
        type: String, lowercase: true, trim: true, index: true, sparse: true,
    },
    tenantId: {
        type: String, lowercase: true, trim: true, index: true, sparse: true, required: true,
    },
    password: { type: String, required: true },
    sysRole: { type: String, required: true },
    userId: { type: String, required: true },
    tags: [tagsSchema],
    appRoles: { type: Array },
    userRole: { type: Array },
    resetPassword: { type: Boolean, default: true },
    enabled: { type: Boolean, default: true },
    createdBy: { type: String },
    updatedBy: { type: String },
    stage: { type: Number, default: 0 }
}, { timestamps: true });


//Combination of Email and Tenant ID to be unique
UserSchema.index({ email: 1, tenantId: 1 }, { unique: true })
UserSchema.index({ phone: 1, tenantId: 1 }, { unique: true })


UserSchema.pre('save', async function (next) {

    if (!this.password) {
        TE("Password is missing", true);
    }

    if (this.isModified('password') || this.isNew) {

        let err, salt, hash;
        [err, salt] = await to(bcrypt.genSalt(10));
        if (err) TE(err.message, true);

        [err, hash] = await to(bcrypt.hash(this.password, salt));
        if (err) TE(err.message, true);

        this.password = hash;

    } else {
        return next();
    }
})

UserSchema.methods.comparePassword = async function (pw) {
    let err, pass;
    if (!this.password) TE('password not set');

    [err, pass] = await to(bcrypt_p.compare(pw, this.password));
    if (err) TE(err);

    if (!pass) TE('Invalid Password !');

    return this;
}

// UserSchema.methods.Companies = async function () {
//     let err, companies;
//     [err, companies] = await to(Company.find({ 'users.user': this._id }));
//     if (err) TE('err getting companies');
//     return companies;
// }

UserSchema.virtual('full_name').set(function (name) {
    var split = name.split(' ');
    this.first = split[0];
    this.last = split[1];
});

UserSchema.virtual('full_name').get(function () { //now you can treat as if this was a property instead of a function
    if (!this.first) return null;
    if (!this.last) return this.first;

    return this.first + ' ' + this.last;
});

UserSchema.methods.getJWT = function (tenantId) {
    let expiration_time = parseInt(config.jwt_expiration);
    if (tenantId && this.tenantId.indexOf(tenantId) > -1) {
        return "Bearer " + jwt.sign({ user_id: this._id, userId: this.userId, email: this.email, phone: this.phone, tenantId: tenantId, sysRole: this.sysRole, appRoles: this.appRoles, userRole: this.userRole }, config.jwt_encryption, { expiresIn: expiration_time });
    } else {
        return "Bearer " + jwt.sign({ user_id: this._id, userId: this.userId, email: this.email, phone: this.phone, tenantId: '', sysRole: this.sysRole, appRoles: this.appRoles, userRole: this.userRole }, config.jwt_encryption, { expiresIn: expiration_time });
    }
};

UserSchema.methods.toWeb = function () {

    let json = this.toJSON();
    // delete json["enabled"];
    // delete json["resetPassword"];
    delete json["password"];

    delete json["createdBy"]
    delete json["updatedBy"]

    delete json["createdAt"]
    delete json["updatedAt"]

    delete json["_id"]

    // json.id = this._id;//this is for the front end
    return json;
};

let User = module.exports = mongoose.model('Appuser', UserSchema);


