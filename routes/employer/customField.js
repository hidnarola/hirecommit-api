const express = require("express");
const router = express.Router();
const config = require("../../config");
const ObjectId = require("mongoose").Types.ObjectId;
const common_helper = require("../../helpers/common_helper");
const custom_helper = require("../../helpers/custom_helper");
const async = require("async");

const logger = config.logger;
const CustomField = require("../../models/customfield");
const User = require("../../models/user");
const Offer = require("../../models/offer");

router.post("/", async (req, res) => {
  try {
    var schema = {
      key: {
        notEmpty: true,
        errorMessage: "Key is required"
      }
    };
    req.checkBody(schema);

    var errors = req.validationErrors();
    if (!errors) {
      var user = await common_helper.findOne(User, {
        _id: new ObjectId(req.userInfo.id)
      });
      const country = await CustomField.findOne({
        is_del: false,
        emp_id: req.userInfo.id
      })
        .sort({ createdAt: -1 })
        .lean();
      if (country && country.serial_number) {
        var serial_number = country.serial_number + 1;
      }
      if (user && user.data.role_id == "5d9d99003a0c78039c6dd00f") {
        var obj = {
          emp_id: user.data.emp_id,
          key: req.body.key,
          serial_number: serial_number
        };
      } else {
        var obj = {
          emp_id: req.userInfo.id,
          key: req.body.key,
          serial_number: serial_number
        };
      }
      var string = req.body.key;
      var regex = new RegExp(["^", string, "$"].join(""), "i");
      var CustomeField_resp = await common_helper.findOne(CustomField, {
        is_del: false,
        emp_id: new ObjectId(obj.emp_id),
        key: regex
      });
      if (CustomeField_resp.status == 2) {
        var interest_resp = await common_helper.insert(CustomField, obj);
        if (interest_resp.status == 0) {
          logger.debug("Error = ", interest_resp.error);
          res.status(config.INTERNAL_SERVER_ERROR).json(interest_resp);
        } else {
          res.json({
            message: "Custom Field is Added successfully",
            data: interest_resp
          });
        }
      } else {
        res
          .status(config.BAD_REQUEST)
          .json({ message: "Custom Field already exists" });
      }
    } else {
      logger.error("Validation Error = ", errors);
      res.status(config.BAD_REQUEST).json({ message: errors });
    }
  } catch (error) {
    return res
      .status(config.BAD_REQUEST)
      .json({ message: error.message, success: false });
  }
});

router.put("/", async (req, res) => {
  try {
    var obj = {};
    if (req.body.key && req.body.key != "") {
      obj.key = req.body.key;
    }

    var user = await common_helper.findOne(User, {
      _id: new ObjectId(req.userInfo.id)
    });

    if (
      user &&
      user.status == 1 &&
      user.data.role_id == "5d9d99003a0c78039c6dd00f"
    ) {
      var user_id = user.data.emp_id;
    } else {
      var user_id = req.userInfo.id;
    }
    const RE = { $regex: new RegExp(`^${req.body.key}$`, "gi") };

    var exist_customfield = await common_helper.findOne(CustomField, {
      is_del: false,
      key: RE,
      emp_id: new ObjectId(user_id),
      _id: { $ne: new ObjectId(req.body.id) }
    });

    if (exist_customfield.status == 2) {
      var interest_resp = await common_helper.update(
        CustomField,
        { _id: req.body.id },
        obj
      );
      if (interest_resp.status == 0) {
        logger.debug("Error = ", interest_resp.error);
        res.status(config.INTERNAL_SERVER_ERROR).json(interest_resp);
      } else {
        res.json({
          message: "Custom Field is Updated successfully",
          data: interest_resp
        });
      }
    } else {
      return res
        .status(config.BAD_REQUEST)
        .json({
          status: 0,
          message: "This coustom field is already exist",
          success: false
        });
    }
  } catch (error) {
    return res
      .status(config.BAD_REQUEST)
      .json({ message: error.message, success: false });
  }
});

router.post("/get", async (req, res) => {
  try {
    user_id = req.userInfo.id;
    var user = await common_helper.findOne(User, {
      _id: new ObjectId(req.userInfo.id)
    });

    if (
      user &&
      user.status == 1 &&
      user.data.role_id == "5d9d99003a0c78039c6dd00f"
    ) {
      var user_id = user.data.emp_id;
    } else {
      var user_id = req.userInfo.id;
    }
    var aggregate = [
      {
        $match: {
          $or: [
            { emp_id: new ObjectId(req.userInfo.id) },
            { emp_id: new ObjectId(user.data.emp_id) }
          ],
          is_del: false
        }
      },
      {
        $project: {
          key: 1,
          insensitive: { $toLower: "$key" }
        }
      }
    ];

    const RE = { $regex: new RegExp(`${req.body.search.value}`, "gi") };
    if (req.body.search && req.body.search != "") {
      aggregate.push({
        $match: { $or: [{ key: RE }] }
      });
    }

    let totalMatchingCountRecords = await CustomField.aggregate(aggregate);
    totalMatchingCountRecords = totalMatchingCountRecords.length;

    var sortOrderColumnIndex = req.body.order[0].column;
    let sortOrderColumn =
      sortOrderColumnIndex == 0
        ? "key"
        : req.body.columns[sortOrderColumnIndex].data;
    let sortOrder = req.body.order[0].dir == "asc" ? 1 : -1;
    let sortingObject = {
      [sortOrderColumn]: sortOrder
    };

    var resp_data = await custom_helper.get_all_custom_field(
      CustomField,
      user_id,
      req.body.search,
      req.body.start,
      req.body.length,
      totalMatchingCountRecords,
      sortingObject
    );
    if (resp_data.status == 0) {
      logger.error("Error occurred while fetching User = ", resp_data);
      res.status(config.INTERNAL_SERVER_ERROR).json(resp_data);
    } else if (resp_data.status == 2) {
      res.status(config.BAD_REQUEST).json({ message: "No data found" });
    } else {
      logger.trace("User got successfully = ", resp_data);
      res.status(config.OK_STATUS).json(resp_data);
    }
  } catch (error) {
    return res
      .status(config.BAD_REQUEST)
      .json({ message: error.message, success: false });
  }
});

