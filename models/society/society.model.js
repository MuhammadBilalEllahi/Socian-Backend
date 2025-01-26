const mongoose = require("mongoose");
const { Schema, model } = mongoose;

/**
 *
 * @param {visibilityNone} Boolean sets visibility to None everywher, incase soc-mod doesnot want to
 *  delete the group but wants it to remain their or could use it for sample purpose
 * @param {societyType} SocietyType tells society to be either private, public or restricted
 */
const societySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  category: {
    type: String,
    default: "default",
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
  president:
  {
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
  icon: { type: String },
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
    // required: true
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
  }
});



societySchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      // If 'allows' field is already provided, skip setting it dynamically
      if (this.allows && this.allows.length > 0) {
        return next(); // Skip the logic if 'allows' is already set
      }

      // Fetch the creator's role if 'allows' is not provided
      const creator = await mongoose.model("User").findById(this.creator);

      if (!creator) {
        return next(new Error("Creator not found"));
      }

      // Dynamically set the 'allows' field based on the creator's role
      if (creator.role === 'student') {
        this.allows = ['student'];
      } else if (creator.role === 'teacher') {
        this.allows = ['teacher'];
      } else if (creator.role === 'alumni') {
        this.allows = ['alumni'];
      } else if (creator.role === 'ext_org') {
        this.allows = ['alumni'];
      } else {
        this.allows = ['all']; // Default if role is not found
      }

      // Proceed to save the society
      next();
    } catch (error) {
      return next(error);
    }
  } else {
    // If the document isn't new, proceed without modification
    next();
  }
});


const Society = mongoose.model("Society", societySchema);
module.exports = Society;
