const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const peronalPostsCollectionSchema = new Schema(
    {
        _id: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },

        posts: [
            {
                postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
                createdAt: { type: Date, default: Date.now },
            },
        ],

        references: {
            universityOrigin: {
                type: Schema.ObjectId,
                ref: "University",
                index: true,
            },
            campusOrigin: {
                type: Schema.Types.ObjectId,
                ref: "Campus",
                required: true,
            },
            role: {
                type: String,
                enum: ['alumni', 'student', 'teacher', 'ext_org']
            }
        },
        companyReference: {
            isCompany: { type: Boolean, default: false },
            companyOrigin: {
                type: Schema.Types.ObjectId,
                ref: "ExtOrg",
            },
        },
    },
    { _id: false, timestamps: true }
);

const PersonalPostsCollection = model("PersonalPostsCollection", peronalPostsCollectionSchema);
module.exports = PersonalPostsCollection;
