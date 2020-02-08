var ObjectId = require('mongodb').ObjectID;

var custom_helper = {};


custom_helper.get_all_custom_field = async (collection, id, search, start, length, recordsTotal, sort) => {
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
          "key": 1,
          "insensitive": { "$toLower": "$key" }
        }
      }
    ]

    if (search && search != "") {
      aggregate.push({
        "$match":
          { $or: [{ "key": RE }] }
      });
    }

    // if (sort) {
    //   aggregate.push({
    //     "$sort": sort
    //   });
    // }

    if (sort) {
      aggregate.push(
        { "$sort": { "insensitive": sort.key } }
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
    let salary = await collection.aggregate(aggregate);


    if (salary) {
      return { "status": 1, "message": "salary bracket details found", "salary": salary, "recordsTotal": recordsTotal };
    } else {
      return { "status": 2, "message": "salary bracket not found" };
    }
  } catch (err) {
    return { "status": 0, "message": "Error occured while finding custom field", "error": err }
  }
};

module.exports = custom_helper;
