const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const RoleSchema = new Schema({
  role: {
    type: String,
    required: true
  },
  createdAt: {
      type: Date,
      default: Date.now
  }
});

module.exports = mongoose.model('role', RoleSchema,'role');
