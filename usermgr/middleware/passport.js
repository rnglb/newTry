const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../../shared-modules/db-models').User;

const configModule = require('../../shared-modules/config-helper/config.js');

var config = configModule.configure(process.env.NODE_ENV);

module.exports = function (passport) {
    var opts = {};
    opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
    opts.secretOrKey = config.jwt_encryption;
    console.log(opts)
    passport.use(new JwtStrategy(opts, async function (jwt_payload, done) {
        let err, user;
        [err, user] = await to(User.findById(jwt_payload.user_id));
        if (err) return done(err, false);
        if (user) {
            console.log(user);
            return done(null, user);
        } else {
            return done(null, false);
        }
    }));
}