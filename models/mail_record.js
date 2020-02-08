const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const MailRecordSchema = new Schema({
    tracker_id: {
        type: String,
        required: true
    },
    offer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'offer'
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


module.exports = mongoose.model('mail_record', MailRecordSchema, 'mail_record');
