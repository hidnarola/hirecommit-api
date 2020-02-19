const express = require('express');
const router = express.Router();
const auth = require("../middlewares/auth");
const config = require('../config');
const fs = require('fs');
const path = require('path');
const ObjectId = require('mongodb').ObjectID;
const btoa = require('btoa');
const uuid = require('uuid/v4');
const moment = require("moment")
const aws = require('aws-sdk');

const S3_BUCKET = config.BUCKET_NAME;


const _ = require('underscore');
const request = require('request');
const passwordValidator = require('password-validator');
const passwordValidatorSchema = new passwordValidator();

const logger = config.logger;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const async = require('async');

var MailParser = require("mailparser-mit").MailParser;


const mail_helper = require('./../helpers/mail_helper');
const Role = require('./../models/role');
const User = require('./../models/user');
const Employer_Landing_Page = require('./../models/employer_landing_page');
const Candidate_Landing_Page = require('./../models/candidate_landing_page');
const Candidate_Detail = require('./../models/candidate-detail');
const Employer_Detail = require('./../models/employer-detail');
const SubEmployer_Detail = require('./../models/sub-employer-detail');

const CountryData = require('./../models/country_data');
const BusinessType = require('./../models/business_type');
const DocumentType = require('./../models/document_type');
const Offer = require('./../models/offer');
const RepliedMail = require('./../models/replied_mail');
const MailType = require('./../models/mail_content');
const test_mail_helper = require('./../helpers/testmail_helper');

const DisplayMessage = require('./../models/display_messages');
const Group = require('./../models/group');
const userpProfile = require('./profile');

router.use("/profile", auth, userpProfile);

const saltRounds = 10;
var common_helper = require('./../helpers/common_helper');

var captcha_secret = config.captcha_secret
// var captcha_secret = "6LfCebwUAAAAAKbmzPwPxLn0DWi6S17S_WQRPvnK"


//get user
router.get("/user", async (req, res) => {
  try {
    var response = await common_helper.find(User);
    res.status(config.OK_STATUS).send(response);
  } catch (error) {
    return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
  }
});

router.get("/offer/:id", async (req, res) => {
  try {
    var obj = {
      mail_status: "Opened"
    }
    var response = await common_helper.update(Offer, { "_id": req.params.id }, obj);
    var data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==";
    var img = new Buffer(data, 'base64');

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': img.length
    });
    res.end(img);
  } catch (error) {
    return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
  }
});

// Add role Registration
router.post("/add_role", async (req, res) => {
  try {
    var reg_obj = {
      "role": req.body.role
    }

    var response = await common_helper.insert(Role, reg_obj);
    if (response.status === 0) {
      throw new Error('Error occured while inserting data');
    }

    res.status(config.OK_STATUS).json(response);
  } catch (error) {
    const response = {
      success: false,
      message: error.message
    }
    res.status(config.BAD_REQUEST).send(response);
  }
});

//Admin register
router.post("/admin_register", async (req, res) => {
  try {
    var schema = {
      "email": {
        notEmpty: true,
        errorMessage: "Email is required"
      },
      "password": {
        notEmpty: true,
        errorMessage: "Password is required"
      }
    };
    req.checkBody(schema);

    var errors = req.validationErrors();
    if (!errors) {
      let role = await common_helper.findOne(Role, { 'role': 'admin' }, 1)
      var reg_obj = {
        "email": req.body.email,
        "password": req.body.password,
        "role": new ObjectId(role.data._id),
        "admin_rights": true,
        "email_verified": true,
        "isAllow": true,
        "is_del": false,
        "is_register": true,
        "flag": 0
      };
      var interest_resp = await common_helper.insert(User, reg_obj);
      if (interest_resp.status == 0) {
        logger.debug("Error = ", interest_resp.error);
        res.status(config.INTERNAL_SERVER_ERROR).json(interest_resp);
      } else {
        res.json({ "message": "Admin Added successfully", "data": interest_resp })
      }
    }
    else {
      logger.error("Validation Error = ", errors);
      res.status(config.BAD_REQUEST).json({ message: errors });
    }
  } catch (error) {
    return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
  }
});

