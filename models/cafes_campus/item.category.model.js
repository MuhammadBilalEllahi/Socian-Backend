const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const foodCategorySchema = new Schema({
    name: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        default: ''
    },
    imageUrl: {
        type: String,
        default: ''
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

const FoodCategory = mongoose.model('FoodCategory', foodCategorySchema);
module.exports = FoodCategory;
