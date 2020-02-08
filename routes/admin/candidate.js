const express = require("express");
const router = express.Router();
const config = require('../../config')
const mail_helper = require('../../helpers/mail_helper');
const common_helper = require('../../helpers/common_helper');
const candidate_helper = require('../../helpers/candidate_helper');
const Candidate = require('../../models/candidate-detail');
const MailType = require('../../models/mail_content');
const logger = config.logger;
const User = require('../../models/user');
const async = require('async');


router.post('/get_new', async (req, res) => {
    try {
        var schema = {};
        req.checkBody(schema);
        var errors = req.validationErrors();

        if (!errors) {
            var sortOrderColumnIndex = req.body.order[0].column;
            let sortOrderColumn = sortOrderColumnIndex == 0 ? 'firstname' : req.body.columns[sortOrderColumnIndex].data;
            let sortOrder = req.body.order[0].dir == 'asc' ? 1 : -1;
            let sortingObject = {
                [sortOrderColumn]: sortOrder
            }
            var aggregate = [
                {
                    $match: {
                        "is_del": false,
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
                    $unwind: {
                        path: "$country",
                        preserveNullAndEmptyArrays: true
                    },
                },
                {
                    $lookup:
                    {
                        from: "user",
                        localField: "user_id",
                        foreignField: "_id",
                        as: "user"
                    }
                },
                {
                    $unwind:
                    {
                        path: "$user",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup:
                    {
                        from: "document_type",
                        localField: "documenttype",
                        foreignField: "_id",
                        as: "document"
                    }
                },
                {
                    $unwind:
                    {
                        path: "$document",
                    }

                },
                {
                    $match: { "user.isAllow": false }
                }
            ]

            const RE = { $regex: new RegExp(`${req.body.search.value}`, 'gi') };
            if (req.body.search && req.body.search != "") {
                aggregate.push({
                    "$match":
                    {
                        $or: [{ "firstname": RE }, { "user.email": RE }, { "contactno": RE }, { "document.name": RE }, { "drivingLicenseState": RE }, { "documentNumber": RE }, { "createdAt": RE }, { "status": RE }]
                    }
                });
            }

            let totalMatchingCountRecords = await Candidate.aggregate(aggregate);
            totalMatchingCountRecords = totalMatchingCountRecords.length;

            var resp_data = await candidate_helper.get_all_new_candidate(Candidate, req.body.search, req.body.start, req.body.length, totalMatchingCountRecords, sortingObject);
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


router.post('/get_approved', async (req, res) => {
    try {
        var schema = {};
        req.checkBody(schema);
        var errors = req.validationErrors();

        if (!errors) {
            var sortOrderColumnIndex = req.body.order[0].column;
            let sortOrderColumn = sortOrderColumnIndex == 0 ? 'firstname' : req.body.columns[sortOrderColumnIndex].data;
            let sortOrder = req.body.order[0].dir == 'asc' ? 1 : -1;
            let sortingObject = {
                [sortOrderColumn]: sortOrder
            }
            var aggregate = [
                {
                    $match: {
                        "is_del": false,
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
                    $unwind: {
                        path: "$country",
                        preserveNullAndEmptyArrays: true
                    },
                },
                {
                    $lookup:
                    {
                        from: "user",
                        localField: "user_id",
                        foreignField: "_id",
                        as: "user"
                    }
                },
                {
                    $unwind: "$user"
                },
                {
                    $lookup:
                    {
                        from: "document_type",
                        localField: "documenttype",
                        foreignField: "_id",
                        as: "document"
                    }
                },
                {
                    $unwind:
                    {
                        path: "$document",
                    }

                },
                {
                    $match: { "user.isAllow": true }
                }
            ]

            const RE = { $regex: new RegExp(`${req.body.search.value}`, 'gi') };

            if (req.body.search && req.body.search != "") {
                aggregate.push({
                    "$match":
                        { $or: [{ "firstname": RE }, { "user.email": RE }, { "contactno": RE }, { "document.name": RE }, { "drivingLicenseState": RE }, { "documentNumber": RE }, { "createdAt": RE }, { "status": RE }] }
                });
            }


            let totalMatchingCountRecords = await Candidate.aggregate(aggregate);
            totalMatchingCountRecords = totalMatchingCountRecords.length;

            var resp_data = await candidate_helper.get_all_approved_candidate(Candidate, req.body.search, req.body.start, req.body.length, totalMatchingCountRecords, sortingObject);

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

router.get('/:id', async (req, res) => {
    try {
        var id = req.params.id;
        var candidate_detail = await Candidate.findOne({ "_id": id }).populate("user_id").populate("country").populate("documenttype")
        if (candidate_detail) {
            res.status(config.OK_STATUS).json({ "status": 1, "message": "Candidate details are fetched successfully", "data": candidate_detail });
        }
        else {
            return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": "No data Found" })
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});

router.put("/deactive_candidate/:id", async (req, res) => {
    try {
        var obj = {
            is_del: true
        }

        var resp_data = await common_helper.update(Candidate, { "user_id": req.params.id }, obj);

        var resp_data = await common_helper.update(User, { "_id": req.params.id }, obj);

        if (resp_data.status == 0) {
            logger.error("Error occured while fetching User = ", resp_data);
            res.status(config.INTERNAL_SERVER_ERROR).json(resp_data);
        } else if (resp_data.status == 1) {
            logger.trace("User got successfully = ", resp_data);
            res.status(config.OK_STATUS).json({ "message": "Candidate is Deleted successfully", resp_data });
        }
        else {
            res.status(config.BAD_REQUEST).json({ "status": 2, "message": "Error occurred while deleting data." });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});


router.get('/', async (req, res) => {
    try {
        var aggregate = [
            {
                $match: {
                    "is_del": false,
                }
            },
            {
                $lookup:
                {
                    from: "user",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            {
                $unwind: {
                    path: "$user",
                    preserveNullAndEmptyArrays: true
                },
            },
            {
                $match: {
                    "user.isAllow": true
                }
            }
        ]
        let candidate_list = await Candidate.aggregate(aggregate);

        if (candidate_list) {
            return res.status(config.OK_STATUS).json({ 'message': "Candidate List", "status": 1, data: candidate_list });
        }
        else {
            return res.status(config.BAD_REQUEST).json({ 'message': "No Record Found", "status": 0 });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});


router.put('/', async (req, res) => {
    try {
        var reg_obj = {
            "isAllow": true
        }
        var sub_account_upadate = await common_helper.update(User, { "_id": req.body.id }, reg_obj)
        if (sub_account_upadate.status == 0) {
            res.status(config.BAD_REQUEST).json({ "status": 0, "message": "No data found" });
        }
        else if (sub_account_upadate.status == 1) {

            var candidate = await common_helper.findOne(Candidate, { "user_id": req.body.id })
            var name = candidate.data.firstname;
            var message = await common_helper.findOne(MailType, { 'mail_type': 'approve-candidate' });
            var upper_content = message.data.upper_content;
            var middel_content = message.data.middel_content;
            var lower_content = message.data.lower_content;

            logger.trace("sending mail");
            let mail_resp = await mail_helper.send("candidate_approval_email", {
                "to": sub_account_upadate.data.email,
                "subject": "Your HireCommit account has been approved!!"
            }, {
                "name": name,
                "upper_content": upper_content,
                "middel_content": middel_content,
                "lower_content": lower_content,
                "confirm_url": config.WEBSITE_URL + '/login'
            });
            res.status(config.OK_STATUS).json({ "status": 1, "message": "Candidate is Approved successfully", "data": sub_account_upadate });
        }
        else {
            res.status(config.INTERNAL_SERVER_ERROR).json({ "message": "Error occurred while fetching data." });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
})

module.exports = router;
