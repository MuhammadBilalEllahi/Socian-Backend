const mongoose = require('mongoose');
const StructuredVote = require('./vote.answers.model');
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

    isEdited: { type: Boolean, default: false },
    answeredByUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    answeredAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

structuredAnswerSchema.pre('save', async function (next) {
    if (!this.voteId) {
        try {
            const vote = await StructuredVote.create({
                answerId: this._id, // Link the vote to the answer
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

const StructuredAnswer = mongoose.model('StructuredAnswer', structuredAnswerSchema);

module.exports = StructuredAnswer;
