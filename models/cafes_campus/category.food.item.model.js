const mongoose = require('mongoose');
const Schema = mongoose.Schema;


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
    foodCategoryId: {
        type: Schema.Types.ObjectId,
        ref: 'FoodCategory',
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

    status: {
        type: String,
        enum: ['active', 'archived', 'deactive'],
        default: 'deactive'
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

    lastChangesBy: {
        type: Array,
        of: [LastChangesSchema],
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
