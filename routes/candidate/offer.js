const express = require("express");
const router = express.Router();
const async = require('async');

const config = require('../../config')
const Offer = require('../../models/offer');
const ObjectId = require('mongoose').Types.ObjectId;
const common_helper = require('../../helpers/common_helper');
const offer_helper = require('../../helpers/offer_helper');

const logger = config.logger;
const moment = require("moment")
const User = require('../../models/user');
const Candidate = require('../../models/candidate-detail');
const History = require('../../models/offer_history');
const Employer = require('../../models/employer-detail');
const SubEmployer = require('../../models/sub-employer-detail');
const OfferTypeMessage = require('../../models/offer_type_message');
const Location = require('../../models/location');
const MailType = require('../../models/mail_content');
const mail_helper = require('../../helpers/mail_helper');
const communication_mail_helper = require('../../helpers/communication_mail_helper');


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
            if (user.status == 1 && user.data.role_id == ObjectId("5d9d99003a0c78039c6dd00f")) {
                var user_id = user.data.emp_id
            }
            else {
                var user_id = req.userInfo.id
            }
            var aggregate = [
                {
                    $match: {
                        "user_id": new ObjectId(req.userInfo.id),
                        "is_del": false,
                        $and:
                            [
                                { status: { $ne: 'On Hold' } },
                                { status: { $ne: 'Inactive' } }
                            ]
                    }
                },
                {
                    $lookup:
                    {
                        from: "group",
                        localField: "groups",
                        foreignField: "_id",
                        as: "group"
                    }
                },
                {
                    $unwind: {
                        path: "$group",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup:
                    {
                        from: "user",
                        localField: "employer_id",
                        foreignField: "_id",
                        as: "employer_id"
                    }
                },
                {
                    $unwind: {
                        path: "$employer_id",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup:
                    {
                        from: "employerDetail",
                        localField: "employer_id._id",
                        foreignField: "user_id",
                        as: "employer_id.employer"
                    }
                },
                {
                    $unwind: {
                        path: "$employer_id.employer",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup:
                    {
                        from: "location",
                        localField: "location",
                        foreignField: "_id",
                        as: "location"
                    }
                },
                {
                    $unwind: {
                        path: "$location",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup:
                    {
                        from: "salary_bracket",
                        localField: "salarybracket",
                        foreignField: "_id",
                        as: "salarybracket"
                    }
                },
                {
                    $unwind: {
                        path: "$salarybracket",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup:
                    {
                        from: "subemployerDetail",
                        localField: "created_by",
                        foreignField: "user_id",
                        as: "created_by"
                    }
                },
                {
                    $unwind: {
                        path: "$created_by",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "user",
                        localField: "created_by.user_id",
                        foreignField: "_id",
                        as: "created_by.user",
                    }
                },
                {
                    $unwind: {
                        path: "$created_by.user",
                        preserveNullAndEmptyArrays: true
                    }
                }
            ]

            const RE = { $regex: new RegExp(`${req.body.search.value}`, 'gi') };
            if (req.body.search && req.body.search.value != '') {
                aggregate.push({
                    "$match":
                        { $or: [{ "createdAt": RE }, { "title": RE }, { "salarytype": RE }, { "salarybracket.from": RE }, { "expirydate": RE }, { "joiningdate": RE }, { "status": RE }, { "offertype": RE }, { "group.name": RE }, { "commitstatus": RE }, { "customfeild1": RE }, { "candidate.user.email": RE }, { "employer_id.employer.username": RE }, { "created_by.username": RE }, { "employer_id.employer.companyname": RE }] }
                });
            }
            let totalMatchingCountRecords = await Offer.aggregate(aggregate);
            totalMatchingCountRecords = totalMatchingCountRecords.length;

            var resp_data = await offer_helper.get_candidate_offer(Offer, req.userInfo.id, req.body.search, req.body.start, req.body.length, totalMatchingCountRecords, sortingObject);
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


router.post('/type_message', async (req, res) => {
    try {
        const message_type = await OfferTypeMessage.findOne({ "type": req.body.type });
        if (message_type) {
            return res.status(config.OK_STATUS).json({ 'message': "Offer detail", "status": 1, data: message_type });
        }
        else {
            return res.status(config.BAD_REQUEST).json({ 'message': 'No Data Found' })
        }

    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});


router.get('/details/:id', async (req, res) => {
    try {
        var id = req.params.id;
        var aggregate = [
            {
                $match: {
                    "_id": ObjectId(id)
                }
            },
            {
                $lookup:
                {
                    from: "group",
                    localField: "groups",
                    foreignField: "_id",
                    as: "group"
                }
            },
            {
                $unwind: {
                    path: "$group",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup:
                {
                    from: "user",
                    localField: "employer_id",
                    foreignField: "_id",
                    as: "employer_id"
                }
            },
            {
                $unwind: {
                    path: "$employer_id",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup:
                {
                    from: "employerDetail",
                    localField: "employer_id._id",
                    foreignField: "user_id",
                    as: "employer_id.employer"
                }
            },
            {
                $unwind: {
                    path: "$employer_id.employer",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup:
                {
                    from: "location",
                    localField: "location",
                    foreignField: "_id",
                    as: "location"
                }
            },
            {
                $unwind: {
                    path: "$location",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup:
                {
                    from: "salary_bracket",
                    localField: "salarybracket",
                    foreignField: "_id",
                    as: "salarybracket"
                }
            },
            {
                $unwind: {
                    path: "$salarybracket",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup:
                {
                    from: "subemployerDetail",
                    localField: "created_by",
                    foreignField: "user_id",
                    as: "created_by"
                }
            },
            {
                $unwind: {
                    path: "$created_by",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "user",
                    localField: "created_by.user_id",
                    foreignField: "_id",
                    as: "created_by.user",
                }
            },
            {
                $unwind: {
                    path: "$created_by.user",
                    preserveNullAndEmptyArrays: true
                }
            }
        ]

        var offre_resp = await Offer.aggregate(aggregate);
        if (offre_resp) {
            return res.status(config.OK_STATUS).json({ 'message': "Offer detail", "status": 1, data: offre_resp });

        }
        else {
            return res.status(config.BAD_REQUEST).json({ 'message': 'No Data Found' })
        }

    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
});

router.put('/', async (req, res) => {
    try {
        var reg_obj = {
            "status": "Accepted",
            "acceptedAt": new Date()
        }
        var current_date = moment();
        var offer = await common_helper.findOne(Offer, { _id: new ObjectId(req.body.id), "expirydate": { $gte: moment(current_date).startOf('day') } })
        if (offer.status == 1) {
            sub_account_upadate = await common_helper.update(Offer, { "_id": req.body.id }, reg_obj)
            reg_obj.offer_id = req.body.id;

            var candidate = await common_helper.findOne(Candidate, { "user_id": req.userInfo.id });
            var candidates = await common_helper.findOne(User, { "_id": req.userInfo.id });
            reg_obj.message = `<span>{candidate}</span> has accepted your offer.`;

            var interest = await common_helper.insert(History, reg_obj);
            if (sub_account_upadate.status == 0) {
                res.status(config.BAD_REQUEST).json({ "status": 0, "message": "No data found" });
            }
            else if (sub_account_upadate.status == 1) {
                if (sub_account_upadate.data.communication !== undefined && sub_account_upadate.data.communication.length > 0) {
                    var companyname_resp = await common_helper.findOne(Employer, { "user_id": sub_account_upadate.data.employer_id })
                    var candidate_email = await common_helper.findOne(User, { "_id": sub_account_upadate.data.user_id })
                    var candidate_name = await common_helper.findOne(Candidate, { "user_id": sub_account_upadate.data.user_id })
                    var location = await common_helper.findOne(Location, { "_id": sub_account_upadate.data.location })

                    for (const comm of sub_account_upadate.data.communication) {
                        if (comm.trigger == "beforeJoining" && comm.day >= 0 && comm.mail_send == false && sub_account_upadate.data.status == "Accepted") {
                            var offer_date = moment(sub_account_upadate.data.joiningdate).startOf('day').subtract(comm.day, 'day');
                            offer_date = moment(offer_date);
                            if (moment(offer_date).startOf('day') <= current_date) {
                                var message = comm.message;
                                message = message.replace(/\|\|offer_date\|\|/g, moment(sub_account_upadate.data.createdAt).startOf('day').format('DD/MM/YYYY')).replace(/\|\|candidate_name\|\|/g, `${candidate_name.data.firstname + " " + candidate_name.data.lastname}`).replace(/\|\|title\|\|/g, sub_account_upadate.data.title).replace(/\|\|location\|\|/g, location.data.city).replace(/\|\|joining_date\|\|/g, moment(sub_account_upadate.data.joiningdate).startOf('day').format('DD/MM/YYYY')).replace(/\|\|expiry_date\|\|/g, moment(sub_account_upadate.data.expirydate).startOf('day').format('DD/MM/YYYY')).replace(/\|\|acceptance_date\|\|/g, moment(sub_account_upadate.data.acceptedAt).startOf('day').format('DD/MM/YYYY'));

                                var obj = {
                                    "message": message,
                                    "subject": comm.subject,
                                    "companyname": companyname_resp.data.companyname
                                }

                                let mail_resp = await communication_mail_helper.send('d-e3cb56d304e1461d957ffd8fe141819c', {
                                    "to": candidate_email.data.email,
                                    "reply_to": `${sub_account_upadate.data._id + "_" + comm._id + "_" + "communication"}@em7977.hirecommit.com`,
                                    "subject": comm.subject,
                                    "trackid": sub_account_upadate.data._id + "_" + comm._id + "_" + "communication"
                                }, obj);

                                if (mail_resp.status == 1) {
                                    var update_offer_communication = await common_helper.update(Offer,
                                        { "_id": sub_account_upadate.data._id, "communication._id": comm._id },
                                        {
                                            $set: {
                                                "communication.$.reply": false,
                                                "communication.$.open": false,
                                                "communication.$.mail_send": true
                                            }
                                        })
                                }
                            }
                        } else if (comm.trigger == "afterJoining" && comm.day == 0 && comm.mail_send == false && sub_account_upadate.data.status == "Accepted") {
                            if (moment(sub_account_upadate.data.joiningdate).startOf('day').isSame(moment(current_date).startOf('day'))) {
                                var message = comm.message;
                                message = message.replace(/\|\|offer_date\|\|/g, moment(sub_account_upadate.data.createdAt).startOf('day').format('DD/MM/YYYY')).replace(/\|\|candidate_name\|\|/g, `${candidate_name.data.firstname + " " + candidate_name.data.lastname}`).replace(/\|\|title\|\|/g, sub_account_upadate.data.title).replace(/\|\|location\|\|/g, location.data.city).replace(/\|\|joining_date\|\|/g, moment(sub_account_upadate.data.joiningdate).startOf('day').format('DD/MM/YYYY')).replace(/\|\|expiry_date\|\|/g, moment(sub_account_upadate.data.expirydate).startOf('day').format('DD/MM/YYYY')).replace(/\|\|acceptance_date\|\|/g, moment(sub_account_upadate.data.acceptedAt).startOf('day').format('DD/MM/YYYY'));

                                var obj = {
                                    "message": message,
                                    "subject": comm.subject,
                                    "companyname": companyname_resp.data.companyname
                                }

                                let mail_resp = await communication_mail_helper.send('d-e3cb56d304e1461d957ffd8fe141819c', {
                                    "to": candidate_email.data.email,
                                    "reply_to": `${sub_account_upadate.data._id + "_" + comm._id + "_" + "communication"}@em7977.hirecommit.com`,
                                    "subject": comm.subject,
                                    "trackid": sub_account_upadate.data._id + "_" + comm._id + "_" + "communication"
                                }, obj);

                                if (mail_resp.status == 1) {
                                    var update_offer_communication = await common_helper.update(Offer,
                                        { "_id": sub_account_upadate.data._id, "communication._id": comm._id },
                                        {
                                            $set: {
                                                "communication.$.reply": false,
                                                "communication.$.open": false,
                                                "communication.$.mail_send": true
                                            }
                                        })
                                }
                            }
                        } else if (comm.trigger == "afterAcceptance" && comm.day == 0 && comm.mail_send == false && sub_account_upadate.data.status == "Accepted") {
                            if (moment(sub_account_upadate.data.acceptedAt).startOf('day').isSame(moment(current_date).startOf('day'))) {
                                var message = comm.message;
                                message = message.replace(/\|\|offer_date\|\|/g, moment(sub_account_upadate.data.createdAt).startOf('day').format('DD/MM/YYYY')).replace(/\|\|candidate_name\|\|/g, `${candidate_name.data.firstname + " " + candidate_name.data.lastname}`).replace(/\|\|title\|\|/g, sub_account_upadate.data.title).replace(/\|\|location\|\|/g, location.data.city).replace(/\|\|joining_date\|\|/g, moment(sub_account_upadate.data.joiningdate).startOf('day').format('DD/MM/YYYY')).replace(/\|\|expiry_date\|\|/g, moment(sub_account_upadate.data.expirydate).startOf('day').format('DD/MM/YYYY')).replace(/\|\|acceptance_date\|\|/g, moment(sub_account_upadate.data.acceptedAt).startOf('day').format('DD/MM/YYYY'));

                                var obj = {
                                    "message": message,
                                    "subject": comm.subject,
                                    "companyname": companyname_resp.data.companyname
                                }

                                let mail_resp = await communication_mail_helper.send('d-e3cb56d304e1461d957ffd8fe141819c', {
                                    "to": candidate_email.data.email,
                                    "reply_to": `${sub_account_upadate.data._id + "_" + comm._id + "_" + "communication"}@em7977.hirecommit.com`,
                                    "subject": comm.subject,
                                    "trackid": sub_account_upadate.data._id + "_" + comm._id + "_" + "communication"
                                }, obj);

                                if (mail_resp.status == 1) {
                                    var update_offer_communication = await common_helper.update(Offer,
                                        { "_id": sub_account_upadate.data._id, "communication._id": comm._id },
                                        {
                                            $set: {
                                                "communication.$.reply": false,
                                                "communication.$.open": false,
                                                "communication.$.mail_send": true
                                            }
                                        })
                                }
                            }
                        }
                    }
                }

                if (sub_account_upadate.data.AdHoc !== undefined && sub_account_upadate.data.AdHoc.length > 0) {
                    var companyname_resp = await common_helper.findOne(Employer, { "user_id": sub_account_upadate.data.employer_id })
                    var candidate_email = await common_helper.findOne(User, { "_id": sub_account_upadate.data.user_id })
                    var candidate_name = await common_helper.findOne(Candidate, { "user_id": sub_account_upadate.data.user_id })
                    var location = await common_helper.findOne(Location, { "_id": sub_account_upadate.data.location })

                    for (const comm of sub_account_upadate.data.AdHoc) {
                        if (comm.AdHoc_trigger == "beforeJoining" && comm.AdHoc_day >= 0 && comm.AdHoc_mail_send == false && sub_account_upadate.data.status == "Accepted") {
                            var offer_date = moment(sub_account_upadate.data.joiningdate).startOf('day').subtract(comm.AdHoc_day, 'day');
                            offer_date = moment(offer_date);
                            if (moment(offer_date).startOf('day') <= current_date) {
                                var message = comm.AdHoc_message;
                                message = message.replace(/\|\|offer_date\|\|/g, moment(sub_account_upadate.data.createdAt).startOf('day').format('DD/MM/YYYY')).replace(/\|\|candidate_name\|\|/g, `${candidate_name.data.firstname + " " + candidate_name.data.lastname}`).replace(/\|\|title\|\|/g, sub_account_upadate.data.title).replace(/\|\|location\|\|/g, location.data.city).replace(/\|\|joining_date\|\|/g, moment(sub_account_upadate.data.joiningdate).startOf('day').format('DD/MM/YYYY')).replace(/\|\|expiry_date\|\|/g, moment(sub_account_upadate.data.expirydate).startOf('day').format('DD/MM/YYYY')).replace(/\|\|acceptance_date\|\|/g, moment(sub_account_upadate.data.acceptedAt).startOf('day').format('DD/MM/YYYY'));

                                var obj = {
                                    "message": message,
                                    "subject": comm.AdHoc_subject,
                                    "companyname": companyname_resp.data.companyname
                                }
                                let mail_resp = await communication_mail_helper.send('d-e3cb56d304e1461d957ffd8fe141819c', {
                                    "to": candidate_email.data.email,
                                    "reply_to": `${sub_account_upadate.data._id + "_" + comm._id + "_" + "adhoc"}@em7977.hirecommit.com`,
                                    "subject": comm.AdHoc_subject,
                                    "trackid": sub_account_upadate.data._id + "_" + comm._id + "_" + "adhoc"
                                }, obj);

                                console.log(' : mail_resp hi==> ', mail_resp);
                                if (mail_resp.status == 1) {
                                    var update_offer_communication = await common_helper.update(Offer,
                                        { "_id": sub_account_upadate.data._id, "AdHoc._id": comm._id },
                                        {
                                            $set: {
                                                "AdHoc.$.AdHoc_reply": false,
                                                "AdHoc.$.AdHoc_open": false,
                                                "AdHoc.$.AdHoc_mail_send": true
                                            }
                                        })
                                }
                            }
                        } else if (comm.AdHoc_trigger == "afterJoining" && comm.AdHoc_day == 0 && comm.AdHoc_mail_send == false && sub_account_upadate.data.status == "Accepted") {
                            if (moment(sub_account_upadate.data.joiningdate).startOf('day').isSame(moment(current_date).startOf('day'))) {
                                var message = comm.AdHoc_message;
                                message = message.replace(/\|\|offer_date\|\|/g, moment(sub_account_upadate.data.createdAt).startOf('day').format('DD/MM/YYYY')).replace(/\|\|candidate_name\|\|/g, `${candidate_name.data.firstname + " " + candidate_name.data.lastname}`).replace(/\|\|title\|\|/g, sub_account_upadate.data.title).replace(/\|\|location\|\|/g, location.data.city).replace(/\|\|joining_date\|\|/g, moment(sub_account_upadate.data.joiningdate).startOf('day').format('DD/MM/YYYY')).replace(/\|\|expiry_date\|\|/g, moment(sub_account_upadate.data.expirydate).startOf('day').format('DD/MM/YYYY')).replace(/\|\|acceptance_date\|\|/g, moment(sub_account_upadate.data.acceptedAt).startOf('day').format('DD/MM/YYYY'));

                                var obj = {
                                    "message": message,
                                    "subject": comm.AdHoc_subject,
                                    "companyname": companyname_resp.data.companyname
                                }
                                let mail_resp = await communication_mail_helper.send('d-e3cb56d304e1461d957ffd8fe141819c', {
                                    "to": candidate_email.data.email,
                                    "reply_to": `${sub_account_upadate.data._id + "_" + comm._id + "_" + "adhoc"}@em7977.hirecommit.com`,
                                    "subject": comm.AdHoc_subject,
                                    "trackid": sub_account_upadate.data._id + "_" + comm._id + "_" + "adhoc"
                                }, obj);
                                if (mail_resp.status == 1) {
                                    var update_offer_communication = await common_helper.update(Offer,
                                        { "_id": sub_account_upadate.data._id, "AdHoc._id": comm._id },
                                        {
                                            $set: {
                                                "AdHoc.$.AdHoc_reply": false,
                                                "AdHoc.$.AdHoc_open": false,
                                                "AdHoc.$.AdHoc_mail_send": true
                                            }
                                        })
                                }
                            }
                        } else if (comm.AdHoc_trigger == "afterAcceptance" && comm.AdHoc_day == 0 && comm.AdHoc_mail_send == false && sub_account_upadate.data.status == "Accepted") {
                            if (moment(sub_account_upadate.data.acceptedAt).startOf('day').isSame(moment(current_date).startOf('day'))) {
                                var message = comm.AdHoc_message;
                                message = message.replace(/\|\|offer_date\|\|/g, moment(sub_account_upadate.data.createdAt).startOf('day').format('DD/MM/YYYY')).replace(/\|\|candidate_name\|\|/g, `${candidate_name.data.firstname + " " + candidate_name.data.lastname}`).replace(/\|\|title\|\|/g, sub_account_upadate.data.title).replace(/\|\|location\|\|/g, location.data.city).replace(/\|\|joining_date\|\|/g, moment(sub_account_upadate.data.joiningdate).startOf('day').format('DD/MM/YYYY')).replace(/\|\|expiry_date\|\|/g, moment(sub_account_upadate.data.expirydate).startOf('day').format('DD/MM/YYYY')).replace(/\|\|acceptance_date\|\|/g, moment(sub_account_upadate.data.acceptedAt).startOf('day').format('DD/MM/YYYY'));

                                var obj = {
                                    "message": message,
                                    "subject": comm.AdHoc_subject,
                                    "companyname": companyname_resp.data.companyname
                                }
                                let mail_resp = await communication_mail_helper.send('d-e3cb56d304e1461d957ffd8fe141819c', {
                                    "to": candidate_email.data.email,
                                    "reply_to": `${sub_account_upadate.data._id + "_" + comm._id + "_" + "adhoc"}@em7977.hirecommit.com`,
                                    "subject": comm.AdHoc_subject,
                                    "trackid": sub_account_upadate.data._id + "_" + comm._id + "_" + "adhoc"
                                }, obj);
                                // console.log(' : mail_resp hi==> ', mail_resp);
                                if (mail_resp.status == 1) {
                                    var update_offer_communication = await common_helper.update(Offer,
                                        { "_id": sub_account_upadate.data._id, "AdHoc._id": comm._id },
                                        {
                                            $set: {
                                                "AdHoc.$.AdHoc_reply": false,
                                                "AdHoc.$.AdHoc_open": false,
                                                "AdHoc.$.AdHoc_mail_send": true
                                            }
                                        })
                                    console.log(' : update_offer_communication ==> ', update_offer_communication);
                                }

                            }
                        }
                    }
                }

                var offer = await common_helper.findOne(Offer, { _id: new ObjectId(req.body.id) })
                var message = await common_helper.findOne(MailType, { 'mail_type': 'candidate-accept-offer' });
                let upper_content = message.data.upper_content;
                let lower_content = message.data.lower_content;
                var employername = await common_helper.findOne(SubEmployer, { user_id: new ObjectId(offer.data.created_by) })
                var employername1 = await common_helper.findOne(Employer, { user_id: new ObjectId(offer.data.created_by) })
                var companyname;
                if (employername.status === 1) {
                    var emp_name = employername.data.username;
                    let contact_name = await common_helper.findOne(Employer, { "user_id": employername.data.emp_id })
                    companyname = contact_name.data.companyname;
                } else if (employername1.status === 1) {
                    var emp_name = employername1.data.username;
                    companyname = employername1.data.companyname;
                }

                upper_content = upper_content.replace('{employername}', companyname).replace("{joiningdate}", moment(offer.data.joiningdate).startOf('day').format('DD/MM/YYYY'));
                let mail_resp = await mail_helper.send("candidate_accept_offer", {
                    "to": candidates.data.email,
                    "subject": "You have accepted offer from " + companyname
                }, {
                    "name": candidate.data.firstname,
                    "upper_content": upper_content,
                    "lower_content": lower_content
                });


                var employee = await common_helper.find(User, {
                    "isAllow": true,
                    "is_del": false,
                    $or: [
                        { "_id": new ObjectId(offer.data.employer_id) },
                        { "emp_id": new ObjectId(offer.data.employer_id) },
                    ]
                })

                for (let index = 0; index < employee.data.length; index++) {
                    const element = employee.data[index];
                    if (element.role_id == ("5d9d99003a0c78039c6dd00f")) {
                        var emp_name = await common_helper.findOne(SubEmployer, { "user_id": new ObjectId(element._id) })
                        var email = emp_name.data.username;
                        var name = email.substring(0, email.lastIndexOf(" "));
                        if (name === "") {
                            name = email;
                        }
                    } else if (element.role_id == ("5d9d98a93a0c78039c6dd00d")) {
                        var emp_name = await common_helper.findOne(Employer, { "user_id": new ObjectId(element._id) })
                        var email = emp_name.data.username;
                        var name = email.substring(0, email.lastIndexOf(" "));
                        if (name === "") {
                            name = email;
                        }
                    }

                    var location = await common_helper.findOne(Location, { '_id': offer.data.location });

                    var message = await common_helper.findOne(MailType, { 'mail_type': 'notification-accept-offer' });
                    let upper_content = message.data.upper_content;
                    let middel_content = message.data.middel_content;
                    let lower_content = message.data.lower_content;
                    upper_content = upper_content.replace('{candidatename}', `${candidate.data.firstname} ${candidate.data.lastname}`).replace("{title}", offer.data.title).replace("{location}", location.data.city);

                    let mail_resp = await mail_helper.send("notification_accept_offer", {
                        "to": element.email,
                        "subject": `${candidate.data.firstname} ${candidate.data.lastname}` + " has accepted offer"
                    }, {
                        "name": name,
                        "upper_content": upper_content,
                        "middel_content": middel_content,
                        "lower_content": lower_content
                    });
                }

                res.status(config.OK_STATUS).json({ "status": 1, "message": "Offer is Accepted", "data": sub_account_upadate });
            }
            else {
                res.status(config.INTERNAL_SERVER_ERROR).json({ "message": "Error occurred while fetching data." });
            }
        }
        else {
            res.status(config.BAD_REQUEST).json({ "message": "Offer is out of date" })
        }
    } catch (error) {
        return res.status(config.BAD_REQUEST).json({ 'message': error.message, "success": false })
    }
})

module.exports = router;