// Candidate Registration
router.post("/candidate_register", async (req, res) => {
  try {
    var schema = {
      "firstname": {
        notEmpty: true,
        errorMessage: "Firstname is required"
      },
      "lastname": {
        notEmpty: true,
        errorMessage: "Lastname is required"
      },
      "email": {
        notEmpty: true,
        errorMessage: "email is required"
      },
      "countrycode": {
        notEmpty: true,
        errorMessage: "countrycode is required"
      },
      "country": {
        notEmpty: true,
        errorMessage: "countrycode is required"
      },
      "password": {
        notEmpty: true,
        errorMessage: "Password is required"
      },
      "countrycode": {
        notEmpty: true,
        errorMessage: "countrycode is required"
      },
      "contactno": {
        notEmpty: true,
        errorMessage: "contactno is required"
      },
      // "recaptcha": {
      //   notEmpty: true,
      //   errorMessage: "captcha is required"
      // }
    };

    var validate = passwordValidatorSchema
      .is().min(8)
      // .symbols()	                                 // Minimum length 8
      .is().max(100)
      .letters()                                // Maximum length 100
      // .has().uppercase()                              // Must have uppercase letters
      .has().lowercase()                              // Must have lowercase letters
      .has().digits()                                 // Must have digits
      .has().not().spaces()                       // Should not have spaces
    // .is().not().oneOf(['Password', 'Password123'])

    req.checkBody(schema);
    var errors = req.validationErrors();

    if (!errors) {
      const verificationURL = "https://www.google.com/recaptcha/api/siteverify?secret=" + captcha_secret + "&response=" + req.body['recaptcha'];
      await request(verificationURL, async (error, response, body) => {
        body = JSON.parse(body);
        if (body.success !== undefined && !body.success) {
          res.json({ "status": 0, "responseError": "Failed captcha verification" });
        }
        else {
          re = new RegExp(req.body.email, "i");
          value = {
            $regex: re
          };
          let user_resp = await common_helper.findOne(User, {
            "email": req.body.email.toLowerCase(),
            "is_del": false,
            "is_register": true
          });
          if (user_resp.status === 1) {
            res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Email address already Register" });
          } else {

            let role = await common_helper.findOne(Role, { 'role': 'candidate' }, 1)

            const [hash] = await Promise.all([common_helper.passwordHash(req.body.password)]);
            var user_reg_obg = {
              "email": req.body.email.toLowerCase(),
              "password": hash,
              "role_id": new ObjectId(role.data._id),
              "admin_rights": "no",
              "email_verified": false,
              "isAllow": false,
              "flag": 1,
              "createdate": new Date(),
              "is_email_change": false,
              "is_login_first": false,
              'is_register': true
            }

            if (passwordValidatorSchema.validate(req.body.password) == false) {
              res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Please Enter password of atleast 8 characters including 1 Lowercase and 1 Numerice character" })
            }
            else {

              const condition = {
                "email": req.body.email.toLowerCase(),
                "is_del": false,
                "is_register": false
              }
              var interest_user_resp = await User.findOneAndUpdate(condition, user_reg_obg, {
                new: true, upsert: true
              })

              if (interest_user_resp) {
                var reg_obj = {
                  "firstname": req.body.firstname,
                  "lastname": req.body.lastname,
                  "countrycode": req.body.countrycode,
                  "country": req.body.country,
                  "contactno": req.body.contactno,
                  "documenttype": req.body.documenttype,
                  "documentimage": req.body.documentImage,
                  "docmage": '',
                  "documentNumber": req.body.documentNumber,
                  "drivingLicenseState": req.body.drivingLicenseState,
                  "user_id": interest_user_resp._id,
                  "createdAt": new Date(),
                  "is_del": false,
                  "document_verified": false
                };

                if (req.files && req.files["documentimage"]) {

                  const file = req.files["documentimage"];
                  let mimetype = file.mimetype;
                  if (mimetype === "image/jpg" || mimetype === "image/jpeg" || mimetype === "image/png" || mimetype === 'application/pdf') {
                    let s3bucket = new aws.S3({
                      accessKeyId: config.ACCESS_KEY_ID,
                      secretAccessKey: config.SECRET_ACCESS_KEY,
                      Bucket: S3_BUCKET,
                    });
                    const folder = 'candidate/document'
                    s3bucket.createBucket(function () {
                      var currentfilename = file.name;
                      var rename = currentfilename.split('.');
                      var timestamp = moment().unix();
                      // this.FOLDER +  + '_' + file.name,
                      var uploded_file = rename[0] + '-' + timestamp + '.' + rename[1];

                      var params = {
                        Bucket: S3_BUCKET,
                        Key: `${folder}/${uploded_file}`,
                        Body: file.data,
                        ContentType: file.mimetype,
                      };
                      s3bucket.upload(params, async function (err, data) {
                        if (err) {
                          console.log('error in callback');
                          console.log(err);
                        }
                        console.log({ data });
                        const nameArray = data.key.split('.')
                        reg_obj.documentimage = data.key;
                        reg_obj.docimage = `${folder}/${uuid()}.${
                          nameArray[nameArray.length - 1]
                        }`;
                        console.log({ reg_obj });

                        var interest_resp = await Candidate_Detail.findOneAndUpdate({ user_id: interest_user_resp._id }, reg_obj, {
                          new: true,
                          upsert: true
                        });


                        if (!interest_resp) {
                          logger.debug("Error = ", interest_resp.error);
                          res.status(config.INTERNAL_SERVER_ERROR).json(interest_resp);
                        } else {
                          var reset_token = Buffer.from(jwt.sign({ "_id": interest_user_resp._id, "role": "candidate" },
                            config.ACCESS_TOKEN_SECRET_KEY, {
                            expiresIn: 60 * 60 * 24 * 3
                          }
                          )).toString('base64');

                          var time = new Date();
                          time.setMinutes(time.getMinutes() + 20);
                          time = btoa(time);
                          var message = await common_helper.findOne(MailType, { 'mail_type': 'candidate_email_confirmation' });

                          logger.trace("sending mail");
                          let mail_resp = await mail_helper.send("email_confirmation_template", {
                            "to": interest_user_resp.email,
                            "subject": "Welcome to the HireCommit | Verify Email"
                          }, {
                            "msg": message.data.content,
                            "name": interest_resp.firstname,
                            "upper_content": message.data.upper_content,
                            "lower_content": message.data.lower_content,
                            "confirm_url": config.WEBSITE_URL + '/confirmation/' + reset_token
                          });

                          if (mail_resp.status === 0) {
                            res.status(config.INTERNAL_SERVER_ERROR).json({ "status": 0, "message": "Error occured while sending confirmation email", "error": mail_resp.error });
                          } else {
                            res.json({
                              "status": 1, "message": "Candidate registration successful, confirmation mail sent to your email.", "data": interest_user_resp
                            })
                          }
                        }
                      });
                    });
                  } else {
                    res.status(config.VALIDATION_FAILURE_STATUS).json({ "status": 0, "message": "format is invalid" });
                  }
                }
              }
              else {
                res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Registration Faild." })
              }
            }
          }
        }
      });
    }
    else {
      logger.error("Validation Error = ", errors);
      res.status(config.BAD_REQUEST).json({ message: errors });
    }
  } catch (error) {
    return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
  }
});

router.get('/candidate_image', async (req, res) => {
  try {
    const candidateFound = await Candidate_Detail.findOne({docimage: req.query.key});
    if (!candidateFound)
      return res.status(404).json({ message: 'Image not found', success: false })

    const Key = candidateFound.documentimage[0]
    const tmpKey = Key.split('/')
    const path = tmpKey.slice(0, tmpKey.length - 2).join('/')
    const ext = tmpKey[tmpKey.length - 1].split('.').pop()

    candidateFound.docimage = `${path}/${uuid()}.${ext}`
    await Candidate_Detail.updateOne(
      { _id: candidateFound._id },
      { docimage: candidateFound.docimage }
    );

    const bucket = new aws.S3({
      accessKeyId: config.ACCESS_KEY_ID,
      secretAccessKey: config.SECRET_ACCESS_KEY,
      region: 'us-east-1'
    });

    const params = {
      Bucket: config.BUCKET_NAME,
      Key
    };

    bucket.getObject(params, (err, data) => {
      if (err) {
         res
          .status(config.NOT_FOUND)
          .json({ message: err.message, success: false });
      } else {
        return res
          .set('Content-Type', data.ContentType)
          .status(config.OK_STATUS)
          .send(data.Body);
      }
    });
  } catch (error) {
    return res
      .status(config.BAD_REQUEST)
      .json({ message: error.message, success: false });
  }
});

router.post('/check_document_size', async (req, res) => {
  try {
    if (req.files && req.files["documentimage"]) {
      var documentImage = req.files["documentimage"];
      if (documentImage.size > 5000000) {
        res.status(config.BAD_REQUEST).json({ "status": 0, "message": "This document file size to large, it's accepted only maximum 5 MB of file." });
      } else {
        var file = req.files['documentimage'];
        var files = [].concat(req.files.documentimage);
        async.eachSeries(
          files,
          function (file, loop_callback) {
            var mimetype = path.extname(file.name);
            var mimetype = ["image/jpeg", "image/png", 'application/pdf'];
            if (mimetype.indexOf((file.mimetype).toLowerCase()) != -1) {
              res.status(config.BAD_REQUEST).json({ "status": 1, "message": "Valid" });
            } else {
              res.status(config.BAD_REQUEST).json({ "status": 0, "message": "This file is not uploaded please add valid file.(ex. .jpeg, .png or .pdf)." });
            }
          })
      }
    }

    // if (documentImage.size > 5000000) {
    //
    // }
    // else {
    // res.status(config.OK_STATUS).json({ "status": 1, "message": "File Accepted" });
    // }
  } catch (error) {
    return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
  }
});

router.post('/check_document_number', async (req, res) => {
  try {
    // if (req.body.documentNumber !== "") {
    const RE = { $regex: new RegExp(`^${req.body.documentNumber}$`, 'gi') };

    var candidate_resp = await common_helper.find(Candidate_Detail,
      {
        "is_del": false,
        "documentNumber": RE
      });

    // console.log(' : candidate_resp ==> ', candidate_resp);
    if (candidate_resp.status == 1 && candidate_resp.data.length > 0) {
      res.status(config.BAD_REQUEST).json({ "status": 0, "message": "This Document Number is Already Registered." });
    } else {
      res.status(config.OK_STATUS).json({ "status": 1, "message": "This is Valid Document Number." });
    }
    // }
  } catch (err) {
    return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false });
  }
});

