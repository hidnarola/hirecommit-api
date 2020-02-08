const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const CandidateLandingPageSchema = new Schema({
    header_bluepart: {
        main_heading_1: { type: String },
        main_heading_2: { type: String },
        content_1: { type: String },
        content_2: { type: String },
        image: { type: String }
    },
    signup_for_free: {
        heading_1: { type: String },
        content_1: { type: String },
        image: { type: String }
    },
    receive_offers: {
        heading_1: { type: String },
        content_1: { type: String },
        image: { type: String }
    },
    accept_offer: {
        heading_1: { type: String },
        content_1: { type: String },
        image: { type: String }
    },
    join_company: {
        heading_1: { type: String },
        content_1: { type: String },
        image: { type: String }
    },
    data_security: {
        heading_1: { type: String },
        content_1: { type: String },
        image: { type: String }
    },
    transparency: {
        heading_1: { type: String },
        heading_2: { type: String },
        content_1: { type: String },
        content_2: { type: String }
    },
    support_identity: {
        heading_1: { type: String },
        heading_2: { type: String },
        content_1: { type: String },
        image: { type: String }
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

module.exports = mongoose.model('candidate_landing_page', CandidateLandingPageSchema, 'candidate_landing_page');
