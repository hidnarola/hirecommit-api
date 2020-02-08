var ObjectId = require('mongodb').ObjectID;

var user_helper = {};
user_helper.get_all_sub_user = async (collection, id, user_id, search, start, length, recordsTotal, sort) => {

  try {

    const RE = { $regex: new RegExp(`${search.value}`, 'gi') };
    var aggregate = [
      {
        $match: {
          "is_del": false,
          "emp_id": new ObjectId(id),
          "user_id": { $ne: new ObjectId(user_id) }
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
        }
      },
      {
        "$project": {
          "username": 1,
          "emp_id": "$emp_id",
          "user_id": "$user_id",
          "is_del": "$is_del",
          "user": {
            "admin_rights": "$user.admin_rights",
            "email_verified": "$user.email_verified",
            "isAllow": "$user.isAllow",
            "is_del": "$user.is_del",
            "flag": "$user.flag",
            "is_register": "$user.is_register",
            "is_login_first": "$user.is_login_first",
            "is_email_change": "$user.is_email_change",
            "email": "$user.email",
            "role_id": "$user.role_id",
            "emp_id": "$user.emp_id"
          },
          "insensitive": { "$toLower": "$username" }
        }
      }
    ]


    aggregate.push({
      "$match":
      {
        $or: [{ "username": RE },
        { "user.email": RE }]
      }
    });

    // if (sort) {
    //   aggregate.push({
    //     "$sort": sort
    //   });
    // }

    if (sort) {
      if (sort.username) {
        aggregate.push({
          "$sort": { "insensitive": sort.username }
        })
      } else {
        aggregate.push({
          "$sort": sort
        });
      }
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

user_helper.get_all_subs_users = async (collection, id, search, start, length, recordsTotal, sort) => {

  try {

    const RE = { $regex: new RegExp(`${search.value}`, 'gi') };
    var aggregate = [
      {
        $match: {
          "is_del": false,
          "emp_id": new ObjectId(id),
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
        }
      }
    ]

    aggregate.push({
      "$match":
      {
        $or: [{ "username": RE },
        { "user.email": RE }]
      }
    });

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


user_helper.get_all_approved_employer = async (collection, search, start, length, recordsTotal, sort) => {
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
        $unwind: {
          path: "$user",
          // preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup:
        {
          from: "business_type",
          localField: "businesstype",
          foreignField: "_id",
          as: "business"
        }
      },
      {
        $unwind:
        {
          path: "$business",
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
          $or: [{ "username": RE },
          { "user.email": RE }, { "business.country": RE }, { "companyname": RE }]
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

user_helper.get_all_new_employer = async (collection, search, start, length, recordsTotal, sort) => {
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
        $unwind: "$user"
      },
      {
        $lookup:
        {
          from: "business_type",
          localField: "businesstype",
          foreignField: "_id",
          as: "business"
        }
      },
      {
        $unwind:
        {
          path: "$business",
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
          $or: [{ "username": RE },
          { "user.email": RE }, { "business.country": RE }, { "companyname": RE }]
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


module.exports = user_helper;
