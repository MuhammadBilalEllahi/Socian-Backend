// StructuredComment

const mongoose = require("mongoose");
const StructuredVote = require("./vote.answers.model");

const structuredCommenSchema = new mongoose.Schema({
    content: { type: String, required: true },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    voteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StructuredVote",
    },
    isDeleted: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    isReported: { type: Boolean, default: false },
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StructuredComment' }],
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
    replyToUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // User being replied to
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

}, { timestamps: true });

structuredCommenSchema.pre('save', async function (next) {
    if (!this.voteId) {
        try {
            const vote = await StructuredVote.create({
                commentId: this._id, // Link the vote to the comment
            });
            this.voteId = vote._id;
            next();
        } catch (error) {
            next(error);
        }
    } else {
        next();
    }
});

const StructuredComment = mongoose.model('StructuredComment', structuredCommenSchema);
module.exports = { StructuredComment };
