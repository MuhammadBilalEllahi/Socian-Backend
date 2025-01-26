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
        return !this.subSociety;
      },
      index: true,
    },
    subSociety: {
      type: Schema.Types.ObjectId,
      ref: "SubSociety",
      required: function () {
        return !this.society;
      },
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
          ], //add youtube url later
          default: "text",
        },
        url: { type: String, default: "" },
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
        enum: ['alumni', 'student', 'teacher', 'ext_org']
      }
    },
  },
  { timestamps: true },
  {
    validate: {
      validator: function () {
        return !(this.society && this.subSociety);
      },
      message: "You cannot set both Society and subSociety. Choose one.",
    },
  }
);

const Post = model("Post", postSchema);
module.exports = Post;
