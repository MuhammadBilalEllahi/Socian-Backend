const mongoose = require("mongoose");
const Society = require("./society.model");
const { Schema, model } = mongoose;

/**
 *
 * @param {visibilityNone} Boolean sets visibility to None everywher, incase soc-mod doesnot want to
 *  delete the group but wants it to remain their or could use it for sample purpose
 * @param {societyType} SocietyType tells society to be either private, public or restricted
 */
const subSocietySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  visibilityNone: {
    type: Boolean,
    default: false,
  },
  description: {
    type: String,
    required: true,
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
  moderators: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  isPromoted: {
    promoted: { type: Boolean, default: false },
    byUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
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
  parent: {
    type: Schema.Types.ObjectId,
    ref: "Society",
  },
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



subSocietySchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      const societyVerified = await Society.findOne({ _id: this.parent })
      this.verified = societyVerified.verified;
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

const SubSociety = mongoose.model("SubSociety", subSocietySchema);
module.exports = SubSociety;

// validate: {
//     validator: function (value) {
//         return !(value && value.length > 0 && this.parent)
//     },
//     message: "A society with sub-societies cannot have a parent."
// }

// validate: {
//     validator: function (value) {
//         return !(value && this.subsocieties && this.subsocieties.length > 0)
//     },
//     message: "A society with a parent cannot have sub-societies."
// }
