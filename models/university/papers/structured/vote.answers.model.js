// StructuredVote


import mongoose from "mongoose";
const Schema = mongoose.Schema;


const structuredQuestionVoteSchema = new Schema({

    answerId: { type: Schema.Types.ObjectId, ref: "StructuredAnswer" }, // Use this if voting on an answer
    commentId: { type: Schema.Types.ObjectId, ref: "StructuredComment" }, // Use this if voting on a comment

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
export default StructuredVote;