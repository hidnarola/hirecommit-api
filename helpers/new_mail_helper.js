var nodemailer = require("nodemailer");
var EmailTemplate = require("email-templates").EmailTemplate;
const bcrypt = require("bcryptjs");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const sgMail = require("@sendgrid/mail");
var request = require("request");
var new_mail_helper = {};
var config = require("./../config");
var mail_api_key = config.SENDGRID_API_KEY;

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_user: config.SENDGRID_USER,
      api_key: config.SENDGRID_PASSWORD
    }
  })
);

new_mail_helper.send = async (template_id, options, data) => {
  sgMail.setApiKey(mail_api_key);
  var companyname;
  if (data.companyname !== undefined && data.companyname !== "") {
    companyname = data.companyname;
  } else {
    companyname = "HireCommit";
  }
  const msg = {
    customArgs: {
      trackid: options.trackid
    },

    personalizations: [
      {
        to: [
          {
            email: options.to,
            name: ""
          }
        ],
        // "cc": [{ "email": options.reply_to1 }],
        dynamic_template_data: {
          message: "",
          subject: data.subject,
          name: data.name,
          upper_content: data.upper_content,
          middel_content: data.middel_content,
          lower_content: data.lower_content
        },
        subject: options.subject
      }
    ],
    from: {
      email: "support@hirecommit.com",
      name: companyname
    },
    reply_to: options.reply_to2,
    template_id: template_id
  };
  var mail_resp = await sgMail.send(msg);
  if (mail_resp) {
    return { status: 1 };
  } else {
    return { status: 0 };
  }
};

new_mail_helper.sendOffer = async (template_id, options, data) => {
  sgMail.setApiKey(mail_api_key);
  var companyname;
  if (data.companyname !== undefined && data.companyname !== "") {
    companyname = data.companyname;
  } else {
    companyname = "HireCommit";
  }
  const msg = {
    customArgs: {
      trackid: options.trackid
    },

    personalizations: [
      {
        to: [
          {
            email: options.to,
            name: ""
          }
        ],
        // "cc": [{ "email": options.reply_to1 }],
        dynamic_template_data: {
          message: "",
          subject: data.subject,
          name: data.name,
          upper_content: data.upper_content,
          middel_content: data.middel_content,
          lower_content: data.lower_content
        },
        subject: options.subject
      }
    ],
    from: {
      email: "support@hirecommit.com",
      name: companyname
    },
    // "reply_to": options.reply_to2,
    template_id: template_id
  };
  var mail_resp = await sgMail.send(msg);
  if (mail_resp) {
    return { status: 1 };
  } else {
    return { status: 0 };
  }
};
module.exports = new_mail_helper;
