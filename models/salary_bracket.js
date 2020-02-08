const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const Salary_Bracket_Schema = new Schema({
  country: {
    type: mongoose.Types.ObjectId,
    ref: "country_datas",
    // required: true
  },
  emp_id: {
    type: mongoose.Types.ObjectId,
    ref: "user",
    // required: true
  },
  from: {
    type: String,
    require: true
  },
  to: {
    type: String,
    require: true
  },
  is_del: {
    type: Boolean,
    default: false
  },
  salary_type: {
    type: String
  },
  start: {
    type: Date
  },
  end: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});


module.exports = mongoose.model('salary_bracket', Salary_Bracket_Schema, 'salary_bracket');
