const { default: mongoose } = require("mongoose");



const discussionCommentVoteSchema = new mongoose.Schema({

    commentId: { type: mongoose.Schema.Types.ObjectId, ref: "DiscussionComment" }, // Use this if voting on a comment

    upVotesCount: { type: Number, default: 0 },
    downVotesCount: { type: Number, default: 0 },

    // Object to store individual user votes
    userVotes: {
        type: Map,
        of: String, // 'upvote' or 'downvote'
        default: {},
    },
    createdAt: { type: Date, default: Date.now },


}, { timestamps: true });

const DiscussionCommentVote = mongoose.model('DiscussionCommentVote', discussionCommentVoteSchema);
module.exports = DiscussionCommentVote;