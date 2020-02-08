const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const CustomFieldSchema = new Schema({
  serial_number: {
    type: Number,
    default: 1
  },
  emp_id:
  {
    type: mongoose.Schema.Types.ObjectId, ref: 'user',
  },
  key: {
    type: String
  },
  is_del:
  {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('custom_field', CustomFieldSchema, 'custom_field');
