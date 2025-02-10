const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const cafeUserSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
    },
    phone: {
        // ?No need to verify the phone number. Cafe workers know phone number more than email.
        // ? In case if we buy sms to number packge. will add otp to logn but very expensive
        type: String,
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['c_admin', 'c_employee'],
        required: true
    },
    attachedCafe: {
        type: Schema.Types.ObjectId,
        ref: 'Cafe',
        required: true
    },

    attachedBarCafe: {
        type: Schema.Types.ObjectId,
        ref: 'BarCafe',
    },

    verfication: {
        email: {
            type: Boolean,
            default: false
        },
        phone: {
            type: Boolean,
            default: false
        }
    },
    status: {
        activated: {
            type: Boolean,
            deafult: false
        },
        activationKey: {
            type: String,
            default: '4hF-c#Cec$F}lp-'
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

const CafeUser = mongoose.model('CafeUser', cafeUserSchema);

module.exports = CafeUser;