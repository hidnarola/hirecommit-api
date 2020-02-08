const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const authorization = require("../middlewares/authorization");


const employer = require('./admin/employer');
const candidate = require('./admin/candidate');


router.use("/employer", auth, authorization, employer);
router.use("/candidate", auth, authorization, candidate);





module.exports = router;
