const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const foodCategorySchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
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

    categoryAddedBy: {
        type: Schema.Types.ObjectId,
        refPath: 'reportedByModel'
    },

    categoryAddedByModel: {
        type: String,
        enum: ['User', 'CafeUser']
    },

    deleted: {
        type: Boolean,
        default: false
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


foodCategorySchema.pre('save', function (next) {
    if (!this.slug) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
    next();
});


const FoodCategory = mongoose.model('FoodCategory', foodCategorySchema);
module.exports = FoodCategory;
