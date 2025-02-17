const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const cafeSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    attachedCafeAdmin: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [{
        type: Schema.Types.ObjectId,
        ref: 'FoodItem'
    }],

    categories: [{
        type: Schema.Types.ObjectId,
        ref: 'FoodCategory',
    }],
    status: {
        type: String,
        enum: ['active', 'archived', 'deleted'],
        default: 'active'
    },

    contact: {
        type: String,
        default: ''
    },
    accumulatedRating: {
        type: Number,
        default: 0
    },
    information: {
        type: String,
        default: ''
    },

    coordinates: {
        latitude: {
            type: Number,
            default: 0
        },
        longitude: {
            type: Number,
            default: 0
        },
        locationInText: {
            type: String,
            default: ''
        }
    },


    createdBy: {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
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

const Cafe = mongoose.model('Cafe', cafeSchema);

module.exports = Cafe;