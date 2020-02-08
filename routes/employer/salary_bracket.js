const express = require("express");
const router = express.Router();
const config = require('../../config')
const ObjectId = require('mongoose').Types.ObjectId;
const common_helper = require('../../helpers/common_helper');
const async = require('async');

const salary_helper = require('../../helpers/salary_helper');

const logger = config.logger;
const salary_bracket = require('../../models/salary_bracket');
const User = require('../../models/user');


router.post("/", async (req, res) => {
    try {
        var schema = {
            "country": {
                notEmpty: true,
                errorMessage: "Country is required"
            },
            "from": {
                notEmpty: true,
                errorMessage: "minimum salary is required"
            },
            "to": {
                notEmpty: true,
                errorMessage: "maximum salary is required"
            }
        };
        req.checkBody(schema);

        var errors = req.validationErrors();
        if (!errors) {
            var user = await common_helper.findOne(User, { _id: new ObjectId(req.userInfo.id) })
            if (user && user.data.role_id == ObjectId("5d9d99003a0c78039c6dd00f")) {
                var reg_obj = {
                    "emp_id": user.data.emp_id,
                    "country": req.body.country,
                    "currency": req.body.currency,
                    "from": req.body.from,
                    "to": req.body.to,
                    "start": req.body.start,
                    "end": req.body.end
                }
            }
            else {
                var reg_obj = {
                    "emp_id": req.userInfo.id,
                    "country": req.body.country,
                    "currency": req.body.currency,
                    "from": req.body.from,
                    "to": req.body.to,
                    "start": req.body.start,
                    "end": req.body.end
                };
            }
            var interest_resp = await common_helper.insert(salary_bracket, reg_obj);
            if (interest_resp.status == 0) {
                logger.debug("Error = ", interest_resp.error);
                res.status(config.INTERNAL_SERVER_ERROR).json(interest_resp);
            } else {
                res.json({ "message": "Sub Account is Added successfully", "data": interest_resp })
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
        var schema = {

        };
        req.checkBody(schema);
        var errors = req.validationErrors();

        if (!errors) {
            var sortOrderColumnIndex = req.body.order[0].column;
            let sortOrderColumn = sortOrderColumnIndex == 0 ? '_id' : req.body.columns[sortOrderColumnIndex].data;
            let sortOrder = req.body.order[0].dir == 'asc' ? 1 : -1;
            let sortingObject = {
                [sortOrderColumn]: sortOrder
            }
            var user = await common_helper.findOne(User, { _id: new ObjectId(req.userInfo.id) })
            if (user && user.status == 1 && user.data.role_id == ObjectId("5d9d99003a0c78039c6dd00f")) {
                var user_id = user.data.emp_id
            }
            else {
                var user_id = req.userInfo.id
            }

            var aggregate = [
                {
                    $match: { "emp_id": new ObjectId(user_id), "is_del": false }
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
                    },
                }
            ]

            const RE = { $regex: new RegExp(`${req.body.search.value}`, 'gi') };
            if (req.body.search && req.body.search != "") {
                aggregate.push({
                    "$match":
                        { $or: [{ "country": RE }, { "currency": RE }, { "from": RE }, { "to": RE }] }
                });

            }

            let totalMatchingCountRecords = await salary_bracket.aggregate(aggregate);
            totalMatchingCountRecords = totalMatchingCountRecords.length;

            var resp_data = await salary_helper.get_all_salary_bracket(salary_bracket, user_id, req.body.search, req.body.start, req.body.length, totalMatchingCountRecords, sortingObject);
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

router.get('/get_salary_bracket', async (req, res) => {
    try {
        var aggregate = [
            {
                $match: {
                    "is_del": false
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
                    preserveNullAndEmptyArrays: false
                },
            },

        ]

        const salary_bracket_list = await salary_bracket.aggregate(aggregate);
        if (salary_bracket_list && salary_bracket_list.length > 0) {
            return res.status(config.OK_STATUS).json({ 'message': "Salary bracket List", "status": 1, data: salary_bracket_list });
        }
        else {
            return res.status(config.OK_STATUS).json({ 'message': "No Record Found", "status": 2 });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});

router.get('/get_salary_country', async (req, res) => {
    try {
        var aggregate = [
            {
                $match: {
                    "is_del": false
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
                    preserveNullAndEmptyArrays: false
                },
            },
            {
                $group: {
                    "_id": "$country.alpha3Code",
                    "country_id": { $first: "$country._id" },
                    "country_name": { $first: "$country.country" },
                    "currency": { $first: "$country.currency_code" },
                    "code": { $first: "$country.country_code" }


                }
            }

        ]

        const salary_bracket_list = await salary_bracket.aggregate(aggregate);
        if (salary_bracket_list && salary_bracket_list.length > 0) {
            return res.status(config.OK_STATUS).json({ 'message': "Salary bracket List", "status": 1, data: salary_bracket_list });
        }
        else {
            return res.status(config.OK_STATUS).json({ 'message': "No Record Found", "status": 2 });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});



router.put('/', async (req, res) => {
    try {
        var obj = {
        };

        if (req.body.country && req.body.country != "") {
            obj.country = req.body.country
        }
        if (req.body.currency && req.body.currency != "") {
            obj.currency = req.body.currency
        }
        if (req.body.from && req.body.from != "") {
            obj.from = req.body.from
        }
        if (req.body.to && req.body.to != "") {
            obj.to = req.body.to
        }
        var id = req.body.id;

        var salary_bracket_upadate = await common_helper.update(salary_bracket, { "_id": new ObjectId(id) }, obj)

        if (salary_bracket_upadate.status == 0) {
            res.status(config.INTERNAL_SERVER_ERROR).json({ "status": 0, "message": "No data found" });
        }
        else if (salary_bracket_upadate.status == 1) {
            res.status(config.OK_STATUS).json({ "status": 1, "message": "Salary Bracket is Updated successfully", "data": salary_bracket_upadate });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
})

router.put("/deactive_salary_bracket/:id", async (req, res) => {
    try {
        var obj = {
            is_del: true
        }
        var id = req.params.id;
        var resp_data = await common_helper.update(salary_bracket, { "_id": id }, obj);
        if (resp_data.status == 0) {
            logger.error("Error occured while fetching User = ", resp_data);
            res.status(config.INTERNAL_SERVER_ERROR).json(resp_data);
        } else {
            logger.trace("User got successfully = ", resp_data);
            res.status(config.OK_STATUS).json(resp_data);
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});

router.get('/:id', async (req, res) => {
    try {
        var id = req.params.id;
        var salary_brcaket_detail = await salary_bracket.findOne({ "_id": ObjectId(id) }).populate("country")
        if (salary_brcaket_detail) {
            res.status(config.OK_STATUS).json({ "status": 1, "message": "Salary Bracket is fetched successfully", "data": salary_brcaket_detail });
        }
        else {
            res.status(config.BAD_REQUEST).json({ "message": "No data found" });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});

module.exports = router;
