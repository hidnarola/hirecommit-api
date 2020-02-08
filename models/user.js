const mongoose = require("mongoose");
var bcrypt = require('bcryptjs');
var SALT_WORK_FACTOR = 10;

const Schema = mongoose.Schema;

// Create Schema
const UserSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    // required: true
  },
  role_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'role'
  },
  admin_rights: {
    type: String,
    default: "no"
  },
  email_verified: {
    type: Boolean,
    default: false
  },
  isAllow: {
    type: Boolean,
    default: false
  },
  is_del: {
    type: Boolean,
    default: false
  },
  flag: {
    type: Number,
    default: 1
  },
  emp_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  is_register: {
    type: Boolean,
    default: false
  },
  is_login_first: {
    type: Boolean,
    default: false
  },
  is_email_change: {
    type: Boolean,
    default: false
  },
  createdate: {
    type: Date,
    default: Date.now
  }
});

UserSchema.pre('save', function (next) {
  var user = this;
  // only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) return next();
  // generate a salt
  bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
    if (err) return next(err);
    // hash the password using our new salt
    bcrypt.hash(user.password, salt, function (err, hash) {
      if (err) return next(err);
      // override the cleartext password with the hashed one
      user.password = hash;
      next();
    });
  });
});

module.exports = mongoose.model('user', UserSchema, 'user');
