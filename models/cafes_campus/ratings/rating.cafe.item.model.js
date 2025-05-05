const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const cafeItemRatingSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    foodItemId:{
        type: Schema.Types.ObjectId,
        ref: 'FoodItem'
    },
    favourited: {
        type: Boolean,
        default: false
    },
    favouritedBy: {
        type: Schema.Types.ObjectId,
        ref: 'CafeUser'
    },

    ratingMessage: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
    },
    cafeVoteId: {
        type: Schema.Types.ObjectId,
        ref: 'CafeVote'
    },

    isEdited: {
        type: Boolean,
        default: false
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


    reported: {
        type: Boolean,
        default: false
    },

    reportedBy: {
        type: Schema.Types.ObjectId,
        refPath: 'reportedByModel'
    },
    reportedByModel: {
        type: String,
        enum: ['User', 'CafeUser']
    },




    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }

}, { timestamps: true});

const CafeItemRating = mongoose.model('CafeItemRating', cafeItemRatingSchema);

module.exports = CafeItemRating;