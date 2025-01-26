const mongoose = require("mongoose");

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


    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DiscussionComment' }],
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });







discussionCommentSchema.post("save", async function (doc) {
    const DiscussionCommentVote = require("./vote.comment.discussion");

    // Check if a vote already exists (to avoid duplicates)
    const existingVote = await DiscussionCommentVote.findById(doc._id);
    if (!existingVote) {
        // Create a new DiscussionCommentVote with the same _id as the comment
        const discussionVote = await DiscussionCommentVote.create({
            _id: doc._id, // Ensuring the same _id
            commentId: doc._id,
        });
        doc.voteId = discussionVote._id;
        await doc.save();
    }
});


const DiscussionComment = mongoose.model('DiscussionComment', discussionCommentSchema);
module.exports = DiscussionComment;

