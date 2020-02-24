const express = require("express");
const router = express.Router();
const async = require("async");

const config = require("../../config");
const ObjectId = require("mongoose").Types.ObjectId;
const common_helper = require("../../helpers/common_helper");
const MailType = require("../../models/mail_content");
const DisplayMessage = require("../../models/display_messages");
const mail_helper = require("../../helpers/mail_helper");
const btoa = require("btoa");
const logger = config.logger;
const jwt = require("jsonwebtoken");
const User = require("../../models/user");
const Candidate = require("../../models/candidate-detail");

router.put("/login_first_status", async (req, res) => {
  try {
    var obj = {
      is_login_first: true
    };
    var candidate_upadate = await common_helper.update(
      User,
      { _id: req.body.id },
      obj
    );
    if (candidate_upadate.status == 0) {
      res
        .status(config.BAD_REQUEST)
        .json({ status: 0, message: "No data found" });
    } else if (candidate_upadate.status == 1) {
      res.status(config.OK_STATUS).json({
        status: 1,
        message: "Login first status updated successfully",
        data: candidate_upadate
      });
    } else {
      res
        .status(config.INTERNAL_SERVER_ERROR)
        .json({ message: "Error while fetching data." });
    }
  } catch (error) {
    return res
      .status(config.BAD_REQUEST)
      .json({ message: error.message, success: false });
  }
});

router.post("/", async (req, res) => {
  try {
    var user_id = req.body.id;
    var user_resp = await common_helper.findOne(User, {
      _id: new ObjectId(user_id)
    });

    var candidate_resp = await Candidate.aggregate([
      {
        $match: {
          user_id: new ObjectId(user_id)
        }
      },
      {
        $lookup: {
          from: "country_datas",
          localField: "country",
          foreignField: "_id",
          as: "country"
        }
      },
      {
        $unwind: "$country"
      },
      {
        $lookup: {
          from: "document_type",
          localField: "documenttype",
          foreignField: "_id",
          as: "documenttype"
        }
      },

      {
        $unwind: "$documenttype"
      }
    ]);

    if (user_resp.status === 1 && candidate_resp) {
      var obj = {
        firstname: candidate_resp[0].firstname,
        lastname: candidate_resp[0].lastname,
        country: candidate_resp[0].country.country,
        email: user_resp.data.email,
        countrycode: candidate_resp[0].countrycode,
        contactno: candidate_resp[0].contactno,
        documenttype: candidate_resp[0].documenttype.name,
        documentNumber: candidate_resp[0].documentNumber,
        drivingLicenseState: candidate_resp[0].drivingLicenseState,
        documentimage: candidate_resp[0].documentimage,
        docimage: candidate_resp[0].docimage,
        user_id: candidate_resp[0].user_id
      };

      return res
        .status(config.OK_STATUS)
        .json({ message: "Profile Data", status: 1, data: obj });
    } else {
      return res
        .status(config.BAD_REQUEST)
        .json({ message: "No Record Found", status: 0 });
    }
  } catch (error) {
    return res
      .status(config.BAD_REQUEST)
      .json({ message: error.message, success: false });
  }
});

router.put("/", async (req, res) => {
  try {
    var obj = {};
    if (req.body.firstname && req.body.firstname != "") {
      obj.firstname = req.body.firstname;
    }
    if (req.body.lastname && req.body.lastname != "") {
      obj.lastname = req.body.lastname;
    }
    if (req.body.email && req.body.email != "") {
      obj.email = req.body.email.toLowerCase();
    }

    if (req.body.contactno && req.body.contactno != "") {
      obj.contactno = req.body.contactno;
    }

    var candidate = await common_helper.findOne(
      User,
      { _id: req.body.id },
      obj
    );
    if (candidate.data.email !== req.body.email.toLowerCase()) {
      obj.email_verified = false;
      obj.is_email_change = true;
    }

    var sub_account_upadate = await common_helper.update(
      Candidate,
      { user_id: req.body.id },
      obj
    );
    var sub_account_upadate = await common_helper.update(
      User,
      { _id: req.body.id },
      obj
    );

    if (sub_account_upadate.status == 0) {
      res
        .status(config.BAD_REQUEST)
        .json({ status: 0, message: "No data found" });
    } else if (sub_account_upadate.status == 1) {
      if (candidate.data.email !== sub_account_upadate.data.email) {
        var reset_token = Buffer.from(
          jwt.sign(
            { _id: sub_account_upadate.data._id, role: "candidate" },
            config.ACCESS_TOKEN_SECRET_KEY,
            {
              expiresIn: 60 * 60 * 24 * 3
            }
          )
        ).toString("base64");

        var time = new Date();
        time.setMinutes(time.getMinutes() + 20);
        time = btoa(time);
        var message = await common_helper.findOne(MailType, {
          mail_type: "updated_email_verification"
        });
        let upper_content = message.data.upper_content;
        let lower_content = message.data.lower_content;

        upper_content = upper_content.replace(
          "{email}",
          `${sub_account_upadate.data.email}`
        );

        logger.trace("sending mail");
        if (req.body.email && req.body.email != "") {
          let mail_resp = await mail_helper.send(
            "email_confirmation_template",
            {
              to: sub_account_upadate.data.email,
              subject: "Email has been changes | Verify Email"
            },
            {
              name: req.body.firstname + " " + req.body.lastname,
              upper_content: upper_content,
              lower_content: lower_content,
              confirm_url: config.WEBSITE_URL + "confirmation/" + reset_token
            }
          );
        }

        res.json({
          message:
            "Email has been changed, Email verification link sent to your mail.",
          data: sub_account_upadate
        });
      } else {
        res.status(config.OK_STATUS).json({
          status: 1,
          message: "Profile updated successfully",
          data: sub_account_upadate
        });
      }
    } else {
      res
        .status(config.INTERNAL_SERVER_ERROR)
        .json({ message: "Error while fetching data." });
    }
  } catch (error) {
    return res
      .status(config.BAD_REQUEST)
      .json({ message: error.message, success: false });
  }
});

router.get("/checkStatus/:id", async (req, res) => {
  try {
    var user_id = req.params.id;
    var user_resp = await common_helper.findOne(User, { _id: user_id });
    var message = await common_helper.findOne(DisplayMessage, {
      msg_type: "email_not_verify"
    });
    if (user_resp.status === 1 && user_resp.data.email_verified === false) {
      return res
        .status(config.OK_STATUS)
        .json({ message: message.data.content, status: 1 });
    } else {
      return res
        .status(config.BAD_REQUEST)
        .json({ message: "Email verified.", status: 0 });
    }
  } catch (error) {
    return res
      .status(config.BAD_REQUEST)
      .json({ message: error.message, success: false });
  }
});

module.exports = router;
