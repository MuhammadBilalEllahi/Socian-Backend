const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const foodItemsSchema = new Schema({
    name: { // ? Snack bar, Fast food bar, desi bar, fries bar
        type: String,
        required: true
    },
    slug: {
        type: String,
        default: ''
    },

    price: {
        type: Number,
        default: 0
    },

    category: {
        type: Schema.Types.ObjectId,
        ref: 'FoodCategory', // Reference to category
        required: true
    },

    ratings: [{
        type: Schema.Types.ObjectId,
        ref: 'CafeItemRating'
    }],

    ratingsMap: {
        type: Map,
        of: Number,
        default: {}, // ? userId: Rating
        min: 0,
        max: 5
    },



    discount: {
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

const FoodItem = mongoose.model('FoodItem', foodItemsSchema);

module.exports = FoodItem;