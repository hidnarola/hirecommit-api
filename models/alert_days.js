const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const AlertDaysSchema = new Schema({
    high_unopened: {
        type: Number,
        // required: true
    },
    high_notreplied: {
        type: Number,
        // required: true
    },
    medium_unopened: {
        type: Number,
        // required: true
    },
    medium_notreplied: {
        type: Number,
        // required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('alert_days', AlertDaysSchema, 'alert_days');
