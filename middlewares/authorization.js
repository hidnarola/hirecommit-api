var config = require('../config');

module.exports = function (req, res, next) {
    if (req.decoded.role == "admin" && req.baseUrl.match('/admin')) {
        req.userInfo = req.decoded;
        next();
    }
    else if (req.decoded.role == "candidate" && req.baseUrl.match('/candidate')) {
        req.userInfo = req.decoded;
        next();
    }
    else if ((req.decoded.role == "employer" || req.decoded.role == "sub-employer") && req.baseUrl.match('/employer')) {
        req.userInfo = req.decoded;
        next();
    }
    else {
        return res.status(config.UNAUTHORIZED).json({
            "message": 'Unauthorized access'
        });
    }
}
