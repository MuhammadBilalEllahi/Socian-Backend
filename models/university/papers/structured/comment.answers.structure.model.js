// StructuredComment

import mongoose from "mongoose";
const Schema = mongoose.Schema;
import StructuredVote from "./vote.answers.model.js";

const structuredCommenSchema = new Schema({
    content: { type: String, required: true },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    voteId: {
        type: Schema.Types.ObjectId,
        ref: "StructuredVote",
    },
    isDeleted: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    isReported: { type: Boolean, default: false },
    replies: [{ type: Schema.Types.ObjectId, ref: 'StructuredComment' }],
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }], 
    replyToUser: { type: Schema.Types.ObjectId, ref: 'User' }, // User being replied to
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },

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
export { StructuredComment };
