var jwt = require('jsonwebtoken');
var config = require('../config');
module.exports = function(req, res, next) {
  var token = req.body.token || req.query.token || req.headers['token'];
  if (token) {
    jwt.verify(token, config.ACCESS_TOKEN_SECRET_KEY, function(err, decoded) {
      if (err) {
        return res.status(config.UNAUTHORIZED).json({ message: err.message });
      } else {
        req.decoded = decoded;

        next();
      }
    });
  } else {
    return res.status(config.UNAUTHORIZED).json({
      message: 'Unauthorized access'
    });
  }
};