router.post('/check_candidate_email', async (req, res) => {
  try {
    let user_resp = await common_helper.findOne(User, {
      email: req.body.email.toLowerCase(),
      is_del: false,
      is_register: true
    });
    if (user_resp.status === 1) {
      res
        .status(config.BAD_REQUEST)
        .json({ status: 0, message: 'Email address already Register' });
    } else {
      res
        .status(config.OK_STATUS)
        .json({ status: 1, message: 'Email address not Register' });
    }
  } catch (error) {
    return res
      .status(config.BAD_REQUEST)
      .json({ message: error.message, success: false });
  }
});

// employer Registration
router.post("/employer_register", async (req, res) => {
  try {
    var schema = {
      "email": {
        notEmpty: true,
        errorMessage: "Email is required"
      },
      "password": {
        notEmpty: true,
        errorMessage: "Password is required"
      },
      "country": {
        notEmpty: true,
        errorMessage: "Country is required"
      },
      "businesstype": {
        notEmpty: true,
        errorMessage: "Businesstype is required"
      },
      "companyname": {
        notEmpty: true,
        errorMessage: "Companyname is required"
      },
      "username": {
        notEmpty: true,
        errorMessage: "UserName is required"
      },
      "countrycode": {
        notEmpty: true,
        errorMessage: "Countrycode is required"
      },
      "contactno": {
        notEmpty: true,
        errorMessage: "Contactno is required"
      },
      "recaptcha": {
        notEmpty: true,
        errorMessage: "captcha is required"
      }
    };

    // console.log(' : req.body ==> ', req.body);
    var validate = passwordValidatorSchema
      .is().min(8)
      // .symbols()	                                 // Minimum length 8
      .is().max(100)
      .letters()                                // Maximum length 100
      // .has().uppercase()                              // Must have uppercase letters
      .has().lowercase()                              // Must have lowercase letters
      .has().digits()                                 // Must have digits
      .has().not().spaces()                       // Should not have spaces
    // .is().not().oneOf(['Password', 'Password123'])

    req.checkBody(schema);

    var errors = req.validationErrors();
    if (!errors) {
      const verificationURL = "https://www.google.com/recaptcha/api/siteverify?secret=" + captcha_secret + "&response=" + req.body['recaptcha'];
      await request(verificationURL, async (error, response, body) => {
        body = JSON.parse(body);
        if (body.success !== undefined && !body.success) {
          res.json({ "status": 0, "responseError": "Failed captcha verification" });
        }
        else {
          let user_resp = await common_helper.findOne(User, { "email": req.body.email.toLowerCase(), "is_del": false })
          if (user_resp.status === 1) {
            res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Email address already Register" });
          } else {
            let role = await common_helper.findOne(Role, { 'role': 'employer' }, 1)
            var user_reg_obj = {
              "email": req.body.email.toLowerCase(),
              "password": req.body.password,
              "is_register": true,
              "role_id": new ObjectId(role.data._id)
            }

            if (passwordValidatorSchema.validate(req.body.password) == false) {
              res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Please Enter password of atleast 8 characters including 1 Lowercase and 1 Numerice character" })
            } else {

              var interest_user_resp = await common_helper.insert(User, user_reg_obj);

              if (interest_user_resp.status === 1) {
                var reg_obj = {
                  "country": req.body.country,
                  "businesstype": req.body.businesstype,
                  "companyname": req.body.companyname,
                  "website": req.body.website,
                  "username": req.body.username,
                  "countrycode": req.body.countrycode,
                  "contactno": req.body.contactno,
                  "user_id": new ObjectId(interest_user_resp.data.id)
                };
                var interest_resp = await common_helper.insert(Employer_Detail, reg_obj);

                var reset_token = Buffer.from(jwt.sign({ "_id": interest_user_resp.data._id, "role": "employer" },
                  config.ACCESS_TOKEN_SECRET_KEY, {
                  expiresIn: 60 * 60 * 24 * 3
                }
                )).toString('base64');

                var time = new Date();
                time.setMinutes(time.getMinutes() + 20);
                time = btoa(time);
                var message = await common_helper.findOne(MailType, { 'mail_type': 'employer_email_confirmation' });
                var upper_content = message.data.upper_content;
                var lower_content = message.data.lower_content;

                upper_content = upper_content.replace("{employername}", `${interest_resp.data.companyname} `);

                var name = interest_resp.data.username;
                var employerfirstname = name.substring(0, name.lastIndexOf(" "));
                logger.trace("sending mail");
                if (employerfirstname === "") {
                  employerfirstname = name;
                }

                let mail_resp = await mail_helper.send("email_confirmation_template", {
                  "to": interest_user_resp.data.email,
                  "subject": "Welcome to HireCommit | Verify Email"
                }, {
                  "msg": message.data.content,
                  "name": employerfirstname,
                  "upper_content": upper_content,
                  "lower_content": lower_content,
                  "confirm_url": config.WEBSITE_URL + "/confirmation/" + reset_token
                });
                if (mail_resp.status === 0) {
                  res.status(config.INTERNAL_SERVER_ERROR).json({ "status": 0, "message": "Error occured while sending confirmation email", "error": mail_resp.error });
                } else {
                  res.json({ "message": "Employer registration successful, confirmation mail sent to your email.", "data": interest_user_resp })
                }
              } else {
                res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Registration Faild." })
              }

            }
          }
        }
      });
    }
    else {
      logger.error("Validation Error = ", errors);
      res.status(config.BAD_REQUEST).json({ message: errors });
    }
  } catch (error) {
    return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
  }
});

router.post("/check_employer_email", async (req, res) => {
  try {

    let user_resp = await common_helper.findOne(User, { "email": req.body.email.toLowerCase(), "is_del": false })
    if (user_resp.status === 1) {
      res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Email address already Register" });
    } else {
      res.status(config.OK_STATUS).json({ "status": 1, "message": "Email address not Register" });
    }
  } catch (error) {
    return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
  }
});

router.post('/email_exists', async (req, res) => {
  try {
    var user_id = req.body.user_id;
    re = new RegExp(req.body.email, 'i');
    value = {
      $regex: re
    };
    if (req.body.email && req.body.email !== '') {
      var email = req.body.email.toLowerCase();
    }

    var user_resp = await common_helper.findOne(User, {
      _id: { $ne: ObjectId(user_id) },
      email: email,
      is_del: false
    });
    if (user_resp.status === 1) {
      res
        .status(config.BAD_REQUEST)
        .json({ status: 0, message: 'Email address already Register' });
    } else {
      res
        .status(config.OK_STATUS)
        .json({ status: 1, message: 'Email address not Register' });
    }
  } catch (error) {
    return res
      .status(config.BAD_REQUEST)
      .json({ message: error.message, success: false });
  }
});

