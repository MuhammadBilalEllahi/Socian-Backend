const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const departmentSchema = new Schema({
    name: {
        type: String,
        required: true,
        index: true,
    },
    shortInitials: {
        type: String,
        // required: true,
        index: true
    }, 
    subjects: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Subject',
            index: true,
        }
    ],
    teachers: [{
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
    }],

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
    },
    users: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true })


const Department = mongoose.model("Department", departmentSchema);

module.exports = Department;
