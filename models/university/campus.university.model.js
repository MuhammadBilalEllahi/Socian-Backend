const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const campusSchema = new Schema({
    universityOrigin: {
        type: Schema.ObjectId,
        ref: 'University',
        index: true,
    },
    name: {
        type: String,
        required: true,
    },
    location: { //lahore,islamabad etc
        type: String,
        required: true,
        index: true,
    },
    websiteUrl: {
        type: String,
        // required: true,
        default: ''
    },

    emailPatterns: {
        // teacherPatterns: [String],
        // studentPatterns: [String],
        // convertedRegEx: {
        //     teacherPatterns: [String],
        //     studentPatterns: [String],
        // },
        domain: {
            type: String,
        },
        regex: {
            type: String,
            default: ''
        }
        // RollNumberFormat: [String]
    },
    picture: {
        type: String,
        default: ''
    },
    society: {
        teachers: [{ type: Schema.ObjectId, ref: 'Society' }],
        alumni: [{ type: Schema.ObjectId, ref: 'Society' }],
        student: [{ type: Schema.ObjectId, ref: 'Society' }],
    },
    subSociety: {
        teachers: [{ type: Schema.ObjectId, ref: 'Society' }],
        alumni: [{ type: Schema.ObjectId, ref: 'Society' }],
        student: [{ type: Schema.ObjectId, ref: 'Society' }],
    },


    departments: [{
        type: Schema.ObjectId,
        ref: 'Department',
        index: true,
    }],

    isDeleted: {
  type: Boolean,
  default: false,
},

    registered: {
        isRegistered: {
            type: Boolean,
            default: true
        },
        registeredBy:
        {
            type: Schema.ObjectId,
            ref: 'User'
        },
    },

    users: [{
        type: Schema.ObjectId,
        ref: 'User',
        index: true,
    }],

    teachers: [{
        type: Schema.ObjectId,
        ref: 'Teacher'
    }],


    academic: {
        FormatId: {
            type: Schema.ObjectId,
            ref: 'AcademicFormat',
            index: true,
        },
        FormatType: {
            type: String,
            enum: [
                'MIDTERM', '2_SESSIONAL'
            ],
            default: 'MIDTERM',
            validate: {
                validator: function () {
                    return (
                        this.FormatId &&
                            this.FormatId.formatType ===
                            "MIDTERM"
                            ? this.default = 'MIDTERM'
                            : this.default = '2_SESSIONAL'
                    );
                },
                message: "Selected Defaulty",
            },
        },
    }
}, { timestamps: true })


campusSchema.pre(/^find/, function (next) {
  // Applies to find, findOne, findOneAndUpdate, etc.
  if (!this.getFilter().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});


//  Bonus: includeDeleted is a custom flag — if you explicitly want to fetch deleted campuses (admin panel or audit logs), you can still do:
// Campus.find({ includeDeleted: true }); // bypasses the hook


const Campus = mongoose.model("Campus", campusSchema);


module.exports = Campus;
