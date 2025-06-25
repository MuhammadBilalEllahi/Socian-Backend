const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const societySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  category: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    required: true,
  },
  visibilityNone: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  president: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  moderators: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  previousModerators: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  rules: [
    {
      title: { type: String },
      description: { type: String },
    },
  ],
  banner: { type: String },
  bannerMediaType: {type: String},
  icon: { type: String },
  iconMediaType: {type: String},
  topics: [{ type: String }],
  societyType: {
    type: Schema.Types.ObjectId,
    ref: "SocietyType",
    required: true,
  },
  totalMembers: {
    type: Number,
    default: 0,
  },
  members: {
    type: Schema.Types.ObjectId,
    ref: "Members",
  },
  postsCollectionRef: {
    type: Schema.Types.ObjectId,
    ref: "PostsCollection",
  },
  isPromoted: {
    promoted: { type: Boolean, default: false },
    byUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  subSocieties: [
    {
      type: Schema.Types.ObjectId,
      ref: "SubSociety",
      index: true,
    },
  ],
  roles: [
    {
      role: { type: String, required: true },
      name: { type: String, required: true },
      picture: { type: String },
    },
  ],
  references: {
    role: { type: String, enum: ['teacher', 'student', 'alumni'], },
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
  },
  verified: {
    type: Boolean,
    default: false,
  },
  companyReference: {
    isCompany: { type: Boolean, default: false },
    companyOrigin: {
      type: Schema.Types.ObjectId,
      ref: "ExtOrg",
    },
  },
  allows: {
    type: [String],
    enum: ['alumni', 'student', 'teacher', 'ext_org', 'all'],
  },
  isDeleted: {
    type: Boolean,
    default: false
  },

  hiddenByMod:{
    type: Boolean,
    default: false
  },
   hiddenBySuper:{
    type: Boolean,
    default: false
  },
  reason: {
    type: String,

  }
});

societySchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      if (this.allows && this.allows.length > 0) {
        return next();
      }
      const creator = await mongoose.model("User").findById(this.creator);
      if (!creator) {
        return next(new Error("Creator not found"));
      }
      if (creator.role === 'student') {
        this.allows = ['student'];
      } else if (creator.role === 'teacher') {
        this.allows = ['teacher'];
      } else if (creator.role === 'alumni') {
        this.allows = ['alumni'];
      } else if (creator.role === 'ext_org') {
        this.allows = ['alumni'];
      } else {
        this.allows = ['all'];
      }
      next();
    } catch (error) {
      return next(error);
    }
  } else {
    next();
  }
});

const Society = mongoose.model("Society", societySchema);
module.exports = Society;