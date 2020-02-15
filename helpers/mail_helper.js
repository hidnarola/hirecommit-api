var nodemailer = require('nodemailer');
var EmailTemplate = require('email-templates').EmailTemplate;
const bcrypt = require('bcryptjs');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const sgMail = require('@sendgrid/mail');
var request = require('request');
var mail_helper = {};
var config = require('./../config');
var mail_api_key = config.SENDGRID_API_KEY;

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_user: config.SENDGRID_USER,
      api_key: config.SENDGRID_PASSWORD
    }
  })
);

mail_helper.send = async (template_name, options, data) => {
  var companyname;
  if (data.companyname !== undefined && data.companyname !== '') {
    companyname = data.companyname;
  } else if (data.candidatename !== undefined && data.candidatename !== '') {
    companyname = data.candidatename;
  } else {
    companyname = 'HireCommit';
  }
  var template_sender = transporter.templateSender(
    new EmailTemplate('emails/' + template_name),
    {
      from: companyname + ' ' + '<support@hirecommit.com>'
    }
  );
  return template_sender(
    {
      to: options.to,
      subject: options.subject
    },
    data
  )
    .then(function(info) {
      return { status: 1, message: info };
    })
    .catch(function(err) {
      return { status: 0, error: err };
    });
};

mail_helper.reply_mail_send = async (template_name, options, data) => {
  var companyname;
  var template_sender = transporter.templateSender(
    new EmailTemplate('emails/' + template_name),
    {
      from: options.from
    }
  );
  return template_sender(
    {
      to: options.to,
      subject: options.subject
    },
    data
  )
    .then(function(info) {
      return { status: 1, message: info };
    })
    .catch(function(err) {
      return { status: 0, error: err };
    });
};

mail_helper.forwardRepliedMail = async (data, cb) => {
  const msg = {
    to: data.to,
    from: data.from,
    subject: data.subject,
    html:
      data.html ||
      '<p>Here’s an attachment of replied mail of candidate for you!</p>',
    attachments: [
      {
        content: data.content,
        filename: data.filename,
        type: 'message/rfc822',
        disposition: 'attachment'
      }
    ]
  };
  transporter.sendMail(msg, function(err, info) {
    if (err) {
      console.log(err);
    } else {
      console.log('Message sent: ' + info.response);
    }
    cb(err, info);
  });
};

module.exports = mail_helper;
