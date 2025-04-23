const mongoose = require('mongoose');
const { Schema } = mongoose;
const StructuredQuestionAnswer = require('./answers.structured.model');


// Structured Question Schema
const structuredQuestionSchema = new Schema({
    // structred collection id is asame as the ?!!! pastpaper item id ??!!!
    structuredQuestionCollectionId: { type: Schema.Types.ObjectId, ref: 'StructuredQuestionCollection' },


    questionContent: { type: String },

    // For backward compatibility and easier querying
    questionNumberOrAlphabet: { type: String, required: true,default: '1' }, // e.g., "1", "2", "3", "A", "B", "C"
    level: { type: Number, required: true, default: 0 },
    fullPath: { type: String }, // The full hierarchical path (e.g., "1.a.i")


    // Reference to answers instead of embedding them
    answers: [{ type: Schema.Types.ObjectId, ref: 'StructuredAnswer' }],

    parent: { type: Schema.Types.ObjectId, ref: 'StructuredQuestion' },

    subQuestions: [{ type: Schema.Types.ObjectId, ref: 'StructuredQuestion' }],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: true },


    metadata: {
        totalAnswers: { type: Number, default: 0 },
        approvedAnswers: { type: Number, default: 0 },
        lastAnswered: { type: Date }
    }

}, { timestamps: true });



// Pre-save middleware to ensure fullPath is set
structuredQuestionSchema.pre('save', async function (next) {
    next();
});

const StructuredQuestion = mongoose.model('StructuredQuestion', structuredQuestionSchema);

module.exports = StructuredQuestion;
