const express = require("express");
const router = express.Router();
const async = require('async');

const config = require('../../config')
const ObjectId = require('mongoose').Types.ObjectId;
const common_helper = require('../../helpers/common_helper');
const groups_helper = require('../../helpers/groups_helper');
const logger = config.logger;
const group = require('../../models/group');
const GroupDetail = require('../../models/group-detail');
const AlertDays = require('../../models/alert_days');
const Offer = require('../../models/offer');
const User = require('../../models/user');



router.get("/groups_list", async (req, res) => {
    try {
        var user = await common_helper.findOne(User, { _id: new ObjectId(req.userInfo.id) })

        if (user && user.status == 1 && user.data.role_id == ("5d9d99003a0c78039c6dd00f")) {
            var user_id = user.data.emp_id
        }
        else {
            var user_id = req.userInfo.id
        }
        // flag: "undraft",
        var group_list = await common_helper.find(group, { is_del: false, "emp_id": new ObjectId(user_id) });
        if (group_list.status === 1) {
            return res.status(config.OK_STATUS).json({ 'message': "group List", "status": 1, data: group_list });
        }
        else {
            return res.status(config.BAD_REQUEST).json({ 'message': "No Record Found", "status": 0 });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
})

router.get("/alert_days", async (req, res) => {
    try {
        var resp_data = await common_helper.findOne(AlertDays, { "_id": "5de8c4d8e714b7546c9f6361" })
        if (resp_data.status == 1) {
            return res.status(config.OK_STATUS).json({ 'message': "Alert days List", "status": 1, data: resp_data.data });
        } else {
            return res.status(config.BAD_REQUEST).json({ 'message': "No Record Found", "status": 0 });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
})

//groups
router.post("/", async (req, res) => {
    try {
        var schema = {
            "name": {
                notEmpty: true,
                errorMessage: "Group Name is required"
            }
        };
        req.checkBody(schema);

        var errors = req.validationErrors();
        if (!errors) {
            var user = await common_helper.findOne(User, { _id: new ObjectId(req.userInfo.id) })
            if (user && user.data.role_id == ("5d9d99003a0c78039c6dd00f")) {

                var reg_obj = {
                    "emp_id": user.data.emp_id,
                    "name": req.body.name,
                    "high_unopened": req.body.high_unopened,
                    "high_notreplied": req.body.high_notreplied,
                    "medium_unopened": req.body.medium_unopened,
                    "medium_notreplied": req.body.medium_notreplied,
                    "low_unopened": req.body.low_unopened,
                    "low_notreplied": req.body.medium_notreplied,
                    "start": req.body.start,
                    "end": req.body.end
                };
            }
            else {
                var reg_obj = {
                    "emp_id": req.userInfo.id,
                    "name": req.body.name.toLowerCase(),
                    "high_unopened": req.body.high_unopened,
                    "high_notreplied": req.body.high_notreplied,
                    "medium_unopened": req.body.medium_unopened,
                    "medium_notreplied": req.body.medium_notreplied,
                    "low_unopened": req.body.low_unopened,
                    "low_notreplied": req.body.medium_notreplied,
                    "start": req.body.start,
                    "end": req.body.end
                };
            }
            var string = req.body.name;
            var regex = new RegExp(["^", string, "$"].join(""), "i");
            var group_resp = await common_helper.findOne(group, { "is_del": false, "emp_id": reg_obj.emp_id, "name": regex });
            if (group_resp.status == 2) {
                var interest_resp = await common_helper.insert(group, reg_obj);
                if (interest_resp.status == 0) {
                    logger.debug("Error = ", interest_resp.error);
                    res.status(config.INTERNAL_SERVER_ERROR).json(interest_resp);
                } else {
                    res.json({ "message": "Group is Added successfully", "data": interest_resp })
                }
            }
            else {
                res.status(config.BAD_REQUEST).json({ message: "Group already exists" });
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
            let sortOrderColumn = sortOrderColumnIndex == 0 ? 'name' : req.body.columns[sortOrderColumnIndex].data;

            let sortOrder = req.body.order[0].dir == 'asc' ? 1 : -1;
            let sortingObject = {
                [sortOrderColumn]: sortOrder
            }
            // console.log(sortingObject);

            var user = await common_helper.findOne(User, { _id: new ObjectId(req.userInfo.id) })
            if (user.status == 1 && user.data.role_id == ("5d9d99003a0c78039c6dd00f")) {
                var user_id = user.data.emp_id
            }
            else {
                var user_id = req.userInfo.id
            }

            var aggregate = [
                {
                    $match:
                        { $or: [{ "emp_id": new ObjectId(req.userInfo.id) }, { "emp_id": new ObjectId(user.data.emp_id) }], "is_del": false }

                },
                {
                    "$project": {
                        "name": 1,
                        "is_del": "$is_del",
                        "flag": "$flag",
                        "emp_id": "$emp_id",
                        "high_unopened": "$high_unopened",
                        "medium_unopened": "$medium_unopened",
                        "createdAt": "$createdAt",
                        "high_notreplied": "$high_notreplied",
                        "medium_notreplied": "$medium_notreplied",
                        "insensitive": { "$toLower": "$name" }
                    }
                }
            ]

            const RE = { $regex: new RegExp(`${req.body.search.value}`, 'gi') };
            if (req.body.search && req.body.search != "") {
                aggregate.push({
                    "$match":
                    {
                        $or: [{ "name": RE }, { "high_unopened": RE }, { "high_notreplied": RE }, { "medium_unopened": RE }, { "medium_notreplied": RE },

                        ]
                    }
                });
            }


            let totalMatchingCountRecords = await group.aggregate(aggregate);
            totalMatchingCountRecords = totalMatchingCountRecords.length;
            var resp_data = await groups_helper.get_all_groups(group, user_id, req.body.search, req.body.start, req.body.length, totalMatchingCountRecords, sortingObject);

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

router.put('/', async (req, res) => {
    try {
        var obj = {
        };

        if (req.body.name && req.body.name != "") {
            obj.name = req.body.name
        }

        if (req.body.subject && req.body.subject != "") {
            obj.subject = req.body.subject
        }

        if (req.body.data && JSON.parse(req.body.data).length <= 0) {
            obj.flag = "draft"
        }

        if (req.body.data && JSON.parse(req.body.data).length > 0) {
            obj.flag = "undraft"
        }

        if (req.body.high_unopened && req.body.high_unopened != "") {
            obj.high_unopened = req.body.high_unopened
        }

        if (req.body.high_notreplied && req.body.high_notreplied != "") {
            obj.high_notreplied = req.body.high_notreplied
        }

        if (req.body.medium_unopened && req.body.medium_unopened != "") {
            obj.medium_unopened = req.body.medium_unopened
        }

        if (req.body.medium_notreplied && req.body.medium_notreplied != "") {
            obj.medium_notreplied = req.body.medium_notreplied
        }

        var id = req.body.id;

        var user = await common_helper.findOne(User, { _id: new ObjectId(req.userInfo.id) })

        if (user && user.status == 1 && user.data.role_id == ("5d9d99003a0c78039c6dd00f")) {
            var user_id = user.data.emp_id
        }
        else {
            var user_id = req.userInfo.id
        }

        // var privious_group = await common_helper.findOne(group, {
        //     is_del: false, flag: "undraft",
        //     "_id": new ObjectId(id), name: RE, "emp_id": new ObjectId(user_id)
        // })
        // console.log(' : privious_group ==> ', privious_group.data);
        const RE = { $regex: new RegExp(`^${req.body.name}$`, 'gi') };
        // console.log(RE);

        var exist_group = await common_helper.findOne(group, {
            is_del: false, flag: "undraft",
            name: RE, "emp_id": new ObjectId(user_id), _id: { $ne: new ObjectId(id) }
        })


        // console.log(' : exist_group ==> ', exist_group.status)
        if (exist_group.status == 2) {
            // console.log(' : obj ==> ', obj);
            var group_upadate = await common_helper.update(group, { "_id": new ObjectId(id) }, obj)

            const reqData = req.body.data;
            const grp_data = {
                group_id: req.body.id,
                communication: JSON.parse(reqData)
            };
            var find_communication = await common_helper.findOne(GroupDetail, { "group_id": req.body.id })
            if (find_communication.status == 1) {
                var response = await common_helper.update(GroupDetail, { "group_id": req.body.id }, grp_data);
                // var obj = {
                //     flag: "undraft"
                // }
                // var responses = await common_helper.update(group, { "_id": (req.body.id) }, obj);
            }
            else {
                var response = await common_helper.insert(GroupDetail, grp_data);
                // var obj = {
                //     flag: "undraft"
                // }
                // var responses = await common_helper.update(group, { "_id": (req.body.id) }, obj);
            }

            if (group_upadate.status == 0) {
                res.status(config.INTERNAL_SERVER_ERROR).json({ "status": 0, "message": "No data found" });
            }
            else if (group_upadate.status == 1) {
                res.status(config.OK_STATUS).json({ "status": 1, "message": "Group is Updated successfully", "data": group_upadate, "communication": response });
            }
        } else {
            res.status(config.BAD_REQUEST).json({ "status": 0, "message": "This group is already exist" });
        }
        // var exist_group = await common_helper.find(group, { name: { $regex: req.body.name, $options: "$i" } })
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
})


router.post("/communication/:id", async (req, res) => {
    try {
        var schema =
            [{
                "communicationname": {
                    notEmpty: true,
                    errorMessage: "Communication Name is required"
                },
                "trigger": {
                    notEmpty: true,
                    errorMessage: "Trigger is required"
                },
                "day": {
                    notEmpty: true,
                    errorMessage: "Days are required"
                },
                "priority": {
                    notEmpty: true,
                    errorMessage: "Priority is required"
                }
            }];

        req.checkBody(schema);
        var errors = req.validationErrors();
        if (!errors) {
            const reqData = req.body.data;
            const grp_data = {
                group_id: req.params.id,
                communication: reqData
            };
            var response = await common_helper.insert(GroupDetail, grp_data);


            if (response.status === 0) {
                throw new Error('Error occured while inserting data');
            }
            res.status(config.OK_STATUS).json(response);
        }
        else {
            logger.error("Validation Error = ", errors);
            res.status(config.BAD_REQUEST).json({ message: errors });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});

router.put("/communication/:id", async (req, res) => {
    try {
        var schema =
            [{
                "communicationname": {
                    notEmpty: true,
                    errorMessage: "Communication Name is required"
                },
                "trigger": {
                    notEmpty: true,
                    errorMessage: "Trigger is required"
                },
                "day": {
                    notEmpty: true,
                    errorMessage: "Days are required"
                },
                "priority": {
                    notEmpty: true,
                    errorMessage: "Priority is required"
                },
                "subject": {
                    notEmpty: true,
                    errorMessage: "Subject is required"
                }
            }];

        req.checkBody(schema);
        var errors = req.validationErrors();
        if (!errors) {
            const reqData = req.body.data;
            const grp_data = {
                group_id: req.params.id,
                communication: reqData
            };
            var response = await common_helper.update(GroupDetail, { "group_id": req.params.id }, grp_data);
            if (response.status === 0) {
                throw new Error('Error occured while inserting data');
            }
            res.status(config.OK_STATUS).json(response);
        }
        else {
            logger.error("Validation Error = ", errors);
            res.status(config.BAD_REQUEST).json({ message: errors });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});

router.get('/communication_detail/:id', async (req, res) => {
    try {
        var group_detail = await common_helper.find(GroupDetail, { "communication.is_del": false, group_id: new ObjectId(req.params.id) });

        if (group_detail.status === 1) {
            return res.status(config.OK_STATUS).json({ 'message': "Group details are fetched successfully", "status": 1, data: group_detail });
        }
        else if (group_detail.status === 2) {
            return res.status(config.OK_STATUS).json({ 'message': "No Records Found", "status": 2 });
        }
        else {
            return res.status(config.BAD_REQUEST).json({ 'message': "Error occurred while fetching", "status": 0 });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});

router.get('/:id', async (req, res) => {
    try {
        var group_detail = await common_helper.find(group, { _id: ObjectId(req.params.id) });
        if (group_detail.status === 1) {
            var group_details = await common_helper.find(GroupDetail, { "communication.is_del": false, group_id: new ObjectId(req.params.id) });

            return res.status(config.OK_STATUS).json({ 'message': "Group details are fetched successfully", "status": 1, data: group_detail, communication: group_details });
        }
        else if (group_detail.status === 2) {
            return res.status(config.OK_STATUS).json({ 'message': "No Record Found", "status": 2 });
        }
        else {
            return res.status(config.BAD_REQUEST).json({ 'message': "Error occurred while fetching", "status": 0 });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});

router.put('/', async (req, res) => {
    try {
        var obj = {
        };

        if (req.body.name && req.body.name != "") {
            obj.name = req.body.name
        }
        if (req.body.high_unopened && req.body.high_unopened != "") {
            obj.high_unopened = req.body.high_unopened
        }
        if (req.body.high_notreplied && req.body.high_notreplied != "") {
            obj.high_notreplied = req.body.high_notreplied
        }
        if (req.body.medium_unopened && req.body.medium_unopened != "") {
            obj.medium_unopened = req.body.medium_unopened
        }
        if (req.body.medium_unopened && req.body.medium_unopened != "") {
            obj.medium_unopened = req.body.medium_unopened
        }
        if (req.body.low_unopened && req.body.low_unopened != "") {
            obj.low_unopened = req.body.low_unopened
        }
        if (req.body.low_notreplied && req.body.low_notreplied != "") {
            obj.low_notreplied = req.body.low_notreplied
        }
        var id = req.body.id;

        var group_upadate = await common_helper.update(group, { "_id": new ObjectId(id) }, obj)

        if (group_upadate.status == 0) {
            res.status(config.INTERNAL_SERVER_ERROR).json({ "status": 0, "message": "No data found" });
        }
        else if (group_upadate.status == 1) {
            res.status(config.OK_STATUS).json({ "status": 1, "message": "Group is Updated successfully", "data": group_upadate });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
})


router.put("/deactivate_group/:id", async (req, res) => {
    try {
        var obj = {
            is_del: true
        }
        var id = req.params.id;

        var resp_data = await Offer.find({ 'groups': new ObjectId(id) });
        if (resp_data && resp_data.length > 0) {
            res.status(config.BAD_REQUEST).json({ "status": 0, "message": "This group can't be deleted because it is used in offer." });
        } else {
            var resp_group_data = await common_helper.update(group, { "_id": id }, obj);
            var resp_groupdetail_data = await common_helper.update(GroupDetail, { "group_id": id }, obj);

            if (resp_group_data.status == 0 || resp_groupdetail_data.status == 0) {
                logger.error("Error occured while fetching User = ", resp_group_data);
                res.status(config.INTERNAL_SERVER_ERROR).json({ "status": 0, "message": "Error occurred while fetching data.", "data": resp_group_data });
            }
            else if (resp_group_data.status == 1 || resp_groupdetail_data.status == 1) {
                logger.trace("User got successfully = ", resp_groupdetail_data);
                res.status(config.OK_STATUS).json({ "status": 1, "message": "Record is Deleted Successfully", resp_group_data });
            }
            else if (resp_group_data.status == 2 || resp_groupdetail_data.status == 2) {
                logger.trace("User got successfully = ", resp_group_data);
                res.status(config.BAD_REQUEST).json({ "status": 2, "message": "No Data Found." });
            }
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});

router.put("/deactivate_communication/:id", async (req, res) => {
    try {

        var id = req.params.id;

        var resp_group_data = await common_helper.GroupDetail(GroupDetail, { "communication._id": new ObjectId(id) }, { "communication.is_del": true });

        if (resp_group_data) {

            logger.trace("User got successfully = ", resp_group_data);
            res.status(config.OK_STATUS).json({ "status": 1, "message": "Record is Deleted Successfully", resp_group_data });
        }
        else {
            return res.status(config.BAD_REQUEST).json({ 'message': 'No Data Found' })
        }

    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});

router.get('/commit_status/:id', async (req, res) => {
    try {
        var group_details = await common_helper.find(GroupDetail, { "communication.is_del": false, group_id: new ObjectId(req.params.id) });

        let priority = [];
        function onlyUnique(value, index, self) {
            return self.indexOf(value) === index;
        }
        for (let index = 0; index < group_details.data[0].communication.length; index++) {
            const element = group_details.data[0].communication[index];
            priority.push(element.priority)
        }
        var unique = priority.filter(onlyUnique);
        commitstatus = [];
        for (let index = 0; index < unique.length; index++) {
            const element = unique[index];
            var data = { 'lable': element, 'value': element }
            commitstatus.push(data);
        }
        if (group_details.status === 1) {
            return res.status(config.OK_STATUS).json({ 'message': "Group details are fetched successfully", "status": 1, commitstatus: commitstatus });
        }
        else if (group_details.status === 2) {
            return res.status(config.OK_STATUS).json({ 'message': "No Record Found", "status": 2 });
        }
        else {
            return res.status(config.BAD_REQUEST).json({ 'message': "Error occurred while fetching", "status": 0 });
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});



module.exports = router;
