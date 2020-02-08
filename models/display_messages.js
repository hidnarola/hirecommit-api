const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const DisplayMessageSchema = new Schema({
    msg_type: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    del: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});


module.exports = mongoose.model('display_messages', DisplayMessageSchema, 'display_messages');
