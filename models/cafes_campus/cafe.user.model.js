const mongoose = require('mongoose');

const bcrypt = require('bcryptjs')
const Schema = mongoose.Schema;

const cafeUserSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    email: {
        type: String,
        unique: true,
        lowercase: true
    }
    ,
    phone: {
        // ?No need to verify the phone number. Cafe workers know phone number more than email.
        // ? In case if we buy sms to number packge. will add otp to logn but very expensive
        type: String,
        unique: true,
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
            default: false
        },
        activationKey: {
            type: String,
            default: () => Math.floor(Math.random() * (99999999 - 10000000 + 1) + 10000000).toString()
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

    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    // status: {
    //     type: String,
    //     enum: ['active', 'inactive'],
    //     default: 'active'
    // },


    tokens: {
        token: {
            type: String,
            default: "",
        },
        refresh_token: {
            type: String,
            default: "",
        },
        access_token: {
            type: String,
            default: "",
        },
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