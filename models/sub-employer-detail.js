const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// Create Schema
const SubEmployerDetailSchema = new Schema({
  country: {
    type: String,
    required: false
  },
  companyname: {
    type: String,
    required: false
  },
  username: {
    type: String,
    required: true
  },
  countrycode: {
    type: String,
    required: false
  },
  contactno: {
    type: String,
    required: false
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  emp_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  is_del: {
    type: Boolean,
    default: false
  },
  createdate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('subemployerDetail', SubEmployerDetailSchema, 'subemployerDetail');
