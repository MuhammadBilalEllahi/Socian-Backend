const { getUserDetails } = require("../../../utils/utils");
const { Report, ReportType } = require("../../../models/report/report.model");
const Post = require("../../../models/society/post/post.model");
const PostComment = require("../../../models/society/post/comment/post.comment.model");
const User = require("../../../models/user/user.model");
const Society = require("../../../models/society/society.model");
const { PastPaperItem, File } = require("../../../models/university/papers/pastpaper.item.model");
const FeedBackCommentTeacher = require("../../../models/university/teacher/feedback.rating.teacher.model");
const TeacherRating = require("../../../models/university/teacher/rating.teacher.model");
const Discussion = require("../../../models/university/papers/discussion/discussion");
const { DiscussionComment } = require("../../../models/university/papers/discussion/discussion.comment");

const router = require("express").Router();

const reportModelTypes = Object.freeze(
    {
        POST: "Post",
        POSTCOMMENT: "PostComment",
        USER: "User",
        SOCIETY: "Society",
        FEEDBACKCOMMENT: "FeedBackCommentTeacher",
        FEEDBACK: "TeacherRating",
        DISCUSSION: "Discussion",
        DISCUSSION_COMMENT: "DiscussionComment",
        PAST_PAPER_ITEM: "PastPaperItem",
        FILE: "File",
        }
);


// "User"
// "Post" 
// "PostComment" 
// "User" 
// "Society" 
// "TeacherRating" 
// "FeedBackCommentTeacher" 
// "PastPaperItem" 
// "Discussion" 
// "DiscussionComment" 

// Report Post
router.post("/post", async (req, res) => {
    try {
        const {userId} = getUserDetails(req);
        const {postId, reportType, reason} = req.body;
        

        const post = await Post.findById(postId);
        if(!post){
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        const report = await Report.create({
            reportedByUserId: userId,
            postId: post._id,
            reportType,
            reason,
        });

        res.status(201).json({
            success: true,
            message: "Post report created successfully",
            report,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
        console.log(error);
    }
});

// Report Post Comment
router.post("/post-comment", async (req, res) => {
    try {
        const {userId} = getUserDetails(req);
        const {commentId, reportType, reason} = req.body;

        const comment = await PostComment.findById(commentId);
        if(!comment){
            return res.status(404).json({
                success: false,
                message: "Comment not found",
            });
        }

        const report = await Report.create({
            reportedByUserId: userId,
            commentId: comment._id,
            reportType,
            reason,
        });

        res.status(201).json({
            success: true,
            message: "Comment report created successfully",
            report,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
        console.log(error);
    }
});

// Report User
router.post("/user", async (req, res) => {
    try {
        const {userId} = getUserDetails(req);
        const {userReportedId, reportType, reason} = req.body;

        const user = await User.findById(userReportedId);
        if(!user){
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const report = await Report.create({
            reportedByUserId: userId,
            userReportedId: user._id,
            reportType,
            reason,
        });

        res.status(201).json({
            success: true,
            message: "User report created successfully",
            report,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
        console.log(error);
    }
});

// Report Society
router.post("/society", async (req, res) => {
    try {
        const {userId} = getUserDetails(req);
        const {societyId, reportType, reason} = req.body;

        const society = await Society.findById(societyId);
        if(!society){
            return res.status(404).json({
                success: false,
                message: "Society not found",
            });
        }

        const report = await Report.create({
            reportedByUserId: userId,
            societyId: society._id,
            reportType,
            reason,
        });

        res.status(201).json({
            success: true,
            message: "Society report created successfully",
            report,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
        console.log(error);
    }
});

// Report Feedback
router.post("/feedback", async (req, res) => {
    try {
        const {userId} = getUserDetails(req);
        const {feedbackId, reportType, reason} = req.body;

        const feedback = await TeacherRating.findById(feedbackId);
        if(!feedback){
            return res.status(404).json({
                success: false,
                message: "Feedback not found",
            });
        }

        const report = await Report.create({
            reportedByUserId: userId,
            feedbackId: feedback._id,
            reportType,
            reason,
        });

        res.status(201).json({
            success: true,
            message: "Feedback report created successfully",
            report,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
        console.log(error);
    }
});

// Report Feedback Comment
router.post("/feedback-comment", async (req, res) => {
    try {
        const {userId} = getUserDetails(req);
        const {feedbackCommentId, reportType, reason} = req.body;

        const feedbackComment = await FeedBackCommentTeacher.findById(feedbackCommentId);
        if(!feedbackComment){
            return res.status(404).json({
                success: false,
                message: "Feedback comment not found",
            });
        }

        const report = await Report.create({
            reportedByUserId: userId,
            feedbackCommentId: feedbackComment._id,
            reportType,
            reason,
        });

        res.status(201).json({
            success: true,
            message: "Feedback comment report created successfully",
            report,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
        console.log(error);
    }
});

// Report Past Paper Item
router.post("/past-paper-item", async (req, res) => {
    try {
        const {userId} = getUserDetails(req);
        const {pastPaperItemId, reportType, reason} = req.body;

        const pastPaperItem = await PastPaperItem.findById(pastPaperItemId);
        if(!pastPaperItem){
            return res.status(404).json({
                success: false,
                message: "Past paper item not found",
            });
        }

        const report = await Report.create({
            reportedByUserId: userId,
            pastPaperItemId: pastPaperItem._id,
            reportType,
            reason,
        });

        res.status(201).json({
            success: true,
            message: "Past paper item report created successfully",
            report,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
        console.log(error);
    }
});

// Report File
router.post("/file", async (req, res) => {
    try {
        const {userId} = getUserDetails(req);
        const {fileId, reportType, reason} = req.body;

        const file = await File.findById(fileId);
        if(!file){
            return res.status(404).json({
                success: false,
                message: "File not found",
            });
        }

        const report = await Report.create({
            reportedByUserId: userId,
            fileId: file._id,
            reportType,
            reason,
        });

        res.status(201).json({
            success: true,
            message: "File report created successfully",
            report,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
        console.log(error);
    }
});

// Report Discussion
router.post("/discussion", async (req, res) => {
    try {
        const {userId} = getUserDetails(req);
        const {discussionId, reportType, reason} = req.body;

        const discussion = await Discussion.findById(discussionId);
        if(!discussion){
            return res.status(404).json({
                success: false,
                message: "Discussion not found",
            });
        }

        const report = await Report.create({
            reportedByUserId: userId,
            discussionId: discussion._id,
            reportType,
            reason,
        });

        res.status(201).json({
            success: true,
            message: "Discussion report created successfully",
            report,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
        console.log(error);
    }
});

// Report Discussion Comment
router.post("/discussion-comment", async (req, res) => {
    try {
        const {userId} = getUserDetails(req);
        const {discussionCommentId, reportType, reason} = req.body;

        const discussionComment = await DiscussionComment.findById(discussionCommentId);
        if(!discussionComment){
            return res.status(404).json({
                success: false,
                message: "Discussion comment not found",
            });
        }

        const report = await Report.create({
            reportedByUserId: userId,
            discussionCommentId: discussionComment._id,
            reportType,
            reason,
        });

        res.status(201).json({
            success: true,
            message: "Discussion comment report created successfully",
            report,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
        console.log(error);
    }
});

// haraasments, spam, illegal, nudity, violence, harassment, discrimination, other
router.get("/types", async (req, res) => {
    try {
        const reportTypes = await ReportType.find();
        res.status(200).json({
            success: true,
            reportTypes,
        });
    } catch (error) {  
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
        console.log(error);
    }
});



module.exports = router;