router.post('/login', async (req, res) => {
  try {
    var schema = {
      'email': {
        notEmpty: true,
        errorMessage: "Email is required.",
        isEmail: { errorMessage: "Please enter valid email address" }
      },
      'password': {
        notEmpty: true,
        errorMessage: "password is required."
      },
      // "recaptcha": {
      //   notEmpty: true,
      //   errorMessage: "captcha is required"
      // }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
      const verificationURL = "https://www.google.com/recaptcha/api/siteverify?secret=" + captcha_secret + "&response=" + req.body['recaptcha'];
      await request(verificationURL, async (error, response, body) => {
        body = JSON.parse(body);
        if (body.success !== undefined && !body.success) {
          // res.json({ "status": 0, "responseError": "Failed captcha verification" });
          res.status(config.BAD_REQUEST).json({ message: "Failed captcha verification" });
        }
        else {
          let user_resp = await User.findOne({ "email": req.body.email.toLowerCase(), is_register: true, "is_del": false }).populate("role_id").lean();
          if (!user_resp) {
            var message = await common_helper.findOne(DisplayMessage, { 'msg_type': 'email_not_exist' });
            logger.trace("Login checked resp = ", user_resp);
            res.status(config.INTERNAL_SERVER_ERROR).json({ "status": 0, "message": message.data.content, "error": "We are not aware of this user" });
          }
          else if (user_resp) {
            logger.trace("valid token. Generating token");
            if ((bcrypt.compareSync(req.body.password, user_resp.password) && req.body.email.toLowerCase() == user_resp.email.toLowerCase())) {

              if (user_resp.role_id.role === "candidate") {
                if (user_resp.isAllow == true) {
                  var refreshToken = jwt.sign({ id: user_resp._id }, config.REFRESH_TOKEN_SECRET_KEY, {});
                  let update_resp = await common_helper.update(User, { "_id": user_resp._id }, { "refresh_token": refreshToken, "last_login": Date.now() });
                  var LoginJson = { id: user_resp._id, email: user_resp.email, role: user_resp.role_id.role };
                  var token = jwt.sign(LoginJson, config.ACCESS_TOKEN_SECRET_KEY, {
                    expiresIn: config.ACCESS_TOKEN_EXPIRE_TIME
                  });
                  delete user_resp.status;
                  delete user_resp.password;
                  delete user_resp.refresh_token;
                  delete user_resp.last_login_date;
                  delete user_resp.created_at;
                  logger.info("Token generated");

                  var userDetails = await User.aggregate([
                    {
                      $match: {
                        "email": req.body.email
                      }
                    },
                    {
                      $lookup:
                      {
                        from: "employerDetail",
                        localField: "_id",
                        foreignField: "user_id",
                        as: "employee"
                      }
                    },
                    {
                      $lookup:
                      {
                        from: "candidateDetail",
                        localField: "_id",
                        foreignField: "user_id",
                        as: "candidate"
                      }
                    },
                    {
                      $addFields: {
                        userDetail: {
                          $concatArrays: ["$candidate", "$employee"]
                        }
                      }
                    },
                    {
                      $unwind: {
                        path: "$userDetail"
                      }
                    },
                    {
                      $project: {
                        "userDetail": "$userDetail"
                      }
                    },
                    {
                      $lookup:
                      {
                        from: "country_datas",
                        localField: "userDetail.country",
                        foreignField: "_id",
                        as: "country"
                      }
                    },

                    {
                      $unwind: {
                        path: "$country",
                        preserveNullAndEmptyArrays: true
                      },
                    },
                    {
                      $lookup:
                      {
                        from: "document_type",
                        localField: "userDetail.documenttype",
                        foreignField: "_id",
                        as: "document"
                      }
                    },
                    {
                      $unwind:
                      {
                        path: "$document",
                        preserveNullAndEmptyArrays: true
                      }
                    },
                    {
                      $lookup:
                      {
                        from: "business_type",
                        localField: "userDetail.businesstype",
                        foreignField: "_id",
                        as: "business"
                      }
                    },
                    {
                      $unwind:
                      {
                        path: "$business",
                        preserveNullAndEmptyArrays: true
                      }
                    }

                  ])
                  res.status(config.OK_STATUS).json({ "status": 1, "message": "Logged in successfully", "data": user_resp, "token": token, "refresh_token": refreshToken, "userDetails": userDetails, "role": user_resp.role_id.role, id: user_resp._id });
                } else {
                  var message = await common_helper.findOne(DisplayMessage, { 'msg_type': 'candidate_not_approve' });
                  res.status(config.UNAUTHORIZED).json({ "status": 0, "isApproved": false, "message": message.data.content });
                }
              } else if (user_resp.role_id.role === "employer") {
                if (user_resp.email_verified == true) {
                  if (user_resp.isAllow == true) {
                    var refreshToken = jwt.sign({ id: user_resp._id }, config.REFRESH_TOKEN_SECRET_KEY, {});
                    let update_resp = await common_helper.update(User, { "_id": user_resp._id }, { "refresh_token": refreshToken, "last_login": Date.now() });

                    var LoginJson = { id: user_resp._id, email: user_resp.email, role: user_resp.role_id.role };
                    var token = jwt.sign(LoginJson, config.ACCESS_TOKEN_SECRET_KEY, {
                      expiresIn: config.ACCESS_TOKEN_EXPIRE_TIME
                    });
                    delete user_resp.status;
                    delete user_resp.password;
                    delete user_resp.refresh_token;
                    delete user_resp.last_login_date;
                    delete user_resp.created_at;
                    logger.info("Token generated");

                    var userDetails = await User.aggregate([
                      {
                        $match: {
                          "email": req.body.email
                        }
                      },
                      {
                        $lookup:
                        {
                          from: "employerDetail",
                          localField: "_id",
                          foreignField: "user_id",
                          as: "employee"
                        }
                      },
                      {
                        $lookup:
                        {
                          from: "candidateDetail",
                          localField: "_id",
                          foreignField: "user_id",
                          as: "candidate"
                        }
                      },
                      {
                        $addFields: {
                          userDetail: {
                            $concatArrays: ["$candidate", "$employee"]
                          }
                        }
                      },
                      {
                        $unwind: {
                          path: "$userDetail"
                        }
                      },
                      {
                        $project: {
                          "userDetail": "$userDetail"
                        }
                      },
                      {
                        $lookup:
                        {
                          from: "country_datas",
                          localField: "userDetail.country",
                          foreignField: "_id",
                          as: "country"
                        }
                      },

                      {
                        $unwind: {
                          path: "$country",
                          preserveNullAndEmptyArrays: true
                        },
                      },
                      {
                        $lookup:
                        {
                          from: "document_type",
                          localField: "userDetail.documenttype",
                          foreignField: "_id",
                          as: "document"
                        }
                      },
                      {
                        $unwind:
                        {
                          path: "$document",
                          preserveNullAndEmptyArrays: true
                        }
                      },
                      {
                        $lookup:
                        {
                          from: "business_type",
                          localField: "userDetail.businesstype",
                          foreignField: "_id",
                          as: "business"
                        }
                      },
                      {
                        $unwind:
                        {
                          path: "$business",
                          preserveNullAndEmptyArrays: true
                        }
                      }

                    ])
                    res.status(config.OK_STATUS).json({ "status": 1, "message": "Logged in successfully", "data": user_resp, "token": token, "refresh_token": refreshToken, "userDetails": userDetails, "role": user_resp.role_id.role, id: user_resp._id });
                  } else {
                    var message = await common_helper.findOne(DisplayMessage, { 'msg_type': 'employer_not_approve' });
                    res.status(config.UNAUTHORIZED).json({
                      "status": 0, "isApproved": false, "message": message.data.content
                    });
                  }
                } else {
                  res.status(config.UNAUTHORIZED).json({ "status": 0, "message": "Email address not verified" });
                }
              } else {
                if (user_resp.email_verified == true) {
                  if (user_resp.isAllow == true) {
                    var refreshToken = jwt.sign({ id: user_resp._id }, config.REFRESH_TOKEN_SECRET_KEY, {});
                    let update_resp = await common_helper.update(User, { "_id": user_resp._id }, { "refresh_token": refreshToken, "last_login": Date.now() });

                    var LoginJson = { id: user_resp._id, email: user_resp.email, role: user_resp.role_id.role };
                    var token = jwt.sign(LoginJson, config.ACCESS_TOKEN_SECRET_KEY, {
                      expiresIn: config.ACCESS_TOKEN_EXPIRE_TIME
                    });
                    delete user_resp.status;
                    delete user_resp.password;
                    delete user_resp.refresh_token;
                    delete user_resp.last_login_date;
                    delete user_resp.created_at;
                    logger.info("Token generated");

                    var userDetails = await User.aggregate([
                      {
                        $match: {
                          "email": req.body.email
                        }
                      },
                      {
                        $lookup:
                        {
                          from: "employerDetail",
                          localField: "_id",
                          foreignField: "user_id",
                          as: "employee"
                        }
                      },
                      {
                        $lookup:
                        {
                          from: "candidateDetail",
                          localField: "_id",
                          foreignField: "user_id",
                          as: "candidate"
                        }
                      },
                      {
                        $addFields: {
                          userDetail: {
                            $concatArrays: ["$candidate", "$employee"]
                          }
                        }
                      },
                      {
                        $unwind: {
                          path: "$userDetail"
                        }
                      },
                      {
                        $project: {
                          "userDetail": "$userDetail"
                        }
                      },
                      {
                        $lookup:
                        {
                          from: "country_datas",
                          localField: "userDetail.country",
                          foreignField: "_id",
                          as: "country"
                        }
                      },

                      {
                        $unwind: {
                          path: "$country",
                          preserveNullAndEmptyArrays: true
                        },
                      },
                      {
                        $lookup:
                        {
                          from: "document_type",
                          localField: "userDetail.documenttype",
                          foreignField: "_id",
                          as: "document"
                        }
                      },
                      {
                        $unwind:
                        {
                          path: "$document",
                          preserveNullAndEmptyArrays: true
                        }
                      },
                      {
                        $lookup:
                        {
                          from: "business_type",
                          localField: "userDetail.businesstype",
                          foreignField: "_id",
                          as: "business"
                        }
                      },
                      {
                        $unwind:
                        {
                          path: "$business",
                          preserveNullAndEmptyArrays: true
                        }
                      }

                    ])
                    res.status(config.OK_STATUS).json({ "status": 1, "message": "Logged in successfully", "data": user_resp, "token": token, "refresh_token": refreshToken, "userDetails": userDetails, "role": user_resp.role_id.role, id: user_resp._id });
                  } else {
                    res.status(config.UNAUTHORIZED).json({ "status": 0, "message": "This user is not approved." });
                  }
                } else {
                  res.status(config.UNAUTHORIZED).json({ "status": 0, "message": "Email address not verified" });
                }
              }
            }
            else {
              res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Invalid email address or password" });
            }
          }
          else {
            res.status(config.BAD_REQUEST).json({ message: "Your email is not registered" });
          }
        }
      });
    }
    else {
      res.status(config.BAD_REQUEST).json({ message: "Invalid email" });
    }
  } catch (error) {
    return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
  }
});

