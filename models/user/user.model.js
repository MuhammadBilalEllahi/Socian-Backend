const mongoose = require("mongoose");
const UserRoles = require("../userRoles");
const Teacher = require("../university/teacher/teacher.model");

// Remmeber: Apply logic in prioirity on frontend then backend and then model.
const userSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  username: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
    // required: true,
    required: function () {
      return !this.google_EmailVerified; // Password is required only if Google login is NOT used
    }
  },
  role: {
    type: String,
    enum: ["student", "alumni", "teacher", "ext_org", "no_access"],
    required: true,
  },
  super_role: {
    type: String,
    enum: ["super", "admin", "mod", "none"],
  },


  profile: {
    preferences: {
      allowRepost: { type: Boolean, default: true },
    },
    // name: {
    //     type: String,
    // },
    // username: {
    //     type: String,
    //     unique: true
    // },
    // update default picture url
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
      type: String,
      //enum is not needed to hardcode here so ref is used
      // enum: [{ type: mongoose.Schema.Types.ObjeectId, ref: 'Campus' }]
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
      // validate: {
      //   validator: function (v) {
      //     return this.role !== "student" || v; // Require graduationYear if role is student
      //   },
      //   message: "Graduation year is required for students",
      // },
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
      index: true,
    },
    campusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campus",
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      index: true,
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
    unique: true,
    index: true,
    required: function () {
      return !this.personalEmail;
    },
    match: [
      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/,
      "Please fill a valid email address",
    ],
  },
  personalEmail: {
    type: String,
    index: true,
    unique: true,
    required: function () {
      return !this.universityEmail;
    },
    match: [
      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/,
      "Please fill a valid email address",
    ],
  },
  secondaryPersonalEmail: {
    type: String,
    index: true,
    unique: true,
    match: [
      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/,
      "Please fill a valid email address",
    ],
  },

  phoneNumber: {
    type: String,
    match: [/^\d{10,15}$/, "Please fill a valid phone number"],
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
  changedDepartmentOnce:{
    type: Boolean,
    default: false
  },
    changedGraduationYearOnce:{
    type: Boolean,
    default: false
  },

  // ## Expiration
  universityEmailExpirationDate: {
    type: Date,
    default: function () {
      return this.role == "student" ? this.profile.graduationYear : undefined;
    },
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
});

userSchema.index({ role: 1 });


// userSchema.methods.setTeacherModalFORCE
// userSchema.methods.detachTeacherModalFORCE


userSchema.methods.setJoinATeacherModal = async function (teacherId, req) {
  try {
    const teacherModalExists = await Teacher.findById({ _id: teacherId })//.where({ email: '' })
    if (!teacherModalExists) return { status: 404, message: "No Id With This Teacher Exists" }

    if (!teacherModalExists.userAttached && !teacherModalExists.userAttachedBool) {
      teacherModalExists.userAttached = this._id
      teacherModalExists.userAttachedBy.userType = UserRoles.teacher
      teacherModalExists.userAttachedBy.by = this._id;
      teacherModalExists.email = this.universityEmail;
      teacherModalExists.userAttachedBool = true;

      this.teacherConnectivities.teacherModal = teacherModalExists._id;
      this.teacherConnectivities.attached = true;

      await this.save()

      await teacherModalExists.save()

      req.session.user.teacherConnectivities = {
        attached: this.teacherConnectivities.attached,
        teacherModal: this.teacherConnectivities.teacherModal
      }

      return new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            reject({ status: 500, message: "Internal Server Error" });
          } else {
            resolve({ status: 201, message: 'User with role teacher attached with Modal successfully' });
          }
        });
      });

      // return { status: 201, message: 'User with role teacher attached with Modal successfully' }
    } else {

      return { status: 304, message: 'User already attached with another modal, Please verify before Modifyng' }
    }
  } catch (error) {
    console.error("Error in setJoinATeacherModal user.model.js")
    return { status: 500, message: "Internal Server Error", error: error.message };
  }

}

// userSchema.methods.setTeacherModal = async function (req) {
//   try {
//     console.log("ROLE", this)
//     if (this.role === UserRoles.teacher) {
//       const teacherModalExists = await Teacher.findOne({ email: this.universityEmail })

//       // if(!teacherModalExists) return res.status(404).json({message: 'No Teacher With This Model Yet'})
//       if (!teacherModalExists) {

//         const campusOrigin = this.university.campusId
//         const universityOrigin = this.university.universityId
//         const similarTeacherModals = await Teacher.findSimilarTeachers(campusOrigin, universityOrigin)

//         // console.log("TEACHER MODALS", similarTeacherModals, campusOrigin, universityOrigin)

//         if (!similarTeacherModals || similarTeacherModals.length === 0) {
//           return { message: 'No similar teachers to show yet', status: 204 };
//         }

