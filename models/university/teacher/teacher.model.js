const mongoose = require('mongoose');
const Schema = mongoose.Schema;



const teacherSchema = new Schema({
    teacher: {
        id: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        verified: {
            type: Boolean,
            default: false
        },
        matchDomain: {
            type: String,
            default: '' //e.g drhabib@cuilahore.edu.pk
        }
    },
    email: {
        type: String,
        default: ''
    },
    name: {
        type: String,
        required: true
    },
    designation: {
        type: String,
        // required: true
    },
    department: {
        name: { type: String },
        // required: true
        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
        }
    },
    areaOfInterest: {
        type: String,
        // required: true
    },
    supervisorStatus: {
        type: String,
        // required: true
    },
    imageUrl: {
        type: String,
        // required: true,
        default: ''
    },

    onLeave: {
        type: Boolean,
        // required: true
        default: false
    },
    hasLeft: {
        type: Boolean,
        // required: true,
        default: false
    },
    rating: {
        type: Number,
        default: 0
    },
    campusOrigin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campus',
    },
    universityOrigin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'University',
    },
    subjectsTaught: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
    }
    ],
    ratingsByStudents: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TeacherRating',
        },
    ]
});


const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;