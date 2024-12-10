const mongoose = require("mongoose");
const { Schema, model } = mongoose;

/**
 *
 * @param {alumni} ObjectId can select etiher alumni or society
 *
 * @param {requiredDocuments} Object only required for alumni
 */
const verificationRequestSchema = new Schema(
  {
    alumni: {
      type: Schema.Types.ObjectId,
      ref: "User",
      //   required: true,
    },
    requiredDocuments: {
      busCardImage: { type: String },
      studentCardImage: { type: String },
      livePhoto: { type: String },
    },
    comments: { type: String, default: "" },
    society: {
      type: Schema.Types.ObjectId,
      ref: "Society",
      //   required: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      //   required: true,
    },
    assignedCampusModerator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      //   required: true,
    },
    approvedByModerator: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);
// SocietyVerifyRequest
const VerificationRequest = model(
  "VerificationRequest",
  verificationRequestSchema
);
module.exports = VerificationRequest;