//         return {
//           status: 200,
//           teachers: similarTeacherModals.map((teacher) => ({
//             _id: teacher._id,
//             name: teacher.name,
//             email: teacher.email,
//             userAttachedBool: teacher.userAttachedBool,
//             imageUrl: teacher.imageUrl,
//             onLeave: teacher.onLeave,
//             hasLeft: teacher.hasLeft,
//             rating: teacher.rating,
//             userAttachedBool: teacher.userAttachedBool,
//             department: teacher.department.departmentId.name
//           })),
//           attached: false
//         };

//       } else {

//         if (!teacherModalExists.userAttached && !teacherModalExists.userAttachedBool) {
//           teacherModalExists.userAttached = this._id
//           teacherModalExists.userAttachedBool = true;
//           teacherModalExists.userAttachedBy.userType = UserRoles.teacher
//           teacherModalExists.userAttachedBy.by = this._id
//           await teacherModalExists.save()
//           this.teacherConnectivities.teacherModal = teacherModalExists._id;
//           this.teacherConnectivities.attached = true;

//           await this.save()


//           req.session.user.teacherConnectivities = {
//             attached: this.teacherConnectivities.attached,
//             teacherModal: this.teacherConnectivities.teacherModal
//           }

//           // req.session.save((err) => {
//           //   if (err) {
//           //     console.error("Session save error:", err);
//           //     return res.status(500).json({ error: "Internal Server Error" });
//           //   }
//           // })


//           return new Promise((resolve, reject) => {
//             req.session.save((err) => {
//               if (err) {
//                 console.error("Session save error:", err);
//                 reject({ status: 500, message: "Internal Server Error" });
//               } else {
//                 resolve({ status: 201, message: 'User with role teacher attached with Modal successfully' });
//               }
//             });
//           });


//           // return { status: 200, message: 'User with role teacher attached with Modal successfully', teacher: teacherModalExists, attached: true }
//         } else {
//           return { status: 200, message: 'User already attached with another modal, Please verify before Modifyng', attached: false }
//         }

//       }
//     }
//   } catch (error) {
//     console.error("Error in setTeacherModal method in user.model.js", error)
//     return { status: 500, message: "Internal Server Error", error: error.message };

//   }
// }

/**
 * Updates the email of the user.
 * @param {string} emailType - The type of email to update (e.g., universityEmail, personalEmail, secondaryPersonalEmail).
 * @param {string} email - The new email address.
 * @returns {Promise<User>} - The updated user document.
 * @throws {Error} - If the emailType is invalid for the user's role or the update fails.
 */
userSchema.methods.updateEmail = async function (emailType, email) {
  // Define role-based valid email types
  const roleEmailTypes = {
    student: ["personalEmail"],
    teacher: ["personalEmail"], // if teaher leavs then why is peronalEmail is present?
    alumni: ["personalEmail", "secondaryPersonalEmail"],
  };

  // Get the valid email types for the current user's role
  const validEmailTypes = roleEmailTypes[this.role] || [];

  // Validate the email type against the user's role
  if (!validEmailTypes.includes(emailType)) {
    throw new Error(
      `Invalid email type for role "${this.role
      }". Allowed types: ${validEmailTypes.join(", ")}`
    );
  }
  if (this[emailType] === email) {
    return res.status(302).json({ message: "cannot update same email" });
  }
  if (
    this.personalEmail === email ||
    (this.role === "alumni" && this.secondaryPersonalEmail === email)
  ) {
    return res
      .status(302)
      .json({ message: "Email already used by your account" });
  }
  const emailExists = await this.constructor.findOne({
    $or: [
      { personalEmail: email },
      { secondaryPersonalEmail: email },
      { universityEmail: email },
    ],
    _id: { $ne: this._id }, // Exclude the current user
  });

  if (emailExists) {
    return res
      .status(302)
      .json({ message: "Email already used by others user" });
  }

  // Update the email and save the user document
  this[emailType] = email;
  await this.save();
  return this;
};

// Methods for handling graduation checks and notifications
// userSchema.methods.checkGraduation = function () {
//   const today = new Date();
//   if (this.role === "student" && this.profile.graduationYear < today) {
//     if (!this.phoneNumber) {
//       this.restrictions.blocking.isBlocked = true; // Block account if phone number isn't present
//     } else {
//       // Send notification but don't block the account
//     }
//   }
// };

// Applied > today , not >= to save user from incomplete work they have in student section
userSchema.methods.convertToAlumni = function () {
  const today = new Date();
  if (this.role === "student" && this.profile.graduationYear < today) {
    this.role = "alumni";
    this.restrictions.approval.isApproved=true;
  }
};

userSchema.pre("save", async function (next) {
  // For student or alumni: graduation year logic
  if (this.role === "student"
    // || this.role === "alumni"
  ) {
    this.convertToAlumni();
  }
  // For teacher or ext_org: apply approval status check
  else if (this.role === "ext_org") {
    // this.role === "teacher" || // teacher does not need approval i believe
    if (!this.restrictions.approval.isApproved) {
      this.restrictions.blocking.isBlocked = true; // Block account if not approved
    }
  }
  this.updatedAt = Date.now();
  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
