const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const postCommentSchema = new Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  body: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  // upvotes: { type: Number, default: 0 },
  // downvotes: { type: Number, default: 0 },
  vote: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SocietyPostAndCommentVote",
  },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "PostComment" }, // For nested comments
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: "PostComment" }],
  editedAt: { type: Date },
});

const PostComment = mongoose.model("PostComment", postCommentSchema);
module.exports = PostComment;
