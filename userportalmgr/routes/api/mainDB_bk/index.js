var express = require('express');
var router = express.Router();


router.get('/', function(req, res, next) {
  //res.render('index', { title: 'Nilm API' });
  res.send(200,'Energy Dashboard API')
});

router.use('/totEnergy', require('./totEnergy'));


  
  module.exports=router