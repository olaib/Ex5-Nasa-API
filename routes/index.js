var express = require('express');
var router = express.Router();
const PAGE_NOT_FOUND = 404;
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Ex-5 Nasa Api' });
});
module.exports = router;
