const mongoose = require('mongoose');
const { Schema } = mongoose;
const StructuredQuestionAnswer = require('./answers.structured.model');


// Structured Question Schema
const structuredQuestionSchema = new Schema({
    // structred collection id is asame as the ?!!! pastpaper item id ??!!!
    structuredQuestionCollectionId: { type: Schema.Types.ObjectId, ref: 'StructuredQuestionCollection' },

    // For backward compatibility and easier querying
    questionNumber: { type: String, required: true }, // The full hierarchical path (e.g., "1.a.i")

    // Using a more flexible approach with an array to handle question hierarchy
    // This allows for unlimited nesting levels without predefined fields
    questionHierarchy: [{
        level: { type: Number, required: true }, // Position in the hierarchy (0 for main question, 1 for sub, etc.)
        value: { type: String, required: true }  // The actual number or letter at this level
    }],

    fullPath: { type: String }, // The full hierarchical path (e.g., "1.a.i")

    questionContent: { type: String },

    // Reference to answers instead of embedding them
    answers: [{ type: Schema.Types.ObjectId, ref: 'StructuredQuestionAnswer' }],

    parent: { type: Schema.Types.ObjectId, ref: 'StructuredQuestion' },

    subQuestions: [{ type: Schema.Types.ObjectId, ref: 'StructuredQuestion' }],

    // has depth 3 but is at index 2
    depth: { type: Number, required: true }, // 0 for main questions, increases for sub-levels
    orderIndex: { type: Number, required: true }, // To maintain order within same level

    metadata: {
        totalAnswers: { type: Number, default: 0 },
        approvedAnswers: { type: Number, default: 0 },
        lastAnswered: { type: Date }
    }

}, { timestamps: true });


structuredQuestionSchema.methods.createQuestionIfFirstTimeElseAddAnswerInThatQuestion = async function (questionNumber, fullPath, pastPaperItemId, questionContent, parent, depth, orderIndex) {

    // check if the question already exists
    const question = await this.constructor.findOne({ questionNumber, fullPath, structuredQuestionCollectionId: pastPaperItemId });
    if (question) {
        // add the answer to the question
        const answer = await question.addAnswer(question._id);
        return answer;
    }

    // create a new question
    const newQuestion = new this.constructor({
        questionNumber,
        questionHierarchy: questionHierarchy,
        structuredQuestionCollectionId: pastPaperItemId,
        questionContent,
        depth: 0,
        orderIndex: 0,

    });
    this.fullPath = this.questionHierarchy.map(q => q.value).join('.');
    await newQuestion.save();

    // add the answer to the question
    const answer = await newQuestion.addAnswer(newQuestion._id);
    return answer;

}


// Method to generate full path
structuredQuestionSchema.methods.generateFullPath = async function () {
    let path = this.level;
    let currentQuestion = this;

    while (currentQuestion.parent) {
        currentQuestion = await this.constructor.findById(currentQuestion.parent);
        path = currentQuestion.level + '.' + path;
    }

    this.fullPath = path;
    return path;
};

// Method to add an answer
structuredQuestionSchema.methods.addAnswer = async function (answerId) {
    const answer = new StructuredQuestionAnswer({
        questionId: this._id,
        answerId: answerId
    });
    await answer.save();

    this.answers.push(answer._id);
    this.metadata.totalAnswers++;
    this.metadata.lastAnswered = new Date();
    await this.save();

    return answer;
};

// Method to approve an answer
structuredQuestionSchema.methods.approveAnswer = async function (answerId) {
    const answer = await StructuredQuestionAnswer.findOne({
        questionId: this._id,
        answerId: answerId
    });

    if (answer) {
        answer.isApproved = true;
        await answer.save();

        this.metadata.approvedAnswers++;
        await this.save();

        return answer;
    }

    return null;
};

// Method to get all answers for a question
structuredQuestionSchema.methods.getAllAnswers = async function (includeSubQuestions = false) {
    await this.populate('answers');

    if (includeSubQuestions && this.subQuestions.length > 0) {
        const subAnswers = await Promise.all(
            this.subQuestions.map(async (subQId) => {
                const subQ = await this.constructor.findById(subQId);
                return subQ.getAllAnswers(true);
            })
        );
        return {
            questionPath: this.fullPath,
            answers: this.answers,
            subQuestions: subAnswers
        };
    }

    return {
        questionPath: this.fullPath,
        answers: this.answers
    };
};

// Pre-save middleware to ensure fullPath is set
structuredQuestionSchema.pre('save', async function (next) {
    if (!this.fullPath) {
        await this.generateFullPath();
    }
    next();
});

const StructuredQuestion = mongoose.model('StructuredQuestion', structuredQuestionSchema);

module.exports = StructuredQuestion;
