const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const LocationSchema = new Schema({
    country: {
        type: mongoose.Types.ObjectId,
        ref: 'country_datas',
        // required: true
    },
    city: {
        type: String,
        required: true
    },
    emp_id: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        // required: true
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


module.exports = mongoose.model('location', LocationSchema, 'location');