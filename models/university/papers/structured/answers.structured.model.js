const mongoose = require('mongoose');
const { DiscussionComment } = require('../discussion/discussion.comment');
const { Schema } = mongoose;



// Structured Question Answer Schema
const structuredQuestionAnswerSchema = new Schema({
    questionId: { type: Schema.Types.ObjectId, ref: 'StructuredQuestion', required: true },
    answerId: { type: Schema.Types.ObjectId, ref: 'DiscussionComment', required: true },
    isApproved: { type: Boolean, default: false },
    isCorrect: { type: Boolean, default: false },
    upVotes: { type: Number, default: 0 },
    downVotes: { type: Number, default: 0 },
    answeredByUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    answeredAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

const StructuredQuestionAnswer = mongoose.model('StructuredQuestionAnswer', structuredQuestionAnswerSchema);

module.exports = StructuredQuestionAnswer;
