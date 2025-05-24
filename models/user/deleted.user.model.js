const mongoose = require("mongoose");

const deltedUserSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    deletedUserId: {
        type: String,
    },
    username: {
        type: String,
    },
    password: {
        type: String,
    },
    role: {
        type: String,
        enum: ["student", "alumni", "teacher", "ext_org", "no_access"],
    },
    super_role: {
        type: String,
        enum: ["super", "admin", "mod", "none"],
    },


    profile: {
        preferences: {
            allowRepost: { type: Boolean, default: true },
        },

        picture: {
            type: String, // MAKE this array of pictures
            default:
                "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
        },
        pictureList: [{
            image: {
                type: String,
            }
        }],
        bio: { type: String, default: "" },
        location: {
            type: String
        },
        website: [{ type: String, default: "" }], // ## for showcase on profile
        socialLinks: [String], //
        gender: {
            type: String,
            enum: ["male", "female", "other"],
        },
        credibility: {
            postCredibility: { type: Number, default: 0 },
            commentCredibility: { type: Number, default: 0 },
        },
        graduationYear: {
            type: Date,
        },


        department: {
            type: String,
        },
        savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
        posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
        personalPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
        connections: {
            friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "FriendRequest" }],

            // friend: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", }],
            blocked: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        },

        moderatorTo: {
            society: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Society",
                },
            ],
            subsociety: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "SubSociety",
                },
            ],
        },
    },

    university: {
        slug: String,
        universityId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "University",
        },
        campusId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Campus",

        },
        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",

        },
    },
    subscribedSocities: [
        { type: mongoose.Schema.Types.ObjectId, ref: "Society" },
    ],
    subscribedSubSocities: [
        { type: mongoose.Schema.Types.ObjectId, ref: "SubSociety" },
    ],
    // ##  EMAIL
    universityEmail: {
        type: String,



    },
    personalEmail: {
        type: String

    },
    secondaryPersonalEmail: {
        type: String,

    },

    phoneNumber: {
        type: String,
    },

    // ## Verified?
    universityEmailVerified: {
        type: Boolean,
        default: false,
    },
    personalEmailVerified: {
        type: Boolean,
        default: false,
    },
    secondaryPersonalEmailVerified: {
        type: Boolean,
        default: false,
    },
    google_EmailVerified: {
        type: Boolean,
        default: false,
    },
    phoneNumberVerified: {
        type: Boolean,
        default: false,
    },
    changedDepartmentOnce: {
        type: Boolean,
        default: false
    },
    changedGraduationYearOnce: {
        type: Boolean,
        default: false
    },

    // ## Expiration
    universityEmailExpirationDate: {
        type: Date,

    },
    teacherConnectivities: {
        teacherModal: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Teacher'
        },
        attached: { type: Boolean, default: false },
    },

    requiresMoreInformation: {
        type: Boolean,
        default: false
    },

    // ## Restrictions
    restrictions: {
        blocking: {
            isBlocked: { type: Boolean, default: false },
            blockedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        },

        // Additional field for ext_org approval and alumni
        approval: {
            isApproved: { type: Boolean, default: false },
            approvedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        }, // This is  ref to a user(admin,mod,super admin) or SELF for teacher,student
    },

    // ## tokens
    //    if using jwt token
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

    hd: {
        type: String,
        default: ''
    },
    // ## Query Updates
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },

    agreedToPolicy: {
        type: Boolean,
        default: false,
    }
});


const DeletedUser = mongoose.model("DeletedUser", deltedUserSchema);
module.exports = DeletedUser;