router.post('/email_verify', async (req, res) => {
  try {

    logger.trace("Verifying JWT");
    jwt.verify(Buffer.from(req.body.token, 'base64').toString(), config.ACCESS_TOKEN_SECRET_KEY, async (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          logger.trace("Link has expired");
          res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Link has been expired" });
        } else {
          logger.trace("Invalid link");
          res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Invalid token sent" });
        }
      } else {
        var user_resp = await common_helper.findOne(User, { "_id": decoded._id }, 1);
        if (user_resp.status === 0) {
          logger.error("Error occured while finding user by id - ", req.params.id, user_resp.error);
          res.status(config.INTERNAL_SERVER_ERROR).json({ "status": 0, "message": "Error has occured while finding user" });
        } else if (user_resp.status === 2) {
          logger.trace("User not found in user email verify API");
          res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Invalid token entered" });
        } else {
          if (user_resp && user_resp.status == 1 && user_resp.data.email_verified == true) {
            logger.trace("user already verified");
            res.status(config.BAD_REQUEST).json({ "message": "Email Already verified" });
          }
          else {
            if (user_resp && user_resp.status == 1) {
              var user_update_resp = await User.updateOne({ "_id": new ObjectId(user_resp.data._id) }, { $set: { "email_verified": true } });
            }

            res.status(config.OK_STATUS).json({ "status": 1, "message": "Email has been verified", "role": decoded.role });

            if (user_resp.data.role_id == "5d9d98a93a0c78039c6dd00d") {
              var user_name = await common_helper.findOne(Employer_Detail, { 'user_id': user_resp.data._id });
              var name = user_name.data.username;
              name_split = name.substring(0, name.lastIndexOf(" "));
              if (name_split === "") {
                name_split = name;
              }

              var message = await common_helper.findOne(MailType, { 'mail_type': 'employer-email-verified' });
              var upper_content = message.data.upper_content;
              var lower_content = message.data.lower_content;

            } else if (user_resp.data.role_id == "5d9d99003a0c78039c6dd00f") {
              var user_name = await common_helper.findOne(SubEmployer_Detail, { 'user_id': user_resp.data._id });
              name = user_name.data.username;
              var name = user_name.data.username;
              name_split = name.substring(0, name.lastIndexOf(" "));
              if (name_split === "") {
                name_split = name;
              }
              var message = await common_helper.findOne(MailType, { 'mail_type': 'employer-email-verified' });
              var upper_content = message.data.upper_content;
              var lower_content = message.data.lower_content;

            } else if (user_resp.data.role_id == "5d9d98e13a0c78039c6dd00e") {
              var user_name = await common_helper.findOne(Candidate_Detail, { 'user_id': user_resp.data._id });
              name = user_name.data.firstname;
              var message = await common_helper.findOne(MailType, { 'mail_type': 'candidate-email-verified' });
              var upper_content = message.data.upper_content;
              var lower_content = message.data.lower_content;
            }

            logger.trace("sending mail");
            let mail_resp = await mail_helper.send("welcome_email", {
              "to": user_resp.data.email,
              "subject": "Welcome to HireCommit | Email Verified"
            }, {
              "name": name,
              "upper_content": upper_content,
              "lower_content": lower_content,
              'msg': message.data.content,
            });

          }
        }
      }
    });
  } catch (error) {
    return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
  }
});

