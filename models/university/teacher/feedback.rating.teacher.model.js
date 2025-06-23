const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const feedbackCommentSchema = new Schema({
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher' },
    parentFeedbackCommentId: { type: Schema.Types.ObjectId, ref: 'FeedBackCommentTeacher' }, // will be used when commenting on TeacherRating
    parentTeacherRatingCommentId: { type: Schema.Types.ObjectId, ref: 'TeacherRating' },// will be used when replying FeedBackCommentTeacher
    // however the above are not needed but better to distinguish the data
    favouritedByTeacher: { type: Boolean, default: false },

    hiddenByMod: {type: Boolean, default: false},
    hiddenBySuper:{
    type: Boolean,
    default: false
  },
    reason: {type: String},

    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    comment: { type: String, required: true },
    gifUrl: { type: String, default: '' },
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    replyTo: { type: Schema.Types.ObjectId, ref: 'User' },
    replies: [{ type: Schema.Types.ObjectId, ref: 'FeedBackCommentTeacher' }],
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
});

const FeedBackCommentTeacher = mongoose.model('FeedBackCommentTeacher', feedbackCommentSchema);

module.exports = FeedBackCommentTeacher;