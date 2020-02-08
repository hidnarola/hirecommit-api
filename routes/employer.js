const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const authorization = require("../middlewares/authorization");


const sub_account = require('./employer/sub_account');
const index = require('./employer/index');

const customField = require('./employer/customField');
const offer = require('./employer/offer');
const salary_bracket = require('./employer/salary_bracket');
const location = require('./employer/location');
const group = require('./employer/group');
const candidate = require('./employer/candidate');

router.use("/", auth, authorization, index);
router.use("/sub_account", auth, authorization, sub_account);
router.use("/customField", auth, authorization, customField);
router.use("/offer", auth, authorization, offer);
router.use("/salary_bracket", auth, authorization, salary_bracket);
router.use("/location", auth, authorization, location);
router.use("/group", auth, authorization, group);
router.use("/candidate", auth, authorization, candidate);



module.exports = router;
