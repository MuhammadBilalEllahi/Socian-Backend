const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const teacherRatingSchema = new Schema({
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hideUser: { type: Boolean, default: false },

    upvoteCount: { type: Number, default: 0 },
    downvoteCount: { type: Number, default: 0 },

    rating: { type: Number, required: true },
    comment: { type: String },
    isDeleted: { type: Boolean, default: false },
    isReported: { type: Boolean, default: false },
    __v: { type: Number, default: 0 }
}, { timestamps: true });

const TeacherRating = mongoose.model('TeacherRating', teacherRatingSchema);

module.exports = TeacherRating;



