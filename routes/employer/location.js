const express = require("express");
const router = express.Router();
const config = require('../../config')
const ObjectId = require('mongoose').Types.ObjectId;
const common_helper = require('../../helpers/common_helper');
const location_helper = require('../../helpers/location_helper');
const logger = config.logger;
const async = require('async');

const location = require('../../models/location');
const Salary = require('../../models/salary_bracket');
const User = require('../../models/user');
const Offer = require('../../models/offer');


//manage Location
router.post("/", async (req, res) => {
    try {
        var schema = {

        };
        req.checkBody(schema);

        var errors = req.validationErrors();
        if (!errors) {
            var user = await common_helper.findOne(User, { _id: new ObjectId(req.userInfo.id) })
            if (user && user.data.role_id == ("5d9d99003a0c78039c6dd00f")) {
                var reg_obj = {
                    "emp_id": user.data.emp_id,
                    "country": req.body.country,
                    "city": req.body.city,
                }
            }
            else {
                var reg_obj = {
                    "country": req.body.country,
                    "city": req.body.city,
                    "emp_id": req.userInfo.id
                };
            }
            var string = req.body.city;
            var regex = new RegExp(["^", string, "$"].join(""), "i");
            var location_resp = await common_helper.findOne(location, { "is_del": false, "emp_id": reg_obj.emp_id, "city": regex });
            if (location_resp.status == 2) {
                var interest_resp = await common_helper.insert(location, reg_obj);

                if (interest_resp.status == 0) {
                    logger.debug("Error = ", interest_resp.error);
                    res.status(config.INTERNAL_SERVER_ERROR).json(interest_resp);
                } else {
                    res.json({ "message": "Location is Added successfully", "data": interest_resp })
                }
            }
            else {
                res.status(config.BAD_REQUEST).json({ message: "City already exists" });
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
            let sortOrderColumn = sortOrderColumnIndex == 0 ? 'city' : req.body.columns[sortOrderColumnIndex].data;
            let sortOrder = req.body.order[0].dir == 'asc' ? 1 : -1;
            let sortingObject = {
                [sortOrderColumn]: sortOrder
            }
            var user = await common_helper.findOne(User, { _id: new ObjectId(req.userInfo.id) })

            if (user && user.status == 1 && user.data.role_id == ("5d9d99003a0c78039c6dd00f")) {
                var user_id = user.data.emp_id
            }
            else {
                var user_id = req.userInfo.id
            }

            var aggregate = [
                {
                    $match:
                        { $or: [{ "emp_id": new ObjectId(user_id) }, { "emp_id": new ObjectId(user_id) }], "is_del": false }

                },
                {
                    "$project": {
                        "city": 1,
                        "insensitive": { "$toLower": "$city" }
                    }
                }
            ]

            const RE = { $regex: new RegExp(`${req.body.search.value}`, 'gi') };
            if (req.body.search && req.body.search != "") {
                aggregate.push({
                    "$match":
                        { $or: [{ "city": RE }, { "country": RE }] }
                });
            }


            let totalMatchingCountRecords = await location.aggregate(aggregate);
            totalMatchingCountRecords = totalMatchingCountRecords.length;

            var resp_data = await location_helper.get_all_location(location, user_id, req.body.search, req.body.start, req.body.length, totalMatchingCountRecords, sortingObject);

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


router.get('/get_location', async (req, res) => {
    try {
        var user = await common_helper.findOne(User, { _id: new ObjectId(req.userInfo.id) })

        if (user && user.status == 1 && user.data.role_id == ("5d9d99003a0c78039c6dd00f")) {
            var user_id = user.data.emp_id
        }
        else {
            var user_id = req.userInfo.id
        }
        var aggregate = [
            {
                $match: {
                    "is_del": false,
                    "emp_id": new ObjectId(user_id)
                }
            },
            {
                $group: {
                    "_id": "$country.alpha3Code",
                    "country": { $first: "$country.country" },
                    "country_id": { $first: "$country._id" },
                    "id": { $first: "$_id" },
                    "currency": { $first: "$country.currency_code" }
                }
            }
        ];

        const location_list = await location.aggregate(aggregate);

        return res.status(config.OK_STATUS).json({ 'message': "Location List", "status": 1, data: location_list });
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': "Error occurred while fetching", "status": 0 });
    }
})


router.get('/get_locations', async (req, res) => {
    try {
        var user = await common_helper.findOne(User, { _id: new ObjectId(req.userInfo.id) })
        if (user && user.status == 1 && user.data.role_id == ("5d9d99003a0c78039c6dd00f")) {
            var user_id = user.data.emp_id
        }
        else {
            var user_id = req.userInfo.id
        }
        var location_list = await location.find(
            {
                "emp_id": new ObjectId(user_id),
                "is_del": false
            }).sort({ "city": 1 });

        var salary_list = await common_helper.find(Salary, {
            "emp_id": new ObjectId(req.userInfo.id),
            "is_del": false
        });
        if (location_list && location_list.length > 0) {
            return res.status(config.OK_STATUS).json({ 'message': "Location List", "status": 1, data: location_list, salary: salary_list });
        }
        else if (location_list && location_list.length <= 0) {
            return res.status(config.OK_STATUS).json({ 'message': "No Record Found", "status": 2 });
        }
        else {
            return res.status(config.BAD_REQUEST).json({ 'message': "Error occurred while fetching", "status": 0 });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
})


router.put('/', async (req, res) => {
    try {
        var schema = {
            "country": {
                notEmpty: true,
                errorMessage: "Country is required"
            },
            "city": {
                notEmpty: true,
                errorMessage: "City is required"
            }
        };
        req.checkBody(schema);
        var reg_obj = {
            "country": req.body.country,
            "city": req.body.city,
            "is_del": false,
        };
        var id = req.body.id;
        const RE = { $regex: new RegExp(`^${req.body.city}$`, 'gi') };
        // console.log(RE);

        var user = await common_helper.findOne(User, { _id: new ObjectId(req.userInfo.id) })

        if (user && user.status == 1 && user.data.role_id == ("5d9d99003a0c78039c6dd00f")) {
            var user_id = user.data.emp_id
        }
        else {
            var user_id = req.userInfo.id
        }

        var exist_location = await common_helper.findOne(location, {
            is_del: false,
            city: RE, "emp_id": new ObjectId(user_id),
            _id: { $ne: new ObjectId(id) }
        })

        // console.log(' : exist_location ==> ', exist_location); return false;

        if (exist_location.status == 2) {
            var update_location = await common_helper.update(location, { "_id": id }, reg_obj)

            if (update_location.status == 0) {
                res.status(config.BAD_REQUEST).json({ "status": 0, "message": "No data found" });
            }
            else if (update_location.status == 1) {
                res.status(config.OK_STATUS).json({ "status": 1, "message": "Location is Updated successfully", "data": update_location });
            }
            else {
                res.status(config.INTERNAL_SERVER_ERROR).json({ "message": "No data found" });
            }
        } else {
            res.status(config.BAD_REQUEST).json({ "status": 0, "message": "This location is already exist" });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
})


router.put("/deactivate_location/:id", async (req, res) => {
    try {
        var obj = {
            is_del: true
        }

        var id = req.params.id;

        var resp_data = await Offer.find({ 'location': new ObjectId(id) });
        if (resp_data && resp_data.length > 0) {
            res.status(config.BAD_REQUEST).json({ "status": 0, "message": "This Location can't be deleted because it is used in offer." });
        } else {
            var resp_data = await common_helper.update(location, { "_id": id }, obj);
            if (resp_data.status == 0) {
                logger.error("Error occured while fetching User = ", resp_data);
                res.status(config.INTERNAL_SERVER_ERROR).json(resp_data);
            } else {
                logger.trace("User got successfully = ", resp_data);
                var data = resp_data.data
                res.status(config.OK_STATUS).json({ "message": "Location is Deleted successfully", resp_data });
            }
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});


router.get('/:id', async (req, res) => {
    try {
        var id = req.params.id;
        var location_detail = await common_helper.findOne(location, { "_id": ObjectId(id) })
        if (location_detail.status == 0) {
            res.status(config.INTERNAL_SERVER_ERROR).json({ "status": 0, "message": "Error occured while sending confirmation email" });
        }
        else if (location_detail.status == 1) {
            res.status(config.OK_STATUS).json({ "status": 1, "message": "Location Details are fetched successfully", "data": location_detail });
        }
        else {
            res.status(config.BAD_REQUEST).json({ "message": "No data found" });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});

module.exports = router;
