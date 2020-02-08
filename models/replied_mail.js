const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const schema = new Schema({
    offerid: {
        type: mongoose.Types.ObjectId,
        ref: "Offer",
        require: true
    },
    message: {},
}, { timestamp: true });

module.exports = mongoose.model('RepliedMail', schema, 'RepliedMail');
