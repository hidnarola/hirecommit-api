const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const OfferTypeMessageSchema = new Schema({
    type: {
        type: String,
    },
    message: {
        type: String,
    }

});


module.exports = mongoose.model('offer_type_message', OfferTypeMessageSchema, 'offer_type_message');
