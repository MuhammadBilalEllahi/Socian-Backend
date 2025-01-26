const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const societyPostAndCommentVoteSchema = new Schema({
  // userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, i dont think this was useful but if u remeber logic then use this later

  postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" }, // or use commentId if voting on a comment,

  commentId: { type: mongoose.Schema.Types.ObjectId, ref: "PostComment" }, // Use this if voting on a comment

  upVotesCount: { type: Number, default: 0 },
  downVotesCount: { type: Number, default: 0 },

  // Object to store individual user votes
  userVotes: {
    type: Map,
    of: String, // 'upvote' or 'downvote'
    default: {},
  },

  // upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  // downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  createdAt: { type: Date, default: Date.now },
});

societyPostAndCommentVoteSchema.index({ postId: 1 }); // Index for faster queries by postId
societyPostAndCommentVoteSchema.index({ commentId: 1 }); // Index for faster queries by commentId


const SocietyPostAndCommentVote = mongoose.model(
  "SocietyPostAndCommentVote",
  societyPostAndCommentVoteSchema
);
module.exports = SocietyPostAndCommentVote;
