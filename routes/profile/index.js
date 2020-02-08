const express = require('express');
const router = express.Router();
const config = require('../../config');
const async = require('async');
const ObjectId = require('mongodb').ObjectID;
const mail_helper = require('../../helpers/mail_helper');
const common_helper = require('../../helpers/common_helper')
const User = require('../../models/user');
const Employer = require('../../models/employer-detail');
const Candidate = require('../../models/candidate-detail');
const SubEmployer = require('../../models/sub-employer-detail');

// Profile
router.post("/", async (req, res) => {
    try {
        var id = req.body.id;
        var user_resp = await User.aggregate([
            {
                $match: {
                    "_id": ObjectId(id)
                }
            },
            {
                $lookup:
                {
                    from: "role",
                    localField: "role_id",
                    foreignField: "_id",
                    as: "role"
                }
            },
            {
                $unwind: {
                    path: "$role"
                }
            },
        ])
        if (user_resp[0].role.role === 'employer') {
            var employer_resp = await Employer.aggregate([
                {
                    $match: {
                        "user_id": ObjectId(id)
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
            if (employer_resp.length > 0) {
                return res.status(config.OK_STATUS).json({ 'message': "Profile Data", "status": 1, data: employer_resp });
            }
            else {
                return res.status(config.BAD_REQUEST).json({ 'message': "No Record Found", "status": 0 });
            }
        } else if (user_resp[0].role.role === 'sub-employer') {
            var sub_employer_resp = await SubEmployer.aggregate([
                {
                    $match: {
                        "user_id": ObjectId(id)
                    }
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
                }
            ])

            if (sub_employer_resp.length > 0) {
                return res.status(config.OK_STATUS).json({ 'message': "Profile Data", "status": 1, data: sub_employer_resp });
            }
            else {
                return res.status(config.BAD_REQUEST).json({ 'message': "No Record Found", "status": 0 });
            }
        } else if (user_resp[0].role.role === 'candidate') {
            var candidate_resp = await Candidate.aggregate([
                {
                    $match: {
                        "user_id": ObjectId(id)
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
                        from: "document_type",
                        localField: "documenttype",
                        foreignField: "_id",
                        as: "documenttype"
                    }
                },
                {
                    $unwind: "$documenttype"
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
                }
            ])

            if (candidate_resp.length > 0) {
                return res.status(config.OK_STATUS).json({ 'message': "Profile Data", "status": 1, data: candidate_resp });
            }
            else {
                return res.status(config.BAD_REQUEST).json({ 'message': "No Record Found", "status": 0 });
            }
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});

router.put('/', async (req, res) => {
    try {
        var id = req.body.id;
        var user_resp = await User.aggregate([
            {
                $match: {
                    "_id": ObjectId(id)
                }
            },
            {
                $lookup:
                {
                    from: "role",
                    localField: "role_id",
                    foreignField: "_id",
                    as: "role"
                }
            },
            {
                $unwind: {
                    path: "$role"
                }
            },
        ])

        if (user_resp[0].role.role === 'employer') {
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
                obj.email = req.body.email
            }

            var employer = await common_helper.findOne(User, { "_id": id }, obj)
            if (employer.data.email !== req.body.email) {
                obj.email_verified = false
            }


            var employer_upadate = await common_helper.update(Employer, { "user_id": id }, obj)
            var employer_upadate = await common_helper.update(User, { "_id": id }, obj)
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
                    var message = await common_helper.findOne(MailType, { 'mail_type': 'user-update-email' });
                    let content = message.data.content;

                    logger.trace("sending mail");
                    let mail_resp = await mail_helper.send("email_confirmation", {
                        "to": employer_upadate.data.email,
                        "subject": "HireCommit - Email Confirmation"
                    }, {
                        "msg": content,
                        "confirm_url": config.WEBSITE_URL + "confirmation/" + reset_token
                    });

                    if (mail_resp.status === 0) {
                        res.status(config.INTERNAL_SERVER_ERROR).json({ "status": 0, "message": "Error occured while sending confirmation email", "error": mail_resp.error });
                    } else {
                        res.json({ "message": "Email has been changed, Email verification link sent to your mail.", "data": employer_upadate })
                    }
                } else {
                    res.status(config.OK_STATUS).json({ "status": 1, "message": "Profile updated successfully", "data": employer_upadate });
                }
            }
            else {
                res.status(config.INTERNAL_SERVER_ERROR).json({ "message": "Error while fetching data." });
            }
        } else if (user_resp[0].role.role === 'candidate') {
            var obj = {}
            if (req.body.firstname && req.body.firstname != "") {
                obj.firstname = req.body.firstname
            }
            if (req.body.lastname && req.body.lastname != "") {
                obj.lastname = req.body.lastname
            }
            if (req.body.email && req.body.email != "") {
                obj.email = req.body.email
            }
            if (req.body.contactno && req.body.contactno != "") {
                obj.contactno = req.body.contactno
            }

            var candidate = await common_helper.findOne(User, { "_id": id }, obj)
            if (candidate.data.email !== req.body.email) {
                obj.email_verified = false
            }

            var sub_account_upadate = await common_helper.update(Candidate, { "user_id": id }, obj)
            var sub_account_upadate = await common_helper.update(User, { "_id": id }, obj)

            if (sub_account_upadate.status == 0) {
                res.status(config.BAD_REQUEST).json({ "status": 0, "message": "No data found" });
            }
            else if (sub_account_upadate.status == 1) {
                if (candidate.data.email !== sub_account_upadate.data.email) {
                    var reset_token = Buffer.from(jwt.sign({ "_id": sub_account_upadate.data._id, "role": "candidate" },
                        config.ACCESS_TOKEN_SECRET_KEY, {
                        expiresIn: 60 * 60 * 24 * 3
                    }
                    )).toString('base64');

                    var time = new Date();
                    time.setMinutes(time.getMinutes() + 20);
                    time = btoa(time);
                    var message = await common_helper.findOne(MailType, { 'mail_type': 'user-update-email' });
                    let content = message.data.content;

                    logger.trace("sending mail");
                    let mail_resp = await mail_helper.send("email_confirmation", {
                        "to": sub_account_upadate.data.email,
                        "subject": "HireCommit - Email Confirmation"
                    }, {
                        "msg": content,
                        "confirm_url": config.WEBSITE_URL + "confirmation/" + reset_token
                    });

                    if (mail_resp.status === 0) {
                        res.status(config.INTERNAL_SERVER_ERROR).json({ "status": 0, "message": "Error occured while sending confirmation email", "error": mail_resp.error });
                    } else {
                        res.json({ "message": "Email has been changed, Email verification link sent to your mail.", "data": sub_account_upadate })
                    }
                } else {
                    res.status(config.OK_STATUS).json({ "status": 1, "message": "Profile updated successfully", "data": sub_account_upadate });
                }
            }
            else {
                res.status(config.INTERNAL_SERVER_ERROR).json({ "message": "Error while fetching data." });
            }
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});


module.exports = router;
