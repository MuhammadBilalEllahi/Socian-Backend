const mongoose = require('mongoose');
const User = require('../../user/user.model');
const {UserRoles} = require('../../userRoles');
const Schema = mongoose.Schema;



const teacherSchema = new Schema({
    teacher: {
        id: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        verified: {
            type: Boolean,
            default: false
        },
        matchDomain: {
            type: String,
            default: '' //e.g drhabib@cuilahore.edu.pk
        }
    },
    email: {
        type: String,
        default: ''
    },
    userAttachedBool: {
        type: Boolean,
        default: false
    },
    userAttached: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    userAttachedBy: {
        by: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        userType: {
            type: String,
            enum: ['user', 'teacher', 'system']
        }
    },
    name: {
        type: String,
        required: true
    },
    designation: {
        type: String,
        // required: true
    },
    department: {
        name: { type: String },
        // required: true
        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
        }
    },
    areaOfInterest: {
        type: String,
        // required: true
    },
    supervisorStatus: {
        type: String,
        // required: true
    },
    imageUrl: {
        type: String,
        // required: true,
        default: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"
    },
    gender: {
        type: String,
        enum: ['female', 'male', 'other']
    },

    onLeave: {
        type: Boolean,
        // required: true
        default: false
    },
    hasLeft: {
        type: Boolean,
        // required: true,
        default: false
    },
    rating: {
        type: Number,
        default: 0
    },
    campusOrigin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campus',
    },
    universityOrigin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'University',
    },
    subjectsTaught: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
    }
    ],
    ratingsByStudents:
        [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TeacherRating',
        }],

    ratingsByStudentsMap:
    {
        type: Map,
        of: {
            type: Number,
            min: 0,
            max: 5
        }, //user._id : rating
        default: {}
    },
    feedbackSummary: [
        {
            summary: { type: String, default: "" },
            date: { type: Date, default: Date.now }
          }
    ], 
    hiddenByMod: { type: Boolean, default: false },
    hiddenBySuper:{
    type: Boolean,
    default: false
  },
    reason: { type: String},

});




// teacherSchema.pre('save', async function (req, res, next) {

//     if (this.email !== '' && !this.userAttachedBool) {
//         try {
//             const teacherWithThisEmailExists = await User.findOne({ universityEmail: this.email, role: UserRoles.teacher })
//             if (!teacherWithThisEmailExists) return next();
//             this.userAttached = teacherWithThisEmailExists._id;
//             this.userAttachedBool = true;
//             this.userAttachedBy.userType = UserRoles.system
//             // this.save() //dont use this.save in save

//             teacherWithThisEmailExists.teacherConnectivities.teacherModal = teacherModalExists._id;
//             teacherWithThisEmailExists.teacherConnectivities.attached = true;

//             // await teacherWithThisEmailExists.save()

//             req.session.user.teacherConnectivities = {
//                 attached: teacherWithThisEmailExists.teacherConnectivities.attached,
//                 teacherModal: teacherWithThisEmailExists.teacherConnectivities.teacherModal
//             }

//             new Promise((resolve, reject) => {
//                 req.session.save((err) => {
//                     if (err) {
//                         console.error("Session save error:", err);
//                         reject({ status: 500, message: "Internal Server Error" });
//                         next()
//                     } else {
//                         resolve({ status: 201, message: 'User with role teacher attached with Modal successfully' });
//                         next()
//                     }
//                 });
//             });


//             next()

//         } catch (error) {
//             console.error("Error in Teacher model.js in pre save", error)
//         }
//     } else {
//         next()
//     }

// })

// // Virtual to calculate ratingAvg
// teacherSchema.virtual('ratingAvg').get(function () {
//     if (this.ratingsByStudentsMap && this.ratingsByStudentsMap.size > 0) {
//         const totalRatings = Array.from(this.ratingsByStudentsMap.values());
//         const sum = totalRatings.reduce((acc, curr) => acc + curr, 0);
//         return (sum / totalRatings.length).toFixed(2); // Rounded to 2 decimal places
//     }
//     return 0;
// });

// // Pre-save middleware to calculate and store the average rating
// teacherSchema.pre('save', function (next) {
//     if (this.ratingsByStudentsMap && this.ratingsByStudentsMap.size > 0) {
//         const totalRatings = Array.from(this.ratingsByStudentsMap.values());
//         const sum = totalRatings.reduce((acc, curr) => acc + curr, 0);
//         this.rating = parseFloat((sum / totalRatings.length).toFixed(2)); // Store the rounded value
//     } else {
//         this.rating = 0; // Default to 0 if no ratings
//     }
//     next();
// });



teacherSchema.statics.findSimilarTeachers = async function (campusId, universityId) {
    return await this.find({
        campusOrigin: campusId,
        universityOrigin: universityId,
    }).populate("department.departmentId");
};




const Teacher = mongoose.model('Teacher', teacherSchema);
module.exports = Teacher;