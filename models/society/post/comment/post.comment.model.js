const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const postCommentSchema = new Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  // upvotes: { type: Number, default: 0 },
  // downvotes: { type: Number, default: 0 },
  voteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SocietyPostAndCommentVote",
  },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "PostComment" }, // For nested comments
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: "PostComment" }],
  editedAt: { type: Date },
  isEdited: { type: Boolean, default: false },

  favorited: { type: Boolean, default: false },

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
  isDeleted: { type: Boolean, default: false },
  isReported: {
    status: { type: Boolean, default: false },
    reportId: { type: Schema.Types.ObjectId, ref: "Report", default: null },
    reason: { type: String, default: null }
  },
  isEdited: { type: Boolean, default: false },

});

const PostComment = mongoose.model("PostComment", postCommentSchema);
module.exports = PostComment;
