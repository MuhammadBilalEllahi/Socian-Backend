const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userVoteSchema = new Schema({
    reviewId: { type: Schema.Types.ObjectId, ref: 'TeacherRating', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voteType: { type: String, enum: ['upvote', 'downvote'], required: true }
}, { timestamps: true });

const UserVote = mongoose.model('UserReviewTeacherVote', userVoteSchema);

module.exports = UserVote;