router.post('/forgot_password', async (req, res) => {
  try {
    var schema = {
      'email': {
        notEmpty: true,
        errorMessage: "Email is required.",
        isEmail: { errorMessage: "Please enter valid email address" }
      }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
      var user = await common_helper.findOne(User, { "email": req.body.email.toLowerCase() }, 1)
      if (user.status === 0) {
        res.status(config.INTERNAL_SERVER_ERROR).json({ "status": 0, "message": "Error while finding email" });
      } else if (user.status === 2) {
        res.status(config.BAD_REQUEST).json({ "status": 0, "message": "No user available with given email" });
      } else if (user.status === 1) {
        if (user.data.is_del == false) {

          var name;
          if (user.data.role_id == "5d9d98a93a0c78039c6dd00d") {
            var user_name = await common_helper.findOne(Employer_Detail, { "user_id": user.data._id });
            name = user_name.data.username;
            name = name.substring(0, name.lastIndexOf(" "));
            if (!name) {
              name = user_name.data.username;
            }
          } else if (user.data.role_id == "5d9d99003a0c78039c6dd00f") {
            var user_name = await common_helper.findOne(SubEmployer_Detail, { "user_id": user.data._id });
            name = user_name.data.username;
            name = name.substring(0, name.lastIndexOf(" "));
            if (!name) {
              name = user_name.data.username;
            }
          } else if (user.data.role_id == "5d9d98e13a0c78039c6dd00e") {
            var user_name = await common_helper.findOne(Candidate_Detail, { "user_id": user.data._id });
            name = user_name.data.firstname;
          }

          var reset_token = Buffer.from(jwt.sign({ "_id": user.data._id }, config.ACCESS_TOKEN_SECRET_KEY, {
            expiresIn: 60 * 60 * 24 * 3
          })).toString('base64');
          var time = new Date();
          time.setMinutes(time.getMinutes() + 20);
          time = btoa(time);
          var up = {
            "flag": 0
          }
          var resp_data = await common_helper.update(User, { "_id": user.data._id }, up);
          var message = await common_helper.findOne(MailType, { 'mail_type': 'forgot-password-mail' });
          let upper_content = message.data.upper_content;
          let lower_content = message.data.lower_content;


          upper_content = upper_content.replace('{email}', req.body.email.toLowerCase());

          let mail_resp = await mail_helper.send("reset_password", {
            "to": user.data.email,
            "subject": "Password Reset"
          }, {
            "name": name,
            "upper_content": upper_content,
            "lower_content": lower_content,
            "reset_link": config.WEBSITE_URL + "reset-password/" + reset_token
          });
          if (mail_resp.status === 0) {
            res.status(config.INTERNAL_SERVER_ERROR).json({ "status": 0, "message": "Error occured while sending mail", "error": mail_resp.error });
          } else {
            res.status(config.OK_STATUS).json({ "status": 1, "message": "Reset link was sent to your email address" });
          }
        }
        else {
          res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Your email doesn't exists" });
        }
      }
    }
    else {
      res.status(config.BAD_REQUEST).json({ message: errors });
    }
  } catch (error) {
    return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
  }
});

// reset password
router.post('/reset_password', async (req, res) => {
  try {
    var schema = {
      'token': {
        notEmpty: true,
        errorMessage: "Reset password token is required."
      },
      'password': {
        notEmpty: true,
        errorMessage: "Password is required."
      }
    };
    var validat = passwordValidatorSchema
      .is().min(8)
      // .symbols()	                                 // Minimum length 8
      .is().max(100)
      .letters()                                // Maximum length 100
      // .has().uppercase()                              // Must have uppercase letters
      .has().lowercase()                              // Must have lowercase letters
      .has().digits()                                 // Must have digits
      .has().not().spaces()                       // Should not have spaces
      .is().not().oneOf(['Passw0rd', 'Password123'])
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
      logger.trace("Verifying JWT");
      jwt.verify(Buffer.from(req.body.token, 'base64').toString(), config.ACCESS_TOKEN_SECRET_KEY, async (err, decoded) => {
        if (err) {
          if (err.name === "TokenExpiredError") {
            logger.trace("Link has expired");
            res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Link has been expired" });
          } else {
            logger.trace("Invalid link");
            res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Invalid token sent" });
          }
        } else {
          if (passwordValidatorSchema.validate(req.body.password) == false) {
            res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Please Enter password of atleast 8 characters including 1 Lowercase and 1 Numerice character" })
          } else {
            var reset_user = await common_helper.findOne(User, { "_id": decoded._id }, 1);
            if (reset_user.data && reset_user.status === 1) {
              if (reset_user.data.flag == 0) {
                if (decoded._id) {
                  var update_resp = await common_helper.update(User, { "_id": decoded._id }, { "password": bcrypt.hashSync(req.body.password, saltRounds), "flag": 1 });
                  if (update_resp.status === 0) {
                    logger.trace("Error occured while updating : ", update_resp.error);
                    res.status(config.INTERNAL_SERVER_ERROR).json({ "status": 0, "message": "Error occured while verifying user's email" });
                  } else if (update_resp.status === 2) {
                    logger.trace("not updated");
                    res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Error occured while reseting password of user" });
                  } else {
                    logger.trace("Password has been changed - ", decoded._id);
                    var name;
                    var role;
                    if (update_resp.data.role_id == "5d9d98a93a0c78039c6dd00d") {
                      var user_name = await common_helper.findOne(Employer_Detail, { "user_id": update_resp.data._id });
                      name = user_name.data.username;
                      name = name.substring(0, name.lastIndexOf(" "));
                      if (!name) {
                        name = user_name.data.username;
                      }
                      role = "employer";
                    } else if (update_resp.data.role_id == "5d9d99003a0c78039c6dd00f") {
                      var user_name = await common_helper.findOne(SubEmployer_Detail, { "user_id": update_resp.data._id });
                      name = user_name.data.username;
                      name = name.substring(0, name.lastIndexOf(" "));
                      if (!name) {
                        name = user_name.data.username;
                      }
                      role = "sub-employer";
                    } else if (update_resp.data.role_id == "5d9d98e13a0c78039c6dd00e") {
                      var user_name = await common_helper.findOne(Candidate_Detail, { "user_id": update_resp.data._id });
                      name = user_name.data.firstname;
                      role = "candidate";
                    }
                    var message = await common_helper.findOne(MailType, { 'mail_type': 'forgot-password-success-mail' });
                    let upper_content = message.data.upper_content;
                    let lower_content = message.data.lower_content;
                    let mail_resp = await mail_helper.send("reset_password_success", {
                      "to": update_resp.data.email,
                      "subject": "Password Reset Successful"
                    }, {
                      "name": name,
                      "upper_content": upper_content,
                      "lower_content": lower_content,
                    });

                    res.status(config.OK_STATUS).json({ "status": 1, "message": "Password has been changed", "role": role });
                  }
                }
              }
              else {
                res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Link has been expired" });
              }
            }
          }
        }
      });
    } else {
      res.status(config.BAD_REQUEST).json({ message: errors });
    }
  } catch (error) {
    return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
  }
});

//change password
router.put('/change_password', async (req, res) => {
  try {
    var schema = {
      'token': {
        notEmpty: true,
        errorMessage: "Change password token is required."
      },
      'oldpassword': {
        notEmpty: true,
        errorMessage: "Old password is required."
      },
      'newpassword': {
        notEmpty: true,
        errorMessage: "New Password is required."
      }
    };

    var validate = passwordValidatorSchema
      .is().min(8)
      // .symbols()	                                 // Minimum length 8
      .is().max(100)
      .letters()                                // Maximum length 100
      // .has().uppercase()                              // Must have uppercase letters
      .has().lowercase()                              // Must have lowercase letters
      .has().digits()                                 // Must have digits
      .has().not().spaces()                       // Should not have spaces
      .is().not().oneOf(['Password', 'Password123'])
    req.checkBody(schema);
    var errors = req.validationErrors();

    if (!errors) {
      logger.trace("Verifying JWT");
      jwt.verify(req.body.token, config.ACCESS_TOKEN_SECRET_KEY, async (err, decoded) => {
        if (err) {
          res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Invalid Token" });
        }
        if (passwordValidatorSchema.validate(req.body.newpassword) == false) {
          res.status(config.BAD_REQUEST).json({ "status": 0, "message": "" })
        }
        else {

          const user = await common_helper.findOne(User, { "_id": decoded.id }, 1);

          if (user.data && user.status === 1) {
            if (bcrypt.compareSync(req.body.oldpassword, user.data.password)) {
              const update_resp = await common_helper.update(User, { "_id": decoded.id }, { "password": bcrypt.hashSync(req.body.newpassword, saltRounds) });
              if (update_resp.status === 1) {
                if (decoded.role === 'sub-employer') {
                  var user_resp = await common_helper.findOne(User, { "_id": decoded.id });
                  if (user_resp.data.is_login_first === false) {
                    var obj = {
                      'is_login_first': true
                    }
                    var user_resp = await common_helper.update(User, { "_id": decoded.id }, obj);
                  }
                }

                logger.trace("Password has been changed - ", decoded.id);
                res.status(config.OK_STATUS).json({ "status": 1, "message": "Password has been changed" });
              }
              else {
                res.status(config.BAD_REQUEST).json({ "message": "Error occured while change password of admin" });
              }
            } else {
              res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Old password does not match." });
            }
          }
          else if (user.status === 0) {
            logger.trace("Change password checked resp = ", user);
            res.status(config.INTERNAL_SERVER_ERROR).json({ "status": 0, "message": "Something went wrong while finding user", "error": user.error });
          }
          else {
            res.status(config.NOT_FOUND).json({ "status": 2, "message": "NOT_FOUND" });
          }
        }
      })
    }
    else {
      res.status(config.BAD_REQUEST).json({ message: errors });
    }
  } catch (error) {
    return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
  }
})

