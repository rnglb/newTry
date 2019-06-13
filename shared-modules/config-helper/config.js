process.env["NODE_CONFIG_DIR"] = __dirname + "/config/";

const config = require('config');
var dev = config.get('Config.dev');
var prod = config.get('Config.prod');
const winston = require('winston');

/**
 * Set Configuration of Application, and Environment
 * @param environment
 * @returns The configuration
 */
module.exports.configure = function (environment) {
    var config = {};
    if (environment == null || environment == undefined || environment == 'undefined') {
        var environment = process.env.NODE_ENV;
        if (process.env.NODE_ENV == undefined) {
            environment = "development";
        }
    }
    switch (environment) {
        case "production":

            if (process.env.AWS_REGION == undefined || process.env.SERVICE_URL == undefined || process.env.SNS_ROLE_ARN == undefined || process.env.AWS_ACCOUNT_ID == undefined || process.env.USER_TABLE == undefined || process.env.TENANT_TABLE == undefined || process.env.PRODUCT_TABLE == undefined || process.env.ORDER_TABLE == undefined) {
                var error = "Production Environment Variables Not Properly Configured. \nPlease ensure AWS_REGION, SERVCE_URL, SNS_ROLE_ARN, AWS_ACCOUNT_ID environment Variables are set."
                throw error;
                break;
            }
            else {
                winston.debug('Currently Running in', + environment);
                var port = prod.port;
                var name = prod.name;
                //var table = prod.table;
                config = {
                    environment: environment,
                    //web_client: process.env.WEB_CLIENT,
                    aws_region: process.env.AWS_REGION,
                    cognito_region: process.env.AWS_REGION,
                    aws_account: process.env.AWS_ACCOUNT_ID,
                    domain: prod.domain,
                    service_url: prod.protocol + prod.domain,
                    name: name,
                    userRole: prod.userRole,
                    tier: prod.tier,
                    port: port,
                    loglevel: prod.log.level,
                    url: {
                        tenant: prod.protocol + prod.protocol + prod.domain + '/tenant',
                        user: prod.protocol + prod.protocol + prod.domain + '/user',

                        location: prod.protocol + prod.protocol + prod.domain + '/location',
                        device: prod.protocol + prod.protocol + prod.domain + '/device',
                        asset: prod.protocol + prod.protocol + prod.domain + '/asset',
                        assetdb: prod.protocol + prod.protocol + prod.domain + '/assetdb',
                        liftdb: prod.protocol + prod.protocol + prod.domain + '/liftdb',
                        email: prod.protocol + prod.protocol + prod.domain + '/email'


                    },
                    mongoDB: {
                        connectString: process.env.connectString,
                        db: process.env.db
                    },
                    jwt_expiration: process.env.jwt_expiration,
                    jwt_encryption: process.env.jwt_encryption
                }
                return config;
                break;
            }
        case "development":
            var port = dev.port;
            var name = dev.name;

            config = {
                environment: environment,
                aws_region: dev.region,
                cognito_region: dev.region,
                aws_account: dev.aws_account,
                domain: dev.domain,
                service_url: dev.protocol + dev.domain,
                name: name,
                userRole: dev.userRole,
                tier: dev.tier,
                port: port,
                loglevel: dev.log.level,
                url: {
                    tenant: dev.protocol + dev.domain + ':' + port.tenant + '/tenant',
                    user: dev.protocol + dev.domain + ':' + port.user + '/user',

                    location: dev.protocol + dev.domain + ':' + port.location + '/location',
                    device: dev.protocol + dev.domain + ':' + port.device + '/device',
                    asset: dev.protocol + dev.domain + ':' + port.asset + '/asset',
                    assetdb: dev.protocol + dev.domain + ':' + port.assetdb + '/assetdb',
                    liftdb: dev.protocol + dev.domain + ':' + port.liftdb + '/liftdb',
                    email: dev.protocol + dev.domain + ':' + port.email + '/email'
                },
                mongoDB: {
                    connectString: dev.mongoDB.connectString,
                    db: dev.mongoDB.db
                },
                jwt_expiration: dev.jwt_expiration,
                jwt_encryption: dev.jwt_encryption
            }

            return config;
            break;

        default:
            var error = 'No Environment Configured. \n Option 1: Please configure Environment Variable. \n Option 2: Manually override environment in config function.';
            throw error;
    }

}