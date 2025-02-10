const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const cafeItemRatingSchema = new Schema({

    favourited: {
        is: {
            type: Boolean,
            default: false
        },
        by: {
            type: Schema.Types.ObjectId,
            ref: 'CafeUser'
        }
    },
    ratingMessage: {
        type: String,
        required: true
    },
    cafeVoteId: {
        type: Schema.Types.ObjectId,
        ref: 'CafeVote'
    },






    attachedCafe: {
        type: Schema.Types.ObjectId,
        ref: 'Cafe',
    },
    attachedCafeBar: {
        type: Schema.Types.ObjectId,
        ref: 'BarCafe',
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

const CafeItemRating = mongoose.model('CafeItemRating', cafeItemRatingSchema);

module.exports = CafeItemRating;