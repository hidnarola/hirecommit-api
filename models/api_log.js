const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const ApiLogSchema = new Schema({
    api_response: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('api_log', ApiLogSchema, 'api_log');