router.post('/match_old_password', async (req, res) => {
  try {
    // var password_dcrypt = await common_helper.passwordHash(req.body.oldpassword);
    var password = await common_helper.findOne(User, { "_id": req.body.id });
    const match = await bcrypt.compare(req.body.oldpassword, password.data.password);

    if (match) {
      res.status(config.OK_STATUS).json({ "status": 1, "message": "Password is matched." });
    } else {
      res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Password is not matched." });
    }
  } catch (error) {
    return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
  }
})

router.post('/test_mail', async (req, res) => {
  try {
    var message = "welcome";
    var reqBody = await common_helper.findOne(RepliedMail, { "_id": "5e4a79be6723ed00176f3504" });

    var reply_data = reqBody.data.message.email;
    var mailparser = new MailParser();
    mailparser.on("end", function (reply_data) {
      const attachments = [];
      reply_data.attachments.map(e => attachments.push({ filename: e.fileName, content: e.content }));
         mail_helper.reply_mail_send("forword_email", {
          "to": "vik@narola.email",
          "from": "vishalkanojiya9727@gmail.com",
          "subject": "Reply Mail",
          "attachments": attachments
        }, {
          'html': reply_data.html
        });
        });
      mailparser.write(reply_data);
      mailparser.end();
    res.status(200).send('success');
  } catch (error) {
    return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
  }
})

