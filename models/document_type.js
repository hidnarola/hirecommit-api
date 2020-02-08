const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const DocumentTypeSchema = new Schema({
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

module.exports = mongoose.model('document_type', DocumentTypeSchema, 'document_type');
