const mongoose = require("mongoose");
const { Schema, model } = mongoose;

/**
 * Enhanced Verification Request Schema
 * Supports both Alumni and Society verification requests
 * 
 * @param {alumni} ObjectId - For alumni verification requests
 * @param {society} ObjectId - For society verification requests
 */
const verificationRequestSchema = new Schema(
  {
    // Entity being verified (either alumni or society)
    alumni: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return !this.society;
      },
    },
    society: {
      type: Schema.Types.ObjectId,
      ref: "Society",
      required: function () {
        return !this.alumni;
      },
    },

    // Society-specific verification documents
    societyDocuments: {
      registrationCertificate: {
        url: { type: String },
        fileName: { type: String },
        uploadedAt: { type: Date }
      },
      eventPicture: {
        url: { type: String },
        fileName: { type: String },
        uploadedAt: { type: Date }
      },
      advisorEmailScreenshot: {
        url: { type: String },
        fileName: { type: String },
        uploadedAt: { type: Date }
      },
      customDocuments: [{
        name: { type: String, required: true },
        url: { type: String, required: true },
        fileName: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
      }]
    },

    // Verification requirements checklist
    requirements: {
      registrationCertificate: { type: Boolean, default: false },
      eventPicture: { type: Boolean, default: false },
      advisorEmailScreenshot: { type: Boolean, default: false },
      moderatorRequest: { type: Boolean, default: false },
      communityVoting: { type: Boolean, default: false }
    },

    // Alumni-specific documents (legacy support)
    requiredDocuments: {
      busCardImage: { type: String },
      studentCardImage: { type: String },
      livePhoto: { type: String },
    },

    // Request details
    comments: { type: String, default: "" },
    communityVoting: { type: Boolean, default: false },

    // User roles and assignments
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedCampusModerator: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedByModerator: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBySuper: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedByModerator: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedBySuper: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Status and workflow
    status: {
      type: String,
      enum: ["pending", "under_review", "moderator_approved", "approved", "rejected"],
      default: "pending",
    },
    
    // Admin review details
    adminReview: {
      reviewedAt: { type: Date },
      reviewNotes: { type: String },
      rejectionReason: { type: String }
    },

    // Moderator review details
    moderatorReview: {
      reviewedAt: { type: Date },
      reviewNotes: { type: String },
      rejectionReason: { type: String }
    },

    // Priority and categorization
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium"
    },

    // Metadata
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for request type
verificationRequestSchema.virtual('requestType').get(function() {
  return this.society ? 'society' : 'alumni';
});

// Virtual for processing time
verificationRequestSchema.virtual('processingTime').get(function() {
  if (this.status === 'approved' || this.status === 'rejected') {
    const endDate = this.adminReview?.reviewedAt || this.updatedAt;
    return Math.floor((endDate - this.submittedAt) / (1000 * 60 * 60 * 24)); // Days
  }
  return Math.floor((new Date() - this.submittedAt) / (1000 * 60 * 60 * 24)); // Days pending
});

// Pre-save middleware
verificationRequestSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Indexes for performance
verificationRequestSchema.index({ status: 1, submittedAt: -1 });
verificationRequestSchema.index({ society: 1 });
verificationRequestSchema.index({ alumni: 1 });
verificationRequestSchema.index({ requestedBy: 1 });
verificationRequestSchema.index({ assignedCampusModerator: 1 });

const VerificationRequest = model("VerificationRequest", verificationRequestSchema);
module.exports = VerificationRequest;
