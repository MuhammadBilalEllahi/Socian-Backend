// StructuredComment

const mongoose = require("mongoose");

const structuredCommenSchema = new mongoose.Schema({
    content: { type: String, required: true },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    voteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StructuredVote",
    },
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StructuredComment' }],

    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

}, { timestamps: true });


const StructuredComment = mongoose.model('StructuredComment', structuredCommenSchema);
module.exports = { StructuredComment };
