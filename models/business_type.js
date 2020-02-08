const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const BusinessTypeSchema = new Schema({
  name: {
    type: String
  },
  country: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('business_type', BusinessTypeSchema, 'business_type');
