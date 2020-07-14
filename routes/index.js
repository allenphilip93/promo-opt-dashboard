var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


router.get('/data', (req, res) => {
  var result = {};
  result.price = [1,2,2,3,4,2,1,5,2,1,4,1,2,2,3,4,2,1,5,2,1,4];
  result.sales = [10,20,20,30,40,20,10,50,20,10,40,10,20,20,30,40,20,10,50,20,10,40];
  result.MI = [1,0,0,0,0,1,1,0,0,1,0,1,0,0,0,0,1,1,0,0,1,0];
  res.send(result)
});

module.exports = router;
