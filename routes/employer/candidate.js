const express = require("express");
const router = express.Router();
const config = require('../../config')
const common_helper = require('../../helpers/common_helper');
const candidate_helper = require('../../helpers/candidate_helper');
const Candidate = require('../../models/candidate-detail');
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
            let sortOrderColumn = sortOrderColumnIndex == 0 ? '_id' : req.body.columns[sortOrderColumnIndex].data;
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
                    $match: { "user.isAllow": false }
                }
            ]

            const RE = { $regex: new RegExp(`${req.body.search.value}`, 'gi') };
            if (req.body.search && req.body.search != "") {
                aggregate.push({
                    "$match":
                        { $or: [{ "contactno": RE }, { "firstname": RE }, { "documenttype": RE }, { "createdAt": RE }, { "status": RE }, { "user.email": RE }] }
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
            let sortOrderColumn = sortOrderColumnIndex == 0 ? '_id' : req.body.columns[sortOrderColumnIndex].data;
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
                    $match: { "user.isAllow": true }
                }
            ]

            const RE = { $regex: new RegExp(`${req.body.search.value}`, 'gi') };
            if (req.body.search && req.body.search != "") {
                aggregate.push({
                    "$match":
                        { $or: [{ "contactno": RE }, { "firstname": RE }, { "documenttype": RE }, { "createdAt": RE }, { "status": RE }, { "user.email": RE }] }
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
        var candidate_detail = await Candidate.findOne({ "_id": id }).populate("user_id")

        if (candidate_detail) {

            res.status(config.OK_STATUS).json({ "status": 1, "message": "Candidate fetched successfully", "data": candidate_detail });
        }
        else {
            return res.status(config.BAD_REQUEST).json({ 'message': 'No Data Found' })
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
        var resp_data = await common_helper.update(Candidate, { "_id": req.params.id }, obj);
        var resp_data = await common_helper.update(User, { "user_id": req.params.id }, obj);
        if (resp_data.status == 0) {
            logger.error("Error occured while fetching User = ", resp_data);
            res.status(config.INTERNAL_SERVER_ERROR).json(resp_data);
        } else if (resp_data.status == 1) {
            logger.trace("User got successfully = ", resp_data);
            res.status(config.OK_STATUS).json({ "message": "Deleted successfully", resp_data });
        }
        else {
            res.status(config.BAD_REQUEST).json({ "status": 2, "message": "Error while deleting data." });
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

                },
            },

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

module.exports = router;
