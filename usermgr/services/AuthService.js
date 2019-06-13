const User = require('../../shared-modules/db-models').User;
const Tenants = require('../../shared-modules/db-models').Tenant;
const UserPerference = require('../../shared-modules/db-models').UserPreference;
const validator = require('validator');

const getUniqueKeyFromBody = function (body) {// this is so they can send in 3 options unique_key, email, or phone and it will work
    let unique_key = body.unique_key;
    if (typeof unique_key === 'undefined') {
        if (typeof body.email != 'undefined') {
            unique_key = body.email
        } else if (typeof body.phone != 'undefined') {
            unique_key = body.phone
        } else {
            unique_key = null;
        }
    }

    return unique_key;
}
module.exports.getUniqueKeyFromBody = getUniqueKeyFromBody;

const createUser = async function (userInfo) {

    let unique_key, auth_info, err;

    auth_info = {}
    auth_info.status = 'create';
    console.log(userInfo);
    unique_key = getUniqueKeyFromBody(userInfo);
    if (!unique_key) TE('An email or phone number was not entered.');

    if (validator.isEmail(unique_key)) {
        auth_info.method = 'email';
        userInfo.email = unique_key;

        [err, user] = await to(User.create(userInfo));
        if (err) TE(err.message);

        return user;

    } else if (validator.isMobilePhone(unique_key, 'any')) {//checks if only phone number was sent
        auth_info.method = 'phone';
        userInfo.phone = unique_key;

        [err, user] = await to(User.create(userInfo));
        if (err) TE(err.message);

        return user;
    } else {
        TE('A valid email or phone number was not entered.');
    }
}
module.exports.createUser = createUser;

const authUser = async function (userInfo) {//returns token
    let unique_key;
    let auth_info = {};
    auth_info.status = 'login';
    unique_key = getUniqueKeyFromBody(userInfo);

    if (!unique_key) TE('Please enter an email or userId to login');

    if (!userInfo.password) TE('Please enter a password to login');

    //if (!userInfo.tenantId) TE('Please enter a tenantId to login');

    let user;
    console.log(JSON.stringify(userInfo))
    auth_info.method = 'email';
    [err, user] = await to(User.findOne({
        $or: [{
            email: unique_key
        }, {
            userId: unique_key
        }]
    }));
    if (err) TE(err.message);
    console.log(user)

/*     if (validator.isEmail(unique_key)) {
        auth_info.method = 'email';
        [err, user] = await to(User.findOne({
            $or: [{
                email: unique_key
            }, {
                userId: unique_key
            }]
        }));
        if (err) TE(err.message);

    } else if (validator.isMobilePhone(unique_key, 'any')) {//checks if only phone number was sent
        auth_info.method = 'phone';

        [err, user] = await to(User.findOne({ phone: unique_key }));
        if (err) TE(err.message);
    } else {
        TE('A valid email or userId was not entered');
    } */

    if (!user) TE('User is not registered');

    [err, user] = await to(user.comparePassword(userInfo.password));

    if (err) TE(err.message);

    let tenants = await Tenants.findOne({ tenantId: user.tenantId });

    user.tenantName = tenants.tenantName;

    let userRolePref = await UserPerference.aggregate([
        { $match: { tenantId: user.tenantId } },
        { $unwind: "$userType" },
        { $match: { "userType.userType": user.sysRole } },
        { $project: { roles: "$userType.perference", _id: 0 } }
    ])

    let roles = []
    // let userRoles = JSON.parse(userRolePref[0][roles])

if(userRolePref.length > 0 ){

    let userRoles = JSON.parse(JSON.stringify(userRolePref[0]));
    userRoles = userRoles.roles

    for (var key in userRoles) {
        if (userRoles[key] == 'Active') {
            roles.push(key)
        }

    }
    user.appRoles = roles;
}
    return user;

}
module.exports.authUser = authUser;