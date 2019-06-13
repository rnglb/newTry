var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    // res.render('index', { title: 'Portal API' });
    res.send(200, 'API')
});

router.use('/nilm', require('./api/nilm'));

router.use('/db/totEnergy', require('./api/mainDB/totEnergy'));
router.use('/db/events', require('./api/mainDB/events'));
router.use('/db/raw', require('./api/mainDB/rawEnergy'));
router.use('/db/energy', require('./api/mainDB/energy'));
router.use('/db/downTime', require('./api/loss/downTime'));
router.use('/db/availability', require('./api/mainDB/availability'));
router.use('/db/parts', require('./api/mainDB/parts'));
router.use('/db/oeeDetails', require('./api/mainDB/oeeDetails'));
router.use('/qualInputs', require('./api/mainDB/qualInputs'));
router.use('/alertInputs', require('./api/mainDB/alerts'));
router.use('/notificInputs', require('./api/mainDB/notifications'));
router.use('/db/perf', require('./api/mainDB/performance'));
router.use('/db/qual', require('./api/mainDB/quality'));
router.use('/factory', require('./api/setup/factoryShifts/factory'));
router.use('/shift', require('./api/setup/factoryShifts/shifts'));
router.use('/user', require('./api/setup/user/user'));
router.use('/asset', require('./api/setup/asset'));
router.use('/assetgrp', require('./api/setup/macGroup'));
router.use('/partno', require('./api/setup/partnumber'));
router.use('/loc', require('./api/setup/location'));
router.use('/device', require('./api/setup/device'));
router.use('/registerdevice', require('./api/setup/registerdevice'));

router.use('/registration', require('./api/setup/register'));
router.use('/email', require('./api/email/email'));
router.use('/metloss', require('./api/setup/metricsLosses/metloss'));
router.use('/db/rltime', require('./api/realtime/realtimedb'));
router.use('/db/favmac', require('./api/realtime/favmachines'));

router.use('/alerts', require('./api/alerts/alerts'));
router.use('/tenants', require('./api/setup/tenants/tenants'));
router.use('/confdb', require('./api/setup/userSettings/configdashboard'));
router.use('/autoreport', require('./api/setup/userSettings/autoreport'));

module.exports = router;
