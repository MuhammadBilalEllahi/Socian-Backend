const mongoose = require("mongoose");
const DiscussionCommentVote = require("./vote.comment.discussion");
const discussionCommentSchema = new mongoose.Schema({
    content: { type: String, required: true },
    // upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    // downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    voteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DiscussionCommentVote",
    },
    type: { type: String, enum: ['discussionComment', 'answer'], default: 'discussionComment' },
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DiscussionComment' }],

    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

}, { timestamps: true });







// Update isVotedAnswer based on votes
discussionCommentSchema.methods.updateAnswerStatus = async function () {
    if (this.type === 'answer') {
        const voteDoc = await mongoose.model('DiscussionCommentVote').findById(this.voteId);
        const netVotes = voteDoc.upVotesCount - voteDoc.downVotesCount;

        if (netVotes >= 100) {
            this.isVotedAnswer = true;
            await this.save();
            return;
        }

        // Find all other answers for the same structured question
        const otherAnswers = await this.model('DiscussionComment').find({
            _id: { $ne: this._id },
            structuredQuestionId: this.structuredQuestionId,
            type: 'answer'
        });

        // Check if this answer has more votes than all others
        const hasHighestVotes = await otherAnswers.reduce(async (isHighest, answer) => {
            const otherVoteDoc = await mongoose.model('DiscussionCommentVote').findById(answer.voteId);
            const otherNetVotes = otherVoteDoc.upVotesCount - otherVoteDoc.downVotesCount;
            return (await isHighest) && netVotes > otherNetVotes;
        }, Promise.resolve(true));

        this.isVotedAnswer = hasHighestVotes;
        await this.save();

        // If this is an approved answer, link it to the structured question
        if (this.isVotedAnswer && this.structuredQuestionId) {
            const PastPaperItem = require('../pastpaper.item.model').PastPaperItem;
            const paper = await PastPaperItem.findById(this.paperId);
            if (paper) {
                await paper.linkAnswerToQuestion(this.structuredQuestionId, this._id);
            }
        }
    }
};

// After vote changes, update answer status
discussionCommentSchema.post("save", async function (doc) {

    // Check if a vote already exists
    const existingVote = await DiscussionCommentVote.findById(doc._id);
    if (!existingVote) {
        const discussionVote = await DiscussionCommentVote.create({
            _id: doc._id,
            commentId: doc._id,
        });
        doc.voteId = discussionVote._id;
        await doc.save();
    }

    // Update answer status after vote changes
    await doc.updateAnswerStatus();
});


const DiscussionComment = mongoose.model('DiscussionComment', discussionCommentSchema);
module.exports = { DiscussionComment };
