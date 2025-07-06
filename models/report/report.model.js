const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const reportSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    postId: { type: Schema.Types.ObjectId, ref: "Post" },
    commentId: { type: Schema.Types.ObjectId, ref: "Comment" },
    replyId: { type: Schema.Types.ObjectId, ref: "Reply" },
    //above is for posts and comments
    userReportedId: { type: Schema.Types.ObjectId, ref: "User" },
    //above is for users
    societyId: { type: Schema.Types.ObjectId, ref: "Society" },
    subSocietyId: { type: Schema.Types.ObjectId, ref: "SubSociety" },
    //above is for societies

    feedbackId: { type: Schema.Types.ObjectId, ref: "Feedback" },
    feedbackCommentId: { type: Schema.Types.ObjectId, ref: "FeedbackComment" },
    feedbackReplyId: { type: Schema.Types.ObjectId, ref: "FeedbackReply" },
    //above is for feedbacks

    

    // eventId: { type: Schema.Types.ObjectId, ref: "Event" },
    // eventCommentId: { type: Schema.Types.ObjectId, ref: "EventComment" },
    // eventReplyId: { type: Schema.Types.ObjectId, ref: "EventReply" },
    // //above is for events

    reason: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const Report = model("Report", reportSchema);
module.exports = Report;