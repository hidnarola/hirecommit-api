const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const authorization = require("../middlewares/authorization");


const index = require('./candidate/index');
const offer = require('./candidate/offer');

router.use("/", auth, authorization, index);
router.use("/offer", auth, authorization, offer);




module.exports = router;
