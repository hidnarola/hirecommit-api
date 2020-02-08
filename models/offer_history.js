const mongoose = require("mongoose");
const Schema = mongoose.Schema;



// Create Schema
const OfferHistorySchema = new Schema({
  offer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'offer'
  },
  status: {
    type: String,
    default: "On Hold"
  },
  message: {
    type: String
  },
  employer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  is_del: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('offer_history', OfferHistorySchema, 'offer_history');
