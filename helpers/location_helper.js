var ObjectId = require('mongodb').ObjectID;

var location_helper = {};





location_helper.get_all_location = async (collection, id, search, start, length, recordsTotal, sort) => {
  try {
    const RE = { $regex: new RegExp(`${search.value}`, 'gi') };
    var aggregate = [
      {
        $match: {
          "is_del": false,
          "emp_id": new ObjectId(id)
        }
      },
      {
        "$project": {
          "city": 1,
          "insensitive": { "$toLower": "$city" }
        }
      }
      // {
      //   $lookup:
      //   {
      //     from: "country_datas",
      //     localField: "country",
      //     foreignField: "_id",
      //     as: "country"
      //   }
      // },
      // {
      //   $unwind: "$country",
      // },
    ]


    if (search && search != "") {
      aggregate.push({
        "$match":
          { $or: [{ "city": RE }, { "country.country": RE }] }
      });
    }

    // if (sort) {
    //   aggregate.push({
    //     "$sort": sort
    //   });
    // }

    if (sort) {
      aggregate.push(
        { "$sort": { "insensitive": sort.city } }
      )
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
    let location = await collection.aggregate(aggregate);


    if (location) {
      return { "status": 1, "message": "Location details found", "location": location, "recordsTotal": recordsTotal };
    } else {
      return { "status": 2, "message": "location not found" };
    }
  } catch (err) {
    return { "status": 0, "message": "Error occured while finding location", "error": err }
  }
};


module.exports = location_helper;
