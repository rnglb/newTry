var express = require('express');
var router = express.Router();


router.get('/', function(req, res, next) {
    //res.render('index', { title: 'Nilm API' });
    res.send(200,'Nilm')
  });

  router.use('/alarms', require('./alarms'));
  router.use('/events', require('./events'));
  router.use('/appEnergy', require('./appEnergy'));
  router.use('/totEnergy', require('./totEnergy'));
  router.use('/rawEnergy', require('./rawEnergy'));


  
  module.exports=router