const mongoose = require('mongoose');
const { Schema } = mongoose;



// Structured Question Answer Schema
const structuredAnswerSchema = new Schema({
    questionId: { type: Schema.Types.ObjectId, ref: 'StructuredQuestion', required: true },
    paperId: { type: Schema.Types.ObjectId, ref: 'PastPaperItem' },
    
    content: { type: String, required: true },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    voteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StructuredVote",
    },
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StructuredComment' }],

    reportedAsNotAnAnswerBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isApproved: { type: Boolean, default: false },
    isCorrect: { type: Boolean, default: false },

    answeredByUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    answeredAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

const StructuredAnswer = mongoose.model('StructuredAnswer', structuredAnswerSchema);

module.exports = StructuredAnswer;
