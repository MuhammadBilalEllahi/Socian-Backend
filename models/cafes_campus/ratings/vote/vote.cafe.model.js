import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const cafeVoteSchema = new Schema({

    _id: {
        type: Schema.Types.ObjectId,
        ref: 'CafeItemRating'
    },

    vote: {
        type: Map,
        of: String,
        enum: ['haha', 'love', 'yuck', 'thumbsUp', 'thumbsDown'],
        default: () => ({})
    },

    reactions: {
        type: Map,
        of: Number,
        default: () => ({})  // Example: { "haha": 3, "love": 5, "yuck": 1 }
    },


    votePlusCount: {
        type: Number,
        default: 0
    },
    voteMinusCount: {
        type: Number,
        default: 0
    },


    attachedCafe: {
        type: Schema.Types.ObjectId,
        ref: 'Cafe',
    },

    references: {
        universityId: {
            type: Schema.Types.ObjectId,
            ref: 'University',
            required: true
        },
        campusId: {
            type: Schema.Types.ObjectId,
            ref: 'Campus',
            required: true
        }
    },


    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }

}, { timestamps: true });

const CafeVote = mongoose.model('CafeVote', cafeVoteSchema);

export default CafeVote;