router.post('/email_opened', async (req, res) => {
  try {
    console.log(req.body);
    const reqBody = req.body[0];
    if (reqBody.trackid && reqBody.trackid !== "") {
      var open_id = reqBody.trackid;
      var length = open_id.length;
      if (length > 24) {
        var split_data = open_id.split("_");
        if (split_data.length == 3 && split_data[2] === "communication") {
          var offer_id = split_data[0];
          var communication_id = split_data[1];

          var previous_status = await common_helper.findOne(Offer,
            { "_id": offer_id, "communication._id": communication_id, "communication.open": false })
          if (previous_status.status == 1) {
            var update_offer_communication = await common_helper.update(Offer,
              { "_id": offer_id, "communication._id": communication_id },
              {
                $set: {
                  "communication.$.open": true,
                  "communication.$.open_date": new Date()
                }
              })
            console.log(' : success comm ==> ');
          } else if (previous_status.status == 2) {
            res.status(config.BAD_REQUEST).json({ "status": 2, "message": "No data found" });
          } else {
            res.status(config.BAD_REQUEST).json({ "status": 2, "message": "Error occurred while updating data." });
          }
        } else if (split_data.length == 3 && split_data[2] === "adhoc") {
          var offer_id = split_data[0];
          var adhoc_id = split_data[1];

          var previous_status = await common_helper.findOne(Offer,
            { "_id": offer_id, "AdHoc._id": adhoc_id, "AdHoc.AdHoc_open": false });

          if (previous_status.status == 1) {
            var update_offer_communication = await common_helper.update(Offer,
              { "_id": offer_id, "AdHoc._id": adhoc_id },
              {
                $set: {
                  "AdHoc.$.AdHoc_open": true,
                  "AdHoc.$.AdHoc_open_date": new Date()
                }
              })

            console.log('success  ==> success');
            res.send("success");
          } else if (previous_status.status == 2) {
            res.status(config.BAD_REQUEST).json({ "status": 2, "message": "No data found" });
          } else {
            res.status(config.BAD_REQUEST).json({ "status": 2, "message": "Error occurred while updating data." });
          }
        }
      } else {
        console.log("No Track Id Found..!");
        // var offer_resp = await common_helper.findOne(Offer, { "_id": open_id });
        // var obj = {
        //   email_open: true,
        //   open_At: new Date()
        // }
        // if (offer_resp.status == 1 && offer_resp.data.email_open === false && reqBody.event === 'open') {
        //   var offer_update_resp = await common_helper.update(Offer, { "_id": open_id }, obj);
        //   reqBody = [];
        // } else {
        //   reqBody = [];
        //   console.log('Offer is already opened..! Or offer is deleted..!');
        // }
      }
    } else {
      console.log("No Track Id Found..!");
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
})

router.post('/get_email', async (req, res) => {
  try {
    const reqBody = req.body;
    var reply_data = reqBody.email;
    str = `${reqBody.to}`;
    result = str.substring(str.indexOf("<") + 1, str.indexOf(">"));
    var receive_id;
    if (result) {
      var receive_id = result;
    } else {
      var receive_id = reqBody.to;
    }
    var id = receive_id.substring(0, receive_id.lastIndexOf("@"));
    var length = id.length;

    if (length > 24) {
      var split_data = id.split("_");
      if (split_data.length == 3 && split_data[2] === "communication") {
        var offer_id = split_data[0];
        var communication_id = split_data[1];
        var mail = await common_helper.insert(RepliedMail, { "offerid": offer_id, "message": reqBody });

        var previous_status = await common_helper.findOne(Offer, { "_id": offer_id, "communication._id": communication_id, "communication.reply": false });

        var previous_status1 = await common_helper.findOne(Offer, { "_id": offer_id, "communication._id": communication_id, "communication.reply": true });

        var previous_status2 = await common_helper.findOne(Offer, { "_id": offer_id, "communication._id": communication_id, "communication.open": false });

        if (previous_status2.status == 1) {
          var update_communication = await Offer.findOneAndUpdate({ "_id": offer_id, "communication._id": communication_id }, {
            $set: {
              "communication.$.reply": true,
              "communication.$.reply_date": new Date(),
              "communication.$.open": true,
              "communication.$.open_date": new Date()
            }
          }).populate('created_by', { email: 1 }).lean();
        } else if (previous_status.status == 1) {
          var update_communication = await Offer.findOneAndUpdate({ "_id": offer_id, "communication._id": communication_id }, {
            $set: {
              "communication.$.reply": true,
              "communication.$.reply_date": new Date()
            }
          }).populate('created_by', { email: 1 }).lean();
        } else if (previous_status1.status == 1) {
          var update_communication = await Offer.findOneAndUpdate({ "_id": offer_id, "communication._id": communication_id }, {
            $set: {
              "communication.$.reply": true
            }
          }).populate('created_by', { email: 1 }).lean();
        }

        var all_employer = await common_helper.find(User, { $or: [{ "_id": update_communication.employer_id }, { "emp_id": update_communication.employer_id }] });
        for (const emp of all_employer.data) {
          var mailparser = new MailParser();
          mailparser.on("end", function (reply_data) {
            // let mail_resp = mail_helper.reply_mail_send("forword_email", {
            //   "to": emp.email,
            //   "from": reply_data.from,
            //   "subject": reply_data.subject
            // }, {
            //   'html': reply_data.html
            // });

            const attachments = [];
            reply_data.attachments.map(e => attachments.push({ filename: e.fileName, content: e.content }));
              mail_helper.reply_mail_send("forword_email", {
                "to": emp.email,
                "from": reply_data.from,
                "subject": reply_data.subject,
                "attachments": attachments
              }, {
                'html': reply_data.html
              });
          });

          mailparser.write(reply_data);
          mailparser.end();
        }
        res.status(200).send('success');
      }

      if (split_data.length == 3 && split_data[2] === "adhoc") {
        // console.log("adhoc");
        var offer_id = split_data[0];
        var adhoc_id = split_data[1];
        var mail = await common_helper.insert(RepliedMail, { "offerid": offer_id, "message": reqBody });

        var previous_status = await common_helper.findOne(Offer, { "_id": offer_id, "AdHoc._id": adhoc_id, "AdHoc.AdHoc_reply": false });
        var previous_status1 = await common_helper.findOne(Offer, { "_id": offer_id, "AdHoc._id": adhoc_id, "AdHoc.AdHoc_reply": true });
        var previous_status2 = await common_helper.findOne(Offer, { "_id": offer_id, "AdHoc._id": adhoc_id, "AdHoc.AdHoc_open": false });

        if (previous_status2.status == 1) {
          console.log(' : "inside" ==> ', "inside");
          var update_communication = await Offer.findOneAndUpdate({ "_id": offer_id, "AdHoc._id": adhoc_id }, {
            $set: {
              "AdHoc.$.AdHoc_reply": true,
              "AdHoc.$.AdHoc_reply_date": new Date(),
              "AdHoc.$.AdHoc_open": true,
              "AdHoc.$.AdHoc_open_date": new Date()
            }
          }).populate('created_by', { email: 1 }).lean();
        } else if (previous_status.status == 1) {
          console.log(' : "inside 1" ==> ', "inside 1");
          var update_communication = await Offer.findOneAndUpdate({ "_id": offer_id, "AdHoc._id": adhoc_id }, {
            $set: {
              "AdHoc.$.AdHoc_reply": true,
              "AdHoc.$.AdHoc_reply_date": new Date()
            }
          }).populate('created_by', { email: 1 }).lean();
        } else if (previous_status1.status == 1) {
          var update_communication = await Offer.findOneAndUpdate({ "_id": offer_id, "AdHoc._id": adhoc_id }, {
            $set: {
              "AdHoc.$.AdHoc_reply": true
            }
          }).populate('created_by', { email: 1 }).lean();
        }

        var all_employer = await common_helper.find(User, { $or: [{ "_id": update_communication.employer_id }, { "emp_id": update_communication.employer_id }] });
        for (const emp of all_employer.data) {
          var mailparser = new MailParser();
          mailparser.on("end", function (reply_data) {
            // let mail_resp = mail_helper.reply_mail_send("forword_email", {
            //   "to": emp.email,
            //   "from": reply_data.from,
            //   "subject": reply_data.subject
            // }, {
            //   'html': reply_data.html
            // });
            const attachments = [];
            reply_data.attachments.map(e => attachments.push({ filename: e.fileName, content: e.content }));
              mail_helper.reply_mail_send("forword_email", {
                "to": emp.email,
                "from": reply_data.from,
                "subject": reply_data.subject,
                "attachments": attachments
              }, {
                'html': reply_data.html
              });
          });

          mailparser.write(reply_data);
          mailparser.end();
        }
        res.status(200).send('success');
      }
    } else {
      console.log("No id found..!");
      // var offer_resp = await common_helper.findOne(Offer, { "_id": id });
      // //  && offer_resp.data.reply === false
      // if (offer_resp.status == 1) {
      //   var all_employer = await common_helper.find(User, { $or: [{ "_id": offer_resp.data.employer_id }, { "emp_id": offer_resp.data.employer_id }] });
      //   var mail = await common_helper.insert(RepliedMail, { "offerid": id, "message": reqBody });
      //   var offer = await Offer.findOneAndUpdate({ "_id": id }, { "reply": true, "reply_At": new Date() }).populate('created_by', { email: 1 }).lean();
      //   for (const emp of all_employer.data) {


      //     // console.log(' : reply_data ==> ', reqBody);
      //     // mail_helper.forwardRepliedMail({
      //     //   // offer.created_by.email
      //     //   to: emp.email,
      //     //   from: reqBody.from,
      //     //   subject: reqBody.subject,
      //     //   content: reqBody.email,
      //     //   filename: `${mail.data._id}.eml`,
      //     //   html: '<p>Here’s an attachment of replied mail of candidate for you!</p>'
      //     // }, (err, info) => {
      //     //   if (err) {
      //     //     console.log(error);
      //     //   }
      //     //   else {
      //     //     console.log('Message forwarded: ' + info.response);
      //     //   }
      //     // });
      //     // console.log(' : reply_data ==> ', reply_data);
      //     var mailparser = new MailParser();
      //     mailparser.on("end", function (reply_data) {
      //       let mail_resp = mail_helper.reply_mail_send("forword_email", {
      //         "to": emp.email,
      //         "from": reply_data.from,
      //         "subject": reply_data.subject
      //       }, {
      //         'html': reply_data.html
      //       });
      //     });

      //     mailparser.write(reply_data);
      //     mailparser.end();
      //   }
      //   res.status(200).send('success');
      // } else {
      //   console.log("Already replied..! Or offer was deleted..!");
      // }
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
})

async function getCountry(req, res) {
  try {

    const country = await CountryData.find({ $or: [{ "country": "India" }, { "country": "United States" }] }).lean();
    return res.status(config.OK_STATUS).json({
      success: true, message: 'country list fetched successfully.',
      data: country
    });
  } catch (error) {
    return res.status(config.INTERNAL_SERVER_ERROR).send({
      success: false,
      message: 'Error in Fetching country data', data: country
    });
  }
}

router.get('/business_type/:country', async (req, res) => {
  try {
    const country = await BusinessType.find({ "country": req.params.country }).lean();
    const document = await DocumentType.find({ "country": req.params.country }).lean();
    return res.status(config.OK_STATUS).json({
      success: true, message: 'country list fetched successfully.',
      data: country, document
    });
  } catch (error) {
    return res.status(config.INTERNAL_SERVER_ERROR).send({
      success: false,
      message: 'Error in Fetching country data', data: country
    });
  }
})

router.get('/country', getCountry);
router.get('/country/:id', getCountry);

router.get('/employer_landing_page', async (req, res) => {
  try {
    var landing_page_resp = await common_helper.findOne(Employer_Landing_Page, {});
    if (landing_page_resp.status == 1) {
      res.status(config.OK_STATUS).json({ "status": 1, "data": landing_page_resp.data, "message": "" });
    } else {
      res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Something faild while featching data from database." });
    }
  } catch (err) {
    return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
  }
})

router.get('/candidate_landing_page', async (req, res) => {
  try {
    var landing_page_resp = await common_helper.findOne(Candidate_Landing_Page, {});
    if (landing_page_resp.status == 1) {
      res.status(config.OK_STATUS).json({ "status": 1, "data": landing_page_resp.data, "message": "" });
    } else {
      res.status(config.BAD_REQUEST).json({ "status": 0, "message": "Something faild while featching data from database." });
    }
  } catch (err) {
    return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
  }
})

module.exports = router;
