// StructuredVote


const { default: mongoose } = require("mongoose");



const structuredQuestionVoteSchema = new mongoose.Schema({

    answerId: { type: mongoose.Schema.Types.ObjectId, ref: "StructuredAnswer" }, // Use this if voting on an answer
    commentId: { type: mongoose.Schema.Types.ObjectId, ref: "StructuredComment" }, // Use this if voting on a comment

    upVotesCount: { type: Number, default: 0 },
    downVotesCount: { type: Number, default: 0 },

    // Object to store individual user votes
    userVotes: {
        type: Map,
        of: String, // 'upvote' or 'downvote'
        default: {},
    },
    createdAt: { type: Date, default: Date.now },


}, { timestamps: true, });

const StructuredVote = mongoose.model('StructuredVote', structuredQuestionVoteSchema);
module.exports = StructuredVote;