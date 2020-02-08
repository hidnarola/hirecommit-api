const express = require('express');
const router = express.Router();
const config = require('../../config');
const logger = config.logger;
const jwt = require('jsonwebtoken');
const ObjectId = require('mongodb').ObjectID;

const _ = require('underscore');
const btoa = require('btoa');
const common_helper = require('../../helpers/common_helper');
const MailType = require('../../models/mail_content');
const DisplayMessage = require('../../models/display_messages');
const async = require('async');

const User = require('../../models/user');
const Employer = require('../../models/employer-detail');
const mail_helper = require('../../helpers/mail_helper');

router.put('/login_first_status', async (req, res) => {
    try {
        var obj = {
            'is_login_first': true
        }

        var employer_upadate = await common_helper.update(User, { "_id": req.body.id }, obj)
        if (employer_upadate.status == 0) {
            res.status(config.BAD_REQUEST).json({ "status": 0, "message": "No data found" });
        }
        else if (employer_upadate.status == 1) {
            res.status(config.OK_STATUS).json({ "status": 1, "message": "Login first status updated successfully", "data": employer_upadate });
        }
        else {
            res.status(config.INTERNAL_SERVER_ERROR).json({ "message": "Error while fetching data." });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
})

router.put('/', async (req, res) => {
    try {
        var obj = {}
        if (req.body.username && req.body.username != "") {
            obj.username = req.body.username
        }
        if (req.body.website && req.body.website != "") {
            obj.website = req.body.website
        }
        if (req.body.companyname && req.body.companyname != "") {
            obj.companyname = req.body.companyname
        }
        if (req.body.businesstype && req.body.businesstype != "") {
            obj.businesstype = req.body.businesstype
        }
        if (req.body.contactno && req.body.contactno != "") {
            obj.contactno = req.body.contactno
        }
        if (req.body.email && req.body.email != "") {
            obj.email = req.body.email.toLowerCase()
            obj.is_email_change = true
        }

        var employer = await common_helper.findOne(User, { "_id": req.body.id }, obj)
        if (employer.data.email !== req.body.email.toLowerCase()) {
            obj.email_verified = false
        }

        var employer_upadate = await common_helper.update(Employer, { "user_id": req.body.id }, obj)
        var employer_upadate = await common_helper.update(User, { "_id": req.body.id }, obj)
        if (employer_upadate.status == 0) {
            res.status(config.BAD_REQUEST).json({ "status": 0, "message": "No data found" });
        }
        else if (employer_upadate.status == 1) {
            if (employer.data.email !== employer_upadate.data.email) {
                var reset_token = Buffer.from(jwt.sign({ "_id": employer_upadate.data._id, "role": "employer" },
                    config.ACCESS_TOKEN_SECRET_KEY, {
                    expiresIn: 60 * 60 * 24 * 3
                }
                )).toString('base64');

                var time = new Date();
                time.setMinutes(time.getMinutes() + 20);
                time = btoa(time);
                var message = await common_helper.findOne(MailType, { 'mail_type': 'updated_email_verification' });
                let upper_content = message.data.upper_content;
                let lower_content = message.data.lower;

                upper_content = upper_content.replace("{email}", `${employer_upadate.data.email}`);

                logger.trace("sending mail");
                if (req.body.email && req.body.email != "") {
                    let mail_resp = await mail_helper.send("email_confirmation_template", {
                        "to": employer_upadate.data.email,
                        "subject": "Email has been changes | Verify Email"
                    }, {
                        "name": req.body.username,
                        "upper_content": upper_content,
                        'lower_content': lower_content,
                        "confirm_url": config.WEBSITE_URL + "confirmation/" + reset_token
                    });
                }

                res.json({ "message": "Email has been changed, Email verification link sent to your mail.", "data": employer_upadate })

            } else {
                res.status(config.OK_STATUS).json({ "status": 1, "message": "Profile updated successfully", "data": employer_upadate });
            }
        }
        else {
            res.status(config.INTERNAL_SERVER_ERROR).json({ "message": "Error while fetching data." });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
})

router.post("/", async (req, res) => {
    try {
        var user_id = req.body.id

        var user_resp = await common_helper.findOne(User, { "_id": new ObjectId(user_id) });

        var employer_resp = await Employer.aggregate([
            {
                $match: {
                    "user_id": new ObjectId(user_id)
                }
            },
            {
                $lookup:
                {
                    from: "country_datas",
                    localField: "country",
                    foreignField: "_id",
                    as: "country"
                }
            },

            {
                $unwind: "$country",

            },
            {
                $lookup:
                {
                    from: "business_type",
                    localField: "businesstype",
                    foreignField: "_id",
                    as: "businesstype"
                }
            },
            {
                $unwind: "$businesstype"
            },
            {
                $lookup:
                {
                    from: "user",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user_id"
                }
            },
            {
                $unwind: "$user_id",

            },
        ])

        var obj = {
            companyname: employer_resp[0].companyname,
            website: employer_resp[0].website,
            email: user_resp.data.email,
            country: employer_resp[0].country.country,
            businesstype: employer_resp[0].businesstype.name,
            username: employer_resp[0].username,
            countrycode: employer_resp[0].countrycode,
            contactno: employer_resp[0].contactno,
            user_id: employer_resp[0].user_id
        }


        if (user_resp.status === 1 && employer_resp) {
            return res.status(config.OK_STATUS).json({ 'message': "Profile Data", "status": 1, data: obj });
        }
        else {
            return res.status(config.BAD_REQUEST).json({ 'message': "No Record Found", "status": 0 });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
})

router.post("/display_message", async (req, res) => {
    try {
        var message = await common_helper.findOne(DisplayMessage, { "msg_type": req.body.msg_type });
        if (message.status === 1) {
            return res.status(config.OK_STATUS).json({ 'message': message.data.content, "status": 1 });
        } else {
            return res.status(config.BAD_REQUEST).json({ 'message': "Somthing went wrong..!", "status": 0 });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
})

router.get("/checkStatus/:id", async (req, res) => {
    try {
        var user_id = req.params.id;
        var user_resp = await common_helper.findOne(User, { "_id": user_id });

        var message = await common_helper.findOne(DisplayMessage, { "msg_type": "employer_not_approve" })
        if (user_resp.status === 1 && user_resp.data.isAllow === false) {
            return res.status(config.OK_STATUS).json({ 'message': message.data.content, "status": 1 });
        }
        else if (user_resp.status === 1 && user_resp.data.isAllow === true) {
            return res.status(config.OK_STATUS).json({ 'message': "This Employer is approved.", "status": 2 });
        } else {
            return res.status(config.BAD_REQUEST).json({ 'message': "Somthing went wrong..!", "status": 0 });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
})

module.exports = router;
