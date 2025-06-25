// models/ModRequest.js
const mongoose = require("mongoose");

const modRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true, // one active request per user
  },
  universityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "University",
    required: true,
  },
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Campus",
    required: true,
  },
  reason: {
    type: String,
    maxlength: 1000,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  rejectionReason: {
    type: String,
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  reviewedAt: {
    type: Date,
  },
//   actionsDoneTillNow: [
//     { type: String}
//   ]
});

module.exports = mongoose.model("ModRequest", modRequestSchema);
