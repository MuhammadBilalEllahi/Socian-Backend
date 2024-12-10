const mongoose = require("mongoose");
const Campus = require("../campus.university.model");
const { Schema } = mongoose;




// PAST PAPER SINGLE COLLECTION

const pastpapersCollectionByYear = new Schema({
    pastpapers: [{
        type: Schema.Types.ObjectId,
        ref: 'PastPaper',
        required: true,
        index: true,
    }],
    type: {
        type: String,
        enum: ['MIDTERM', 'SESSIONAL'],
        default: 'MIDTERM',
        required: true,
        index: true,
    },
    references: {
        universityOrigin: {
            type: Schema.Types.ObjectId,
            ref: 'University',
            required: true,
            index: true,
        },
        campusOrigin: {
            type: Schema.Types.ObjectId,
            ref: 'Campus',
            required: true,
            index: true,
        },
        subjectId: {
            type: Schema.Types.ObjectId,
            ref: "Subject",
        },
    },
})
const PastpapersCollectionByYear = mongoose.model("PastpapersCollectionByYear", pastpapersCollectionByYear);

// File Schema
const fileSchema = new Schema({
    pdf: String,
    // required: true
}, { timestamps: true });

// Assignment and Quiz Schema
const assignmentQuizExamSchema = new Schema({
    name: { type: String, default: '' },
    teachers: [{
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
        index: true,
    }],
    file: fileSchema,
}, { timestamps: true });

// Unified PastPaper Schema for both MIDTERM and SESSIONAL
const pastpaperSchema = new Schema({
    type: {
        type: String,
        enum: ['MIDTERM', 'SESSIONAL'],
        default: 'MIDTERM',
        required: true,
        index: true,
    },
    year: { type: Number, required: true },
    assignments: [assignmentQuizExamSchema],
    quizzes: [assignmentQuizExamSchema],
    fall: {
        sessional: {
            type: [{
                lab: [assignmentQuizExamSchema],
                theory: [assignmentQuizExamSchema],
            }],
            arrayLength: { type: Number, default: 2 },
        },
        final: {
            lab: [assignmentQuizExamSchema],
            theory: [assignmentQuizExamSchema],
        },
        mid: {
            lab: [assignmentQuizExamSchema],
            theory: [assignmentQuizExamSchema],
        }
    },
    spring: {
        sessional: {
            type: [{
                lab: [assignmentQuizExamSchema],
                theory: [assignmentQuizExamSchema],
            }],
            arrayLength: { type: Number, default: 2 },
        },
        final: {
            lab: [assignmentQuizExamSchema],
            theory: [assignmentQuizExamSchema],
        },
        mid: {
            lab: [assignmentQuizExamSchema],
            theory: [assignmentQuizExamSchema],
        }
    },
    references: {
        universityOrigin: {
            type: Schema.Types.ObjectId,
            ref: 'University',
            required: true,
            index: true,
        },
        campusOrigin: {
            type: Schema.Types.ObjectId,
            ref: 'Campus',
            required: true,
            index: true,
        },
        subjectId: {
            type: Schema.Types.ObjectId,
            ref: "Subject",
        },
    },
}, { timestamps: true });


pastpaperSchema.pre('save', async function (next) {
    try {
        const campus = await Campus.findById(this.references.campusOrigin).populate('academic.FormatId');

        // Check if the formatType of the FormatId matches the selected type in PastPaper
        if (campus.academic.FormatId.formatType === 'MIDTERM' && this.type !== 'MIDTERM') {
            return next(new Error("Only 'MIDTERM' past papers are allowed for this campus."));
        } else if (campus.academic.FormatId.formatType === '2_SESSIONAL' && this.type !== 'SESSIONAL') {
            return next(new Error("Only 'SESSIONAL' past papers are allowed for this campus."));
        }

        next();
    } catch (error) {
        next(error);
    }
});


const PastPaper = mongoose.model("PastPaper", pastpaperSchema);
module.exports = { PastPaper, PastpapersCollectionByYear };



