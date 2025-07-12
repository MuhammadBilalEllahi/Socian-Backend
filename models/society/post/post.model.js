const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const postSchema = new Schema(
  {
    title: { type: String, required: true },
    body: { type: String },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    society: {
      type: Schema.Types.ObjectId,
      ref: "Society",
      required: function () {
        return !this.isPersonalPost && !this.subSociety;
      },
      index: true,
    },
    subSociety: {
      type: Schema.Types.ObjectId,
      ref: "SubSociety",
      required: function () {
        return !this.isPersonalPost && !this.society;
      },
      index: true,
    },

    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },

    createdAt: { type: Date, default: Date.now },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    voteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SocietyPostAndCommentVote",
    },
    commentsCount: { type: Number, default: 0 },
    media: [
      {
        type: {
          type: String,
          enum: [
            "image",
            "video",
            "video/*",
            "video/mp4",
            "link",
            "text",
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/*",
            "audio/m4a", "audio", "audio/opus", "audio/webm", "audio/*"
          ], //add youtube url later
          default: "text",
        },
        url: { type: String, default: "" },
        transcodedVideosUrl: [
          {
            resolution: {
              type: String,
              enum: ["128p", "320p", "480p", "760p", "1080p", "2k", "4k"],
            },
            url: { type: String, default: "" },
          },
        ],

        // processedImageUrl:  { type: String, default: "" },
      },
    ],
    flair: { type: String, default: "" },
    comments: { type: Schema.Types.ObjectId, ref: "PostCommentCollection" },
    status: {
      isActive: { type: Boolean, default: true },
      isDeleted: { type: Boolean, default: false },
      isArchived: { type: Boolean, default: false },
    },
    isReported: {
      status: { type: Boolean, default: false },
      reportId: { type: Schema.Types.ObjectId, ref: "Report", default: null },
      reason: { type: String, default: null }
    },
    editedAt: { type: Date },
    isPromoted: {
      promoted: { type: Boolean, default: false },
      byUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },

    shareableLevel: {
      type: String,
      enum: ['campus', 'inter', 'all']
    },

    // Repost Option
    isRepost: {
      type: Boolean,
      default: false
    },
    repostedPost: {
      type: Schema.Types.ObjectId,
      ref: 'Post'
    },
    isPersonalPost: {
      type: Boolean,
      default: false
    },
    postByAdmin: {
      type: Boolean,
      default: false
    },
    adminSetStatus: {
      isArchived: {
        type: Boolean,
        default: false
      }
    },
    forAllUniversites: { type: Boolean, default: false },
    forCampus: { type: Boolean, default: false },
    forUniversity: { type: Boolean, default: false },
    // Poll Feature
    isPoll: { type: Boolean, default: false },
    pollOptions: [
      {
        option: { type: String, required: true },
        votes: { type: Number, default: 0 },
      },
    ],
    pollExpiresAt: { type: Date },
    totalVotes: { type: Number, default: 0 },
    votedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }], // Users who voted

    // Voice Thread Feature
    isVoiceThread: { type: Boolean, default: false },
    voiceThreadUrl: { type: String, default: "" }, // Stores voice note URL
    transcodedVoiceUrls: [
      {
        bitrate: {
          type: String,
          enum: ["64kbps", "128kbps", "256kbps", "320kbps"],
        },
        url: { type: String, default: "" },
      },
    ],


    references: {
      isFromOtherUni: { type: Boolean, default: false },
      universityOrigin: {
        type: Schema.ObjectId,
        ref: "University",
        index: function () {
          return !(this.forCampus || this.forAllUniversites);
        },
      },
      campusOrigin: {
        type: Schema.Types.ObjectId,
        ref: "Campus",
        required: function () {
          return !(this.forUniversity || this.forAllUniversites);
        },
      },
      role: {
        type: String,
        enum: ['alumni', 'student', 'teacher', 'ext_org']
      }
    },

    // NSFW Detection Fields
    isNSFW: { 
      type: Boolean, 
      default: false,
      index: true  // Index for fast filtering
    },
    
    // Additional data fields for NSFW detection and content description
    data: {
      // Human-readable description for alt text and content info
      description: { 
        type: String,
        default: ""
      },
      
      // Reason for deletion if content is flagged
      deletionReason: { 
        type: String,
        enum: ["NSFW content detected", "reported", "admin action", "user deletion"],
        default: null
      },
      
      // Detailed NSFW classification results
      nsfwClassification: {
        is_nsfw: { type: Boolean, default: false },
        max_confidence: { type: Number, default: 0 },
        model: { type: String, default: "NudeNet" },
        threshold: { type: Number, default: 0.7 },
        processing_time: { type: Number, default: 0 },
        
        // Detailed detection results
        nsfw_detections: [{
          class: { type: String },
          confidence: { type: Number },
          bbox: [{ type: Number }]  // Bounding box coordinates
        }],
        
        // For videos: frame-by-frame analysis
        video_analysis: {
          total_frames: { type: Number },
          processed_frames: { type: Number },
          nsfw_frame_count: { type: Number },
          duration_seconds: { type: Number },
          nsfw_detections: [{
            frame_number: { type: Number },
            timestamp: { type: Number },
            is_nsfw: { type: Boolean },
            confidence: { type: Number }
          }]
        },
        
        // Error information if processing failed
        error: { type: String, default: null }
      },
      
      // When the content was processed
      processedAt: { 
        type: Date,
        default: null
      },
      
      // Processing status
      processingStatus: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending"
      }
    },
  },
  { timestamps: true },
  {
    validate: {
      validator: function () {
        if (this.isPersonalPost) return true; // Skip validation for personal posts
        return !(this.society && this.subSociety);
      },
      message: "You cannot set both Society and subSociety. Choose one.",
    },
  }
);

// Middleware to hide admin posts and NSFW content unless explicitly queried
postSchema.pre(/^find/, function (next) {

  const query = this.getQuery();

  if (query.__skipHiddenAdminFilter) {
    // Remove it so Mongo doesn't choke on unknown field
    delete query.__skipHiddenAdminFilter;
    return next();
  }

  if (this.getQuery().hasOwnProperty('postByAdmin')) {
    // Respect the developer's intent (don't override if postByAdmin was queried)
    return next();
  }

  // Add conditions to exclude:
  // 1. Admin posts (existing)
  // 2. NSFW content (new)
  // 3. Deleted posts (existing - NSFW content is marked as deleted)
  this.where({ 
    postByAdmin: false, 
    'adminSetStatus.isArchived': false,
    'status.isDeleted': false,  // This will exclude NSFW content since they're marked as deleted
    isNSFW: { $ne: true }       // Extra safety check
  });
  
  next();
});

// Add a method to get safe posts for public API
postSchema.statics.findSafe = function(conditions = {}) {
  return this.find({
    ...conditions,
    'status.isDeleted': false,
    'status.isActive': true,
    isNSFW: false,
    postByAdmin: false
  });
};

// Add a method for admin queries that can see NSFW content
postSchema.statics.findWithNSFW = function(conditions = {}) {
  return this.find({
    ...conditions,
    __skipHiddenAdminFilter: true
  });
};



const Post = model("Post", postSchema);
module.exports = Post;
