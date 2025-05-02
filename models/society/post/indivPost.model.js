const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const indivPostSchema = new Schema(
  {
    title: { type: String, required: true },
    body: { type: String },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    society: {
      type: Schema.Types.ObjectId,
      ref: "Society",
      required: false,
      index: true,
    },
    subSociety: {
      type: Schema.Types.ObjectId,
      ref: "SubSociety",
      required: false,
      index: true,
    },
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
          ],
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
      },
    ],
    flair: { type: String, default: "" },
    comments: { type: Schema.Types.ObjectId, ref: "PostCommentCollection" },
    status: {
      isActive: { type: Boolean, default: true },
      isDeleted: { type: Boolean, default: false },
      isArchived: { type: Boolean, default: false },
    },
    editedAt: { type: Date },
    isPromoted: {
      promoted: { type: Boolean, default: false },
      byUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
    shareableLevel: {
      type: String,
      enum: ["campus", "inter", "all"],
    },
    isRepost: {
      type: Boolean,
      default: false,
    },
    repostedPost: {
      type: Schema.Types.ObjectId,
      ref: "IndivPost",
    },
    isPersonalPost: {
      type: Boolean,
      default: true,
    },
    isPoll: { type: Boolean, default: false },
    pollOptions: [
      {
        option: { type: String, required: true },
        votes: { type: Number, default: 0 },
      },
    ],
    pollExpiresAt: { type: Date },
    totalVotes: { type: Number, default: 0 },
    votedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isVoiceThread: { type: Boolean, default: false },
    voiceThreadUrl: { type: String, default: "" },
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
        index: true,
      },
      campusOrigin: {
        type: Schema.Types.ObjectId,
        ref: "Campus",
        required: true,
      },
      role: {
        type: String,
        enum: ["alumni", "student", "teacher", "ext_org"],
      },
    },
  },
  { timestamps: true }
);

const IndivPost = model("IndivPost", indivPostSchema);
module.exports = IndivPost;