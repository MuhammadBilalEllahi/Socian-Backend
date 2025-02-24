const mongoose = require("mongoose");
const { Schema, model } = mongoose;



const jobApplicationSchema = new Schema({
    jobId: {
        type: Schema.Types.ObjectId,
        ref: 'Job'
    },
    applicant: { type: Schema.Types.ObjectId, ref: "User", required: true },
    provider: { type: Schema.Types.ObjectId, ref: "User", required: true },

    applicationType: {
        type: String,
        enum: ["contract", "freelance"], // ? this will be according to job
        required: true,
    },

    name: { type: String, required: true },
    // ! contact: { type: String, required: true },
    email: { type: String, required: true },
    // ? Job title that the applicant holds or applies with (if applicable)
    jobTitle: { type: String },
    // ? A cover letter or explanation on why they want to join
    coverLetter: { type: String },
    // ? Optionally, a URL to a resume or portfolio
    resumeUrl: { type: String },
    // ? If it's a freelance job, the applicant may attach contract details or acceptance info
    contract: { type: String },

    message: { type: String }, // ? Why you are applying


    appliedAt: { type: Date, default: Date.now },
    customFields: [
        {
            fieldName: { type: String },
            fieldValue: { type: String }
        }
    ]

});

const JobApplication = model("JobApplication", jobApplicationSchema, "jobApplications");

module.exports = JobApplication;


const jobReviewsSchema = new Schema({
    _id: {
        type: Schema.Types.ObjectId,
        ref: 'Job'
    },
    jobGiverRating:
    {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        jobGiverId: { type: Schema.Types.ObjectId, ref: "User" },
        rating: { type: Number, min: 1, max: 5 },
        review: { type: String },
        createdAt: { type: Date, default: Date.now }
    },
    jobDoerRating:
    {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        jobGiverId: { type: Schema.Types.ObjectId, ref: "User" },
        rating: { type: Number, min: 1, max: 5 },
        review: { type: String },
        createdAt: { type: Date, default: Date.now }
    }

});

const JobReviews = model("JobReviews", jobReviewsSchema, "jobReviews");

module.exports = JobReviews;





const jobMessageCollectionSchema = new Schema({
    _id: {
        type: Schema.Types.ObjectId,
        ref: 'Job'
    },
    applicantId: {

        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    jobGiverId: {

        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    messages: [
        {
            sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
            receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
            text: { type: String, required: true },
            attachment: { type: String, },
            createdAt: { type: Date, default: Date.now }
        }
    ]


});

const JobMessageCollection = model("JobMessageCollection", jobMessageCollectionSchema, "jobmessagecollections");

module.exports = JobMessageCollection;


const jobPostSchema = new Schema(
    {
        title: { type: String, required: true },
        description: { type: String, required: true },

        jobGiver: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        jobGiverType: {
            type: String,
            enum: ["organization", "alumni", "student", "teacher"],
            required: true,
        },

        isVerifiedOrganization: { type: Boolean, default: false }, // ? Only applicable for organizations

        jobType: {
            type: String,
            enum: ["freelance", "contract"],
            required: true,
        },

        payment: {
            amount: { type: Number, required: true, min: 100 },
            method: {
                type: String,
                enum: ["jazzCash"],
                required: true,
            },
        },
        paymentState: {
            transactionId: { type: String },
            status: {
                type: String,
                enum: ['pending', 'completed', 'refunded'],
                default: 'pending'
            },
            isHeld: { type: Boolean, default: true }, // ? Money held until job completion
            isInCompanyAccount: { type: Boolean, default: false }
        },

        location: {
            type: {
                type: String, // ? "all_campus", is covered by either specific uni or all uni
                enum: [
                    "specific_university", // ? single uni and its all campuses
                    "all_universities", // ? all Universites and all campus
                    "multi_universities", // ? mulitple universities and all its campuses
                    "specific_campus", // ? single scpecifc campus
                    "multi_campus", // ? mulitple campus of different universities
                    "city",
                    "cities",
                    "remote"
                ],
                required: true,
            },
            remoteLocations: [{ type: String }],
            university: [{ type: Schema.Types.ObjectId, ref: "University" }],
            campus: [{ type: Schema.Types.ObjectId, ref: "Campus" }],
            city: [{ type: String }],
        },

        applicants: [{ type: Schema.Types.ObjectId, ref: "JobApplication" }], // ? Store references



        likes: [{ type: Schema.Types.ObjectId, ref: "User" }], // ? Users who liked the job

        status: {
            type: String,
            enum: ["open", "completed", "no_longer_available", 'cancelled'],
            default: "open",
        },

        // For freelance jobs, a deadline/time constraint can be set
        deadline: { type: Date },
        messageThread: { type: Schema.Types.ObjectId, ref: "JobMessageCollection" }, // Chat messages related to the job

        expiresAt: { type: Date, required: true }, // Time limit for freelance jobs

        jobReview: {
            type: Schema.Types.ObjectId,
            ref: 'JobReviews'
        }
    },
    { timestamps: true }
);

const JobPost = model("JobPost", jobPostSchema, "jobposts");

module.exports = JobPost;
