const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const slugify = require('slugify');
const FoodCategory = require('./category.food.item.model');

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
    foodItemId: {
        type: Schema.Types.ObjectId,
        ref: 'FoodItem',
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



const foodItemsSchema = new Schema({
    name: { // ? Snack bar, Fast food bar, desi bar, fries bar
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        default: ''
    },

    imageUrl: {
        type: String,
        default: ''
    },


    slug: {
        type: String,
        default: ''
    },


    price: [{
        type: Number,
        default: 0
    }],

    takeAwayPrice: [{
        type: Number,
        default: 0
    }],
    takeAwayStatus: {
        type: Boolean,
        default: false
    },

    status: {
        type: String,
        enum: ['active', 'archived', 'deactive'],
        default: 'deactive'
    },
    lastChangesBy: {
        type: Array,
        of: [LastChangesSchema],
    },

    cafeId: {
        type: Schema.Types.ObjectId,
        ref: 'Cafe',
        required: true
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'FoodCategory', // Reference to category
        required: true
    },

    flavours: [
        { type: String }
    ],

    bestSelling: {
        type: Boolean,
        default: false
    },

    volume: {
        type: String,
        enum: ['liter', 'kilo', 'gram', 'half', 'full']
    },


    lastBestSellingDates: [{
        type: Date,
        default: Date.now
    }],


    favouritebByUsersCount: {
        type: Map,
        of: Number,
        default: {}
    },



    ratings: [{
        type: Schema.Types.ObjectId,
        ref: 'CafeItemRating'
    }],

    totalRatings: {
        type: Number,
        default: 0
    },

    // ratingsMap: {
    //     type: Map,
    //     of: Number,
    //     default: {}, // ? userId: Rating
    //     min: 0,
    //     max: 5
    // },



    discount: [{
        type: Number,
        default: 0
    }],
    discountPercentage: [{
        type: Number,
        default: 0
    }],

    discountDuration: {
        type: Date,
    },
    discountStatus: {
        type: String,
        enum: ['active', 'archived', 'none', 'deleted'],
        default: 'none'
    },
    deleted: {
        type: Boolean,
        default: false
    },
    // attachedCafe: {
    //     type: Schema.Types.ObjectId,
    //     ref: 'Cafe',
    // },



    foodItemAddedBy: {
        type: Schema.Types.ObjectId,
        refPath: 'reportedByModel'
    },

    foodItemAddedByModel: {
        type: String,
        enum: ['User', 'CafeUser']
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

foodItemsSchema.pre('save', function (next) {
    if (!this.slug) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
    next();
});


foodItemsSchema.pre('save', async function (next) {
    const categoryExists = await FoodCategory.exists({ _id: this.category });
    if (!categoryExists) {
        return next(new Error('Invalid category ID'));
    }
    next();
});


const FoodItem = mongoose.model('FoodItem', foodItemsSchema);

module.exports = FoodItem;