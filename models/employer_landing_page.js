const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const EmployerLandingPageSchema = new Schema({
    header_bluepart: {
        main_heading_1: { type: String },
        main_heading_2: { type: String },
        main_heading_3: { type: String },
        main_heading_4: { type: String },
        content_1: { type: String },
        content_2: { type: String },
        image: { type: String }
    },
    structured_automated: {
        heading_1: { type: String },
        heading_2: { type: String },
        content_1: { type: String },
        content_2: { type: String },
        content_3: { type: String },
        image: { type: String }
    },
    advance_alerts: {
        heading_1: { type: String },
        heading_2: { type: String },
        content_1: { type: String },
        content_2: { type: String },
        content_3: { type: String }
    },
    signup_for_free: {
        heading_1: { type: String },
        content_1: { type: String },
        image: { type: String }
    },
    send_offer_to_candidate: {
        heading_1: { type: String },
        content_1: { type: String },
        image: { type: String }
    },
    one_time_setup: {
        heading_1: { type: String },
        content_1: { type: String },
        image: { type: String }
    },
    candidate_accept: {
        heading_1: { type: String },
        content_1: { type: String },
        image: { type: String }
    },
    monitor_alert_communication: {
        heading_1: { type: String },
        content_1: { type: String },
        image: { type: String }
    },
    candidate_joins: {
        heading_1: { type: String },
        content_1: { type: String },
        image: { type: String }
    },
    data_security: {
        heading_1: { type: String },
        heading_2: { type: String },
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

module.exports = mongoose.model('employer_landing_page', EmployerLandingPageSchema, 'employer_landing_page');
