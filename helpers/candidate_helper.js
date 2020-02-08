var ObjectId = require('mongodb').ObjectID;

var candidate_helper = {};
candidate_helper.get_all_approved_candidate = async (collection, search, start, length, recordsTotal, sort) => {
  try {
    const RE = { $regex: new RegExp(`${search.value}`, 'gi') };
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
          // preserveNullAndEmptyArrays: true
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
          // preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: { "user.isAllow": true }
      }

    ]

    if (search && search.value != '') {
      aggregate.push({
        "$match":
        {
          $or: [{ "firstname": RE }, { "user.email": RE }, { "contactno": RE }, { "document.name": RE }, { "drivingLicenseState": RE }, { "documentNumber": RE }, { "createdAt": RE }, { "status": RE },]
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
    let user = await collection.aggregate(aggregate);
    if (user) {
      return { "status": 1, "message": "user details found", "user": user, "recordsTotal": recordsTotal };
    } else {
      return { "status": 2, "message": "user not found" };
    }
  } catch (err) {
    return { "status": 0, "message": "Error occured while finding music", "error": err }
  }
};

candidate_helper.get_all_new_candidate = async (collection, search, start, length, recordsTotal, sort) => {
  try {
    const RE = { $regex: new RegExp(`${search.value}`, 'gi') };
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
          // preserveNullAndEmptyArrays: true
        }

      },
      {
        $match: { "user.isAllow": false }
      }
    ]

    if (search && search.value != '') {
      aggregate.push({
        "$match":
        {
          $or: [{ "firstname": RE }, { "user.email": RE }, { "contactno": RE }, { "document.name": RE }, { "drivingLicenseState": RE }, { "documentNumber": RE }, { "createdAt": RE }, { "status": RE }]
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
    let user = await collection.aggregate(aggregate);
    if (user) {
      return { "status": 1, "message": "user details found", "user": user, "recordsTotal": recordsTotal };
    } else {
      return { "status": 2, "message": "user not found" };
    }
  } catch (err) {
    return { "status": 0, "message": "Error occured while finding music", "error": err }
  }
};

module.exports = candidate_helper;