router.get("/", async (req, res) => {
  try {
    user_id = req.userInfo.id;
    var user = await common_helper.findOne(User, {
      _id: new ObjectId(req.userInfo.id)
    });

    var resp_data = await common_helper.find(CustomField, {
      $or: [
        { emp_id: new ObjectId(req.userInfo.id) },
        { emp_id: new ObjectId(user.data.emp_id) }
      ],
      is_del: false
    });
    if (resp_data.status == 0) {
      logger.error("Error occurred while fetching User = ", resp_data);
      res.status(config.INTERNAL_SERVER_ERROR).json(resp_data);
    } else if (resp_data.status == 2) {
      res.status(config.BAD_REQUEST).json({ message: "No data found" });
    } else {
      logger.trace("User got successfully = ", resp_data);
      res.status(config.OK_STATUS).json(resp_data);
    }
  } catch (error) {
    return res
      .status(config.BAD_REQUEST)
      .json({ message: error.message, success: false });
  }
});

router.get("/first", async (req, res) => {
  try {
    const country = await CustomField.find({
      emp_id: req.userInfo.id,
      is_del: false
    })
      .sort({ serial_number: 1 })
      .limit(1)
      .lean();
    if (country) {
      return res.status(config.OK_STATUS).json({
        success: true,
        message: "country list fetched successfully.",
        data: country
      });
    } else {
      return res.status(config.BAD_REQUEST).json({ message: "No Data Found" });
    }
  } catch (error) {
    return res.status(config.INTERNAL_SERVER_ERROR).send({
      success: false,
      message: "Error occurred in Fetching country data",
      data: country
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    var resp_datas = await common_helper.findOnes(CustomField, {
      _id: new ObjectId(req.params.id)
    });
    if (resp_datas && resp_datas.data) {
      if (req.params.id.length != 24) {
        res
          .status(config.BAD_REQUEST)
          .json({ message: "Your id must be 24 characters" });
      } else {
        var resp_data = await common_helper.findOne(
          CustomField,
          { _id: new ObjectId(req.params.id), is_del: false },
          1
        );
        if (resp_data.status == 0) {
          logger.error("Error occurred while fetching User = ", resp_data);
          res.status(config.INTERNAL_SERVER_ERROR).json(resp_data);
        } else {
          logger.trace("User got successfully = ", resp_data);
          res.status(config.OK_STATUS).json(resp_data);
        }
      }
    } else {
      res.status(config.BAD_REQUEST).json({ message: "No data found" });
    }
  } catch (error) {
    return res
      .status(config.BAD_REQUEST)
      .json({ message: error.message, success: false });
  }
});

router.put("/delete/:id", async (req, res) => {
  try {
    var obj = {
      is_del: true
    };

    var user = await common_helper.findOne(User, { _id: req.userInfo.id });
    var user_id;
    if (user.data.role_id == "5d9d99003a0c78039c6dd00f") {
      user_id = user.data.emp_id;
    } else {
      user_id = req.userInfo.id;
    }

    var resp_data = await common_helper.findOne(CustomField, {
      _id: req.params.id
    });
    var resp_data1 = await Offer.find({
      employer_id: user_id,
      "customfeild.key": resp_data.data.key
    });

    if (resp_data1 && resp_data1.length > 0) {
      res
        .status(config.BAD_REQUEST)
        .json({
          status: 0,
          message:
            "This Custom Field can't be deleted because it is used in offer."
        });
    } else {
      var interest_resp = await common_helper.update(
        CustomField,
        { _id: req.params.id },
        obj
      );
      if (interest_resp.status == 0) {
        logger.debug("Error = ", interest_resp.error);
        res.status(config.INTERNAL_SERVER_ERROR).json(interest_resp);
      } else {
        res.json({
          message: "Custom Field is Deleted successfully",
          data: interest_resp
        });
      }
    }
  } catch (error) {
    return res
      .status(config.BAD_REQUEST)
      .json({ message: error.message, success: false });
  }
});

module.exports = router;
