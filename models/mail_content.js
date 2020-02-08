const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const MailTypeSchema = new Schema({
    mail_type: {
        type: String,
        required: true
    },
    content: {
        type: String,
        // required: true
    },
    upper_content: {
        type: String,
        required: true
    },
    lower_content: {
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


module.exports = mongoose.model('mail_content', MailTypeSchema, 'mail_content');
