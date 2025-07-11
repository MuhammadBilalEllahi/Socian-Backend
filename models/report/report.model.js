const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const reportSchema = new Schema({
    reportedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },


    postId: { type: Schema.Types.ObjectId, ref: "Post" },
    commentId: { type: Schema.Types.ObjectId, ref: "PostComment" },
    //above is for posts and comments
    userReportedId: { type: Schema.Types.ObjectId, ref: "User" },
    //above is for users
    societyId: { type: Schema.Types.ObjectId, ref: "Society" },
    //above is for societies

    feedbackId: { type: Schema.Types.ObjectId, ref: "TeacherRating" },
    feedbackCommentId: { type: Schema.Types.ObjectId, ref: "FeedBackCommentTeacher" },
    //above is for feedbacks

    pastPaperItemId: { type: Schema.Types.ObjectId, ref: "PastPaperItem" },
    fileId: { type: Schema.Types.ObjectId},
    //above is for past paper items

    discussionId: { type: Schema.Types.ObjectId, ref: "Discussion" },
    discussionCommentId: { type: Schema.Types.ObjectId, ref: "DiscussionComment" },
    //above is for discussions

    reportType: {
        type: Schema.Types.ObjectId,
        ref: "ReportType",
        // enum:[
        //     "spam",
        //     "inappropriate",
        //     "illegal",
        //     "nudity",
        //     "violence",
        //     "harassment",
        //     "discrimination",
        //     "other",
        // ],
        required: true,
    },
    reason: { 
        type: String, 
        maxlength: 500,
        trim: true
    }, // Optional additional context from user
    status: { type: String, enum: ["pending", "banned", "rejected"], default: "pending" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});


const reportTypeSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    reports: [{ type: Schema.Types.ObjectId, ref: "Report" }],
});

// const reportModelTypeSchema = new Schema({
//     name: { type: String, required: true },
//     description: { type: String, required: true },
//     model: { type: String, required: true },
// });


const Report = model("Report", reportSchema);
const ReportType = model("ReportType", reportTypeSchema);
// const ReportModelType = model("ReportModelType", reportModelTypeSchema);
module.exports = { Report, ReportType };