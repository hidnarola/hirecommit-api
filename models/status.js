const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const Status_Schema = new Schema({
    status: {
        type: String,
        require: true
    },
    MessageContent: {
        type: String,
        require: true
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


module.exports = mongoose.model('status', Status_Schema, 'status');
