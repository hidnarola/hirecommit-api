const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var CommunicationSchema = new Schema({
  communicationname: { type: String, required: true },
  trigger: { type: String, required: true },
  day: { type: Number, required: true },
  subject: { type: String, required: true },
  priority: { type: String, required: true },
  message: { type: String },
  is_del: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const GroupDetailSchema = new Schema({
  group_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'group'
  },
  communication: [{ type: CommunicationSchema }],
  is_del: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('group_detail', GroupDetailSchema, 'group_detail');
