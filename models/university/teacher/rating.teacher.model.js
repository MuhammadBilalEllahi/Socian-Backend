const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const teacherRatingSchema = new Schema({

    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    hideUser: { type: Boolean, default: false },
    favouritedByTeacher: { type: Boolean, default: false },

    upVotesCount: { type: Number, default: 0 },
    downVotesCount: { type: Number, default: 0 },


    userVotes: {
        type: Map,
        of: {
            type: String,
            enum: ['upVote', 'downVote']
        },
        default: {}
    },

    isFeedbackEdited: {
        timestamp: { type: Date, default: Date.now() },
        bool: { type: Boolean, default: false }
    },

    // comment: { type: String },
    feedback: { type: String },
    rating: { type: Number, required: true, min: 0, max: 5 },


    replies: [{ type: Schema.Types.ObjectId, ref: 'FeedBackCommentTeacher' }],


    isDeleted: { type: Boolean, default: false },
    isReported: { type: Boolean, default: false },
    __v: { type: Number, default: 0 }
}, { timestamps: true });

teacherRatingSchema.index({ _id: 1, teacherId: 1, userId: 1 }, { unique: true });


const TeacherRating = mongoose.model('TeacherRating', teacherRatingSchema);

module.exports = TeacherRating;



