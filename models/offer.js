const mongoose = require("mongoose");
const Schema = mongoose.Schema;



const customField = new Schema({
  key: String,
  value: String
})

var CommunicationSchema = new Schema({
  communicationname: { type: String, required: true },
  subject: { type: String, required: true },
  open: { type: Boolean },
  open_date: { type: Date },
  reply: { type: Boolean },
  reply_date: { type: Date },
  mail_send: { type: Boolean, default: false },
  trigger: { type: String, required: true },
  day: { type: Number, required: true },
  priority: { type: String, required: true },
  message: { type: String },
  is_del: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

var AdhockSchema = new Schema({
  AdHoc_communicationname: { type: String, required: true },
  AdHoc_subject: { type: String, required: true },
  AdHoc_open: { type: Boolean },
  AdHoc_open_date: { type: Date },
  AdHoc_reply: { type: Boolean },
  AdHoc_reply_date: { type: Date },
  AdHoc_mail_send: { type: Boolean, default: false },
  AdHoc_trigger: { type: String, required: true },
  AdHoc_day: { type: Number, required: true },
  AdHoc_priority: { type: String, required: true },
  AdHoc_message: { type: String },
  is_del: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Create Schema
const OfferSchema = new Schema({
  employer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  mail_status: {
    type: String,
    default: "UnOpened"
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  title: {
    type: String,
    required: true
  },
  salarytype: {
    type: String,
    require: true
  },
  salaryduration: {
    type: String
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'location'
  },
  currency_type: {
    type: String
  },
  communication: [{ type: CommunicationSchema }],
  AdHoc: [{ type: AdhockSchema }],
  expirydate: {
    type: Date,
    required: true
  },
  joiningdate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    default: "Released"
  },
  offertype: {
    type: String,
    required: true
  },
  groups: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'group'
  },
  commitstatus: {
    type: String,
    // require: true
  },

  customfeild: [

    customField

  ],
  notes: {
    type: String
  },
  salary: {
    type: Number
  },
  salary_from: {
    type: Number
  },
  salary_to: {
    type: Number
  },
  high_unopened: {
    type: Number,
  },
  high_notreplied: {
    type: Number,
  },
  medium_unopened: {
    type: Number,
  },
  medium_notreplied: {
    type: Number,
  },
  is_active: {
    type: Boolean,
    default: true
  },
  reply: {
    type: Boolean,
    default: false
  },
  reply_At: {
    type: Date,
    default: ""
  },
  email_open: {
    type: Boolean,
    default: false
  },
  open_At: {
    type: Date,
    default: ""
  },
  is_del: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date,
    default: ""
  }
});

module.exports = mongoose.model('offer', OfferSchema, 'offer');
