const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// Create Schema
const EmployerDetailSchema = new Schema({
  country: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'country_datas'
    //required: true
  },
  businesstype: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'business_type'
  },
  companyname: {
    type: String,
    required: true
  },
  website: {
    type: String,
  },
  username: {
    type: String,
    required: true
  },
  countrycode: {
    type: String,
    required: true
  },
  contactno: {
    type: String,
    required: true
  },
  user_id: {
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

module.exports = mongoose.model('employerDetail', EmployerDetailSchema, 'employerDetail');
