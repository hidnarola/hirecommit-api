const express = require("express");
const router = express.Router();

const config = require('../../config')
const ObjectId = require('mongoose').Types.ObjectId;
const common_helper = require('../../helpers/common_helper');
const user_helper = require('../../helpers/user_helper');
const MailType = require('../../models/mail_content');
const jwt = require('jsonwebtoken');
const _ = require('underscore');
const btoa = require('btoa');

const logger = config.logger;
const User = require('../../models/user');

const async = require('async');
const mail_helper = require('../../helpers/mail_helper');
const Sub_Employer_Detail = require('../../models/sub-employer-detail');
const Employer_Detail = require('../../models/employer-detail');
const random_pass_word = require('secure-random-password');


router.post("/", async (req, res) => {
    try {
        var schema = {
            "username": {
                notEmpty: true,
                errorMessage: "Name is required"
            },
            "email": {
                notEmpty: true,
                errorMessage: "Email is required"
            }
        };
        req.checkBody(schema);

        var errors = req.validationErrors();
        if (!errors) {

            var reg_obj = {
                "username": req.body.username,
                "email": req.body.email,
                "admin_rights": req.body.admin_rights,
                "is_del": false,
                "email_verified": false,
                "is_register": true,
                "isAllow": true,
                "role_id": "5d9d99003a0c78039c6dd00f"
            };
            var user = await common_helper.findOne(User, { _id: new ObjectId(req.userInfo.id) })
            if (user && user.data.role_id == ("5d9d99003a0c78039c6dd00f")) {
                reg_obj.emp_id = user.data.emp_id
            }
            else if (user && user.data.role_id == ("5d9d98a93a0c78039c6dd00d")) {
                reg_obj.emp_id = req.userInfo.id
            }
            var user_data = await common_helper.findOne(User, { "is_del": false, "email": req.body.email })

            if (user_data.status == 2) {
                var passwords = random_pass_word.randomPassword({ length: 8, characters: random_pass_word.lower + random_pass_word.upper + random_pass_word.digits + random_pass_word.symbols })
                reg_obj.password = passwords
                var interest_resps = await common_helper.insert(User, reg_obj);
                reg_obj.user_id = interest_resps.data._id;
                var interest_resp = await common_helper.insert(Sub_Employer_Detail, reg_obj);

                if (interest_resp.status == 0) {
                    logger.debug("Error = ", interest_resp.error);
                    res.status(config.INTERNAL_SERVER_ERROR).json(interest_resp);
                } else {

                    var employername = await common_helper.findOne(Employer_Detail, { "user_id": interest_resp.data.emp_id });

                    var message = await common_helper.findOne(MailType, { 'mail_type': 'sub_employer_email_confirmation' });

                    let upper_content = message.data.upper_content;
                    let lower_content = message.data.lower_content;
                    upper_content = upper_content.replace("{employername}", `${employername.data.companyname}`);

                    var name = req.body.username;
                    var subemployerfirstname = name.substring(0, name.lastIndexOf(" "));
                    if (subemployerfirstname === "") {
                        subemployerfirstname = name;
                    }

                    var reset_token = Buffer.from(jwt.sign({ "_id": interest_resps.data._id, "role": "sub-employer" },
                        config.ACCESS_TOKEN_SECRET_KEY, {
                        expiresIn: 60 * 60 * 24 * 3
                    }
                    )).toString('base64');

                    var time = new Date();
                    time.setMinutes(time.getMinutes() + 20);
                    time = btoa(time);

                    let mail_resp = await mail_helper.send("sub_employer_login_detail", {
                        "to": req.body.email,
                        "subject": "Welcome to the HireCommit | Verify Email"
                    }, {
                        "subemployerfirstname": subemployerfirstname,
                        "upper_content": upper_content,
                        "lower_content": lower_content,
                        "email": req.body.email,
                        "password": passwords,
                        "confirm_url": config.WEBSITE_URL + "confirmation/" + reset_token
                    });
                    res.status(config.OK_STATUS).json({ "message": "Sub Account is Added Successfully", "data": interest_resps })
                }
            }
            else {
                res.status(config.BAD_REQUEST).json({ message: "Email already exists" });
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

router.post('/get', async (req, res) => {
    try {
        var schema = {};
        req.checkBody(schema);
        var errors = req.validationErrors();
        var user = await common_helper.findOne(User, { _id: new ObjectId(req.userInfo.id) })

        if (user.status == 1 && user.data.role_id == ("5d9d99003a0c78039c6dd00f")) {
            var user_id = user.data.emp_id
        }
        else {
            var user_id = req.userInfo.id
        }
        if (!errors) {
            var sortOrderColumnIndex = req.body.order[0].column;
            let sortOrderColumn = sortOrderColumnIndex == 0 ? 'username' : req.body.columns[sortOrderColumnIndex].data;
            let sortOrder = req.body.order[0].dir == 'asc' ? 1 : -1;
            let sortingObject = {
                [sortOrderColumn]: sortOrder
            }
            var aggregate = [
                {
                    $match: {
                        "is_del": false,
                        "emp_id": new ObjectId(user_id),
                        "user_id": { $ne: ObjectId(req.userInfo.id) }
                    }
                }
            ]

            const RE = { $regex: new RegExp(`${req.body.search.value}`, 'gi') };
            if (req.body.search && req.body.search != "") {
                aggregate.push({
                    "$match":
                        { $or: [{ "username": RE }, { "user.email": RE }] }
                });
            }

            let totalMatchingCountRecords = await Sub_Employer_Detail.aggregate(aggregate);
            totalMatchingCountRecords = totalMatchingCountRecords.length;

            var resp_data = await user_helper.get_all_sub_user(Sub_Employer_Detail, user_id, req.userInfo.id, req.body.search, req.body.start, req.body.length, totalMatchingCountRecords, sortingObject);
            if (resp_data.status == 1) {
                res.status(config.OK_STATUS).json(resp_data);
            } else {
                res.status(config.INTERNAL_SERVER_ERROR).json(resp_data);
            }
        } else {
            logger.error("Validation Error = ", errors);
            res.status(config.BAD_REQUEST).json({ message: errors });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});

router.put("/deactive_sub_account", async (req, res) => {
    try {
        var obj = {
            is_del: true
        }
        var id = req.body.id;
        var resp_user_data = await common_helper.update(User, { "_id": new ObjectId(id) }, obj);

        var resp_Detail_data = await common_helper.update(Sub_Employer_Detail, { "user_id": new ObjectId(id) }, obj);

        if (resp_user_data.status == 0 && resp_Detail_data.status == 0) {
            logger.error("Error occured while fetching User = ", resp_user_data);
            res.status(config.INTERNAL_SERVER_ERROR).json({ "status": 0, "message": "Error occurred while deleting data." });
        } else if (resp_user_data.status == 1 && resp_Detail_data.status == 1) {
            res.status(config.OK_STATUS).json({ "status": 1, "message": "Record is Deleted successfully." });
        }
        else {
            res.status(config.BAD_REQUEST).json({ "status": 2, "message": "No data found" });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});


router.put('/', async (req, res) => {
    try {
        var reg_obj = {
            "admin_rights": req.body.admin_rights
        }
        var sub_account_upadate = await common_helper.update(User, { "_id": req.body.id }, reg_obj)

        if (sub_account_upadate.status == 0) {
            res.status(config.BAD_REQUEST).json({ "status": 0, "message": "No data found" });
        }
        else if (sub_account_upadate.status == 1) {
            res.status(config.OK_STATUS).json({ "status": 1, "message": "Sub Employer is Updated successfully", "data": sub_account_upadate });
        }
        else {
            res.status(config.INTERNAL_SERVER_ERROR).json({ "message": "Error occurred while fetching data." });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
})

router.put('/details', async (req, res) => {
    try {
        var obj = {}
        if (req.body.data.admin_rights && req.body.data.admin_rights !== "") {
            obj.admin_rights = req.body.data.admin_rights
        }
        if (req.body.data.email && req.body.data.email !== "") {
            obj.email = req.body.data.email.toLowerCase()
        }

        if (req.body.data.username && req.body.data.username !== "") {
            obj.username = req.body.data.username;
        }
        var id = req.body.id;

        var user_detail = await common_helper.findOne(User, { '_id': id });
        var resp_Detail_data = await common_helper.update(Sub_Employer_Detail, { "user_id": new ObjectId(id) }, obj);

        if (user_detail.data.email !== req.body.data.email) {
            var message = await common_helper.findOne(MailType, { 'mail_type': 'admin-change-email' });
            let upper_content = message.data.upper_content;
            let lower_content = message.data.lower_content;
            upper_content = upper_content.replace("{old_email}", `${user_detail.data.email}`).replace("{new_email}", `${req.body.data.email.toLowerCase()}`);
            obj.email_verified = false;
            logger.trace("sending mail");
            let mail_resp = await mail_helper.send("welcome_email", {
                "to": user_detail.data.email,
                "subject": "Notification Email | Email Updated"
            }, {
                'name': resp_Detail_data.data.username,
                'upper_content': upper_content,
                'lower_content': lower_content
            });
            if (mail_resp.status === 0) {
                res.status(config.INTERNAL_SERVER_ERROR).json({ "status": 0, "message": "Error occured while sending confirmation email", "error": mail_resp.error });
            } else {
                var resp_user_data = await common_helper.update(User, { "_id": new ObjectId(id) }, obj);

                var message = await common_helper.findOne(MailType, { 'mail_type': 'updated_email_verification' });
                let upper_content = message.data.upper_content;
                let lower_content = message.data.lower_content;
                upper_content = upper_content.replace("{email}", `${resp_user_data.data.email}`);

                var reset_token = Buffer.from(jwt.sign({ "_id": resp_user_data.data._id, "role": "sub-employer" },
                    config.ACCESS_TOKEN_SECRET_KEY, {
                    expiresIn: 60 * 60 * 24 * 3
                }
                )).toString('base64');

                var time = new Date();
                time.setMinutes(time.getMinutes() + 20);
                time = btoa(time);

                let mail_response = await mail_helper.send("email_confirmation_template", {
                    "to": resp_user_data.data.email,
                    "subject": "Email has been changes | Verify Email"
                }, {
                    "name": resp_Detail_data.data.username,
                    "upper_content": upper_content,
                    "lower_content": lower_content,
                    "confirm_url": config.WEBSITE_URL + '/confirmation/' + reset_token
                });

            }
        } else {
            var resp_user_data = await common_helper.update(User, { "_id": new ObjectId(id) }, obj);
        }

        if (resp_Detail_data.status == 0) {
            res.status(config.BAD_REQUEST).json({ "status": 0, "message": "No data found" });
        }
        else if (resp_Detail_data.status == 1) {
            res.status(config.OK_STATUS).json({ "status": 1, "message": "Employer's record is updated successfully", "data": resp_Detail_data, "user": resp_user_data });
        }
        else {
            res.status(config.INTERNAL_SERVER_ERROR).json({ "message": "Error occurred while fetching data." });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
})


router.get('/:id', async (req, res) => {
    try {
        var id = req.params.id;

        var sub_account_detail = await Sub_Employer_Detail.findOne({ "user_id": new ObjectId(id) }).populate('user_id')
        if (sub_account_detail) {
            res.status(config.OK_STATUS).json({ "status": 1, "message": "Employer fetched successfully", "data": sub_account_detail });
        }

        else {
            return res.status(config.BAD_REQUEST).json({ 'message': 'No Data Found' })
        }

    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});

module.exports = router;
