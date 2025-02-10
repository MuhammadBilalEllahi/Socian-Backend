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
    bars: [{
        type: Schema.Types.ObjectId,
        ref: 'BarCafe',
    }],

    status: {
        is: {
            type: String,
            deafult: ['active', 'archived', 'deleted']
        }
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

    coordinted: {
        latitude: {
            type: String,
            default: ''
        },
        longitude: {
            type: String,
            default: ''
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