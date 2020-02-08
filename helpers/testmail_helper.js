var nodemailer = require('nodemailer');
var EmailTemplate = require('email-templates').EmailTemplate;
const bcrypt = require('bcryptjs');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const sgMail = require('@sendgrid/mail');
var request = require("request");
var testmail_helper = {};
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


testmail_helper.send = async (template_id, options, data) => {
    sgMail.setApiKey(mail_api_key);
    const msg = {
        "customArgs": {
            "trackid": options.trackid
        },

        "personalizations": [
            {
                "to": [
                    {
                        "email": options.to,
                        "name": ""
                    }
                ],
                "dynamic_template_data": {
                    "message": data.message,
                    // "content": data.content,
                    "open_url": data.open_url
                },
                "subject": options.subject
            }
        ],
        "from": {
            "email": "support@hirecommit.com",
            "name": "Hire Commit"
        },
        "reply_to": {
            "email": options.reply_to,
            "name": "HireCommit"
        },
        "template_id": template_id
    };
    var mail_resp = await sgMail.send(msg);
    if (mail_resp) {
        return { 'status': 1 };
    }
    else {
        return { 'status': 0 };
    }
}

module.exports = testmail_helper;
