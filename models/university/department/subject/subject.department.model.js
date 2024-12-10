const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const subjectSchema = new Schema({
    name: {
        type: String,
        required: true,
        index: true,
    },
    pastpapersCollectionByYear: {
        type: Schema.Types.ObjectId,
        ref: 'PastpapersCollectionByYear',
        // required: true
    },
    references: {
        departmentId: {
            type: Schema.Types.ObjectId,
            ref: 'Department',
            index: true,
        },
        universityOrigin: {
            type: Schema.Types.ObjectId,
            ref: 'University',
            index: true,
        },
        campusOrigin: {
            type: Schema.Types.ObjectId,
            ref: 'Campus',
            index: true,
        },
    }


}, { timestamps: true })


const Subject = mongoose.model("Subject", subjectSchema);

module.exports = Subject;
