var ObjectId = require('mongoose').Types.ObjectId;
var moment = require('moment');

var offer_helper = {};


offer_helper.get_all_offer = async (collection, id, search, start, length, recordsTotal, sort) => {
  try {
    const RE = { $regex: new RegExp(`${search.value}`, 'gi') };
    var aggregate = [
      {
        $match: {
          "is_del": false,
          $or: [{ "employer_id": new ObjectId(id) }, { "employer_id": new ObjectId(id) }],
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
      }, {
        $lookup:
        {
          from: "candidateDetail",
          localField: "user_id",
          foreignField: "user_id",
          as: "candidate"
        }
      },
      {
        $unwind: {
          path: "$candidate",
          preserveNullAndEmptyArrays: true
        }
      }, {
        $lookup: {
          from: "user",
          localField: "user_id",
          foreignField: "_id",
          as: "candidate.user",
        }
      },
      {
        $unwind: {
          path: "$candidate.user",
          preserveNullAndEmptyArrays: true
        }
      },
    ]

    if (search && search.value != '') {
      aggregate.push({
        "$match":
          { $or: [{ "createdAt": RE }, { "title": RE }, { "salarytype": RE }, { "salarybracket.from": RE }, { "expirydate": RE }, { "joiningdate": RE }, { "status": RE }, { "offertype": RE }, { "group.name": RE }, { "commitstatus": RE }, { "customfeild1": RE }, { "candidate.user.email": RE }, { "candidate.firstname": RE }] }
      });
    }
    if (sort) {
      aggregate.push({
        "$sort": sort
      });
    }

    if (start) {
      aggregate.push({
        "$skip": start
      });
    }
    if (length) {
      aggregate.push({
        "$limit": length
      });
    }
    let offer = await collection.aggregate(aggregate);

    if (offer) {
      return { "status": 1, "message": "offer list found", "offer": offer, "recordsTotal": recordsTotal };
    } else {
      return { "status": 2, "message": "offer not found" };
    }
  } catch (err) {
    return { "status": 0, "message": "Error occured while finding offer", "error": err }
  }
};

offer_helper.get_candidate_offer = async (collection, id, search, start, length, recordsTotal, sort) => {
  try {

    const RE = { $regex: new RegExp(`${search.value}`, 'gi') };
    var aggregate = [
      {
        $match: {
          "is_del": false,
          "user_id": new ObjectId(id),
          // "status": { $ne: 'On Hold' },
          $and:
            [
              { status: { $ne: 'On Hold' } },
              { status: { $ne: 'Inactive' } }
            ]
          // "expirydate": { $gte: new Date() }
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
      // {
      //   $lookup:
      //   {
      //     from: "candidateDetail",
      //     localField: "user_id",
      //     foreignField: "user_id",
      //     as: "candidate"
      //   }
      // },
      // {
      //   $unwind: {
      //     path: "$candidate",
      //     preserveNullAndEmptyArrays: true
      //   }
      // },
      // {
      //   $lookup: {
      //     from: "user",
      //     localField: "user_id",
      //     foreignField: "_id",
      //     as: "candidate.user",
      //   }
      // },
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

    if (search && search.value != '') {
      aggregate.push({
        "$match":
          { $or: [{ "createdAt": RE }, { "title": RE }, { "salarytype": RE }, { "salarybracket.from": RE }, { "expirydate": RE }, { "joiningdate": RE }, { "status": RE }, { "offertype": RE }, { "group.name": RE }, { "commitstatus": RE }, { "customfeild1": RE }, { "employer_id.employer.username": RE }, { "created_by.username": RE }, { "employer_id.employer.companyname": RE }] }
      });
    }
    if (sort) {
      aggregate.push({
        "$sort": sort
      });
    }

    if (start) {
      aggregate.push({
        "$skip": start
      });
    }
    if (length) {
      aggregate.push({
        "$limit": length
      });
    }


    let offer = await collection.aggregate(aggregate);

    if (offer) {
      return { "status": 1, "message": "offer list found", "offer": offer, "recordsTotal": recordsTotal };
    } else {
      return { "status": 2, "message": "offer not found" };
    }
  } catch (err) {
    return { "status": 0, "message": "Error occured while finding offer", "error": err }
  }
};

offer_helper.get_all_created_offer = async (collection, id, search, start, length, recordsTotal, sort, startdate, enddate) => {
  try {
    const RE = { $regex: new RegExp(`${search.value}`, 'gi') };
    var aggregate = [
      {
        $match: {
          "is_del": false,
          $or: [{ "employer_id": new ObjectId(id) }, { "employer_id": new ObjectId(id) }],
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
          from: "candidateDetail",
          localField: "user_id",
          foreignField: "user_id",
          as: "candidate"
        }
      },
      {
        $unwind: {
          path: "$candidate",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "user",
          localField: "user_id",
          foreignField: "_id",
          as: "candidate.user",
        }
      },
      {
        $unwind: {
          path: "$candidate.user",
          preserveNullAndEmptyArrays: true
        }
      }
    ]

    if (search && search.value != '') {
      aggregate.push({
        "$match":
          { $or: [{ "createdAt": RE }, { "title": RE }, { "salarytype": RE }, { "salarybracket.from": RE }, { "expirydate": RE }, { "joiningdate": RE }, { "status": RE }, { "offertype": RE }, { "group.name": RE }, { "commitstatus": RE }, { "customfeild1": RE }] }
      });
    }

    if (startdate != undefined && startdate != "" && enddate != undefined && enddate != "") {
      // let start_date = moment(startdate).utc().startOf('day').add(1, 'days');
      // let end_date = moment(enddate).utc().endOf('day').add(1, 'days');
      let start_date = moment(startdate).utc().startOf('day');
      let end_date = moment(enddate).utc().endOf('day');
      aggregate.push({
        $match: {
          "createdAt": { $gte: moment(start_date).toDate(), $lte: moment(end_date).toDate() }
        }
      });
    }

    if (sort) {
      aggregate.push({
        "$sort": sort
      });
    }

    if (start) {
      aggregate.push({
        "$skip": start
      });
    }
    if (length) {
      aggregate.push({
        "$limit": length
      });
    }
    let offer = await collection.aggregate(aggregate);

    if (offer) {
      return { "status": 1, "message": "offer list found", "offer": offer, "recordsTotal": recordsTotal };
    } else {
      return { "status": 2, "message": "offer not found" };
    }
  } catch (err) {
    return { "status": 0, "message": "Error occured while finding offer", "error": err }
  }
};

module.exports = offer_helper;
