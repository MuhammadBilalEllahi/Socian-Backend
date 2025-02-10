const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const barCafeSchema = new Schema({
    name: { // ? Snack bar, Fast food bar, desi bar, fries bar
        type: String,
        required: true
    },
    attachedCafeEmployees: [{
        type: Schema.Types.ObjectId,
        ref: 'CafeUser',
    }],
    products: [{
        type: Schema.Types.ObjectId,
        ref: 'FoodItem'
    }],
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

const BarCafe = mongoose.model('BarCafe', barCafeSchema);

module.exports = BarCafe;