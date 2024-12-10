const mongoose = require("mongoose");
const { Schema } = mongoose;
const moment = require("moment");
const otpSchema = new Schema({
  email: {
    type: String,
    validate: {
      validator: function (value) {
        // Ensure email is only present if phone is not
        return !this.phone || !value; // True if only one is provided
      },
      message: "Either email or phone must be provided, not both.",
    },
  },
  phoneNumber: {
    type: String,
    validate: {
      validator: function (value) {
        // Ensure phone is only present if email is not
        return !this.email || !value; // True if only one is provided
      },
      message: "Either email or phone must be provided, not both.",
    },
  },
  otp: {
    type: String,
    required: true,
  },
  ref: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  refName: {
    type: String,
  },
  otpExpiration: {
    type: Date,
    default: () => moment().toDate(),
  },
  failedAttempts: {
    type: Number,
    default: 0,
  },
  resendCount: {
    type: Number,
    default: 0,
  },
  lastResentAt: {
    type: Date,
    default: () => moment().toDate(),
  },
  used: {
    type: Boolean,
    default: false,
  },
});

// Middleware to ensure either email or phone is provided
otpSchema.pre("validate", function (next) {
  if (!this.email && !this.phone) {
    return next(new Error("Either email or phone must be provided."));
  }
  next();
});

const OTP = mongoose.model("OTP", otpSchema);

module.exports = { OTP };
