const mongoose = require('mongoose');
const { Schema } = mongoose;

const academicFormatSchema = new Schema({

    formatType: {
        type: String,
        enum: ['MIDTERM', '2_SESSIONAL'
            // {
            //     'MIDTERM': "Quiz, assignments, mid term, final term",
            // },
            // {
            //     '2_SESSIONAL': "Quiz, assignments, sessional 1, sessional 2, final term"
            // }
            // "Other"
        ],
        required: true
    },
    references: [{
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
    }]

    // otherFormat: { 
    //     type: String,
    //     default: ''
    // },

    // yearFormats: [{ 
    //     year: { type: Number, required: true },
    //     terms: {
    //         fall: {
    //             quiz: { type: Number, default: 0 }, 
    //             assignments: { type: Number, default: 0 }, 
    //             midTerm: { type: Number, default: 0 }, 
    //             finalTerm: { type: Number, default: 0 }, 
    //             other: { type: Number, default: 0 } 
    //         },
    //         spring: {
    //             quiz: { type: Number, default: 0 }, 
    //             assignments: { type: Number, default: 0 }, 
    //             sessional1: { type: Number, default: 0 }, 
    //             sessional2: { type: Number, default: 0 }, 
    //             finalTerm: { type: Number, default: 0 } 
    //         }
    //     }
    // }]



});


const AcademicFormat = mongoose.model('AcademicFormat', academicFormatSchema);

module.exports = AcademicFormat;
