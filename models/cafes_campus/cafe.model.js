const mongoose = require('mongoose');

const Schema = mongoose.Schema;



// Subschema for tracking last changes
const LastChangesSchema = new Schema({
    whatUpdated: {
        type: String,
        default: ''
    },
    cafeId: {
        type: Schema.Types.ObjectId,
        ref: 'Cafe',
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    userType: {
        type: String,
        enum: ['User', 'CafeUser'],
        required: true
    },
    changedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

// Coordinates schema with the same _id as the Cafe
const CoordinatesSchema = new Schema({
    _id: {
        type: Schema.Types.ObjectId,
        required: true
    },
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
}, { _id: false });




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
    foodItems: [{
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

    contact: [{
        type: String,
        default: ''
    }],
    accumulatedRating: {
        type: Number,
        default: 0
    },
    information: {
        type: String,
        default: ''
    },

    // coordinates: {
    //     latitude: {
    //         type: Number,
    //         default: 0
    //     },
    //     longitude: {
    //         type: Number,
    //         default: 0
    //     },
    //     locationInText: {
    //         type: String,
    //         default: ''
    //     }
    // },

    coordinates: {
        type: CoordinatesSchema,
        default: function () {
            return { _id: this._id }; // Ensures coordinates _id matches cafe _id
        }
    },


    createdBy: {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },

    lastChangesBy: {
        type: Array,
        of: [LastChangesSchema],
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
















