const router = require("express").Router();
const { ReportType, Report } = require("../../models/report/report.model");
const Post = require("../../models/society/post/post.model");
const PostComment = require("../../models/society/post/comment/post.comment.model");
const User = require("../../models/user/user.model");
const Society = require("../../models/society/society.model");
const FeedBackCommentTeacher = require("../../models/university/teacher/feedback.rating.teacher.model");
const TeacherRating = require("../../models/university/teacher/rating.teacher.model");
const { PastPaperItem, File } = require("../../models/university/papers/pastpaper.item.model");
const { DiscussionComment } = require("../../models/university/papers/discussion/discussion.comment");
const Discussion = require("../../models/university/papers/discussion/discussion");

// Create report type
router.post("/type/create", async (req, res) => {
    try {
        const { name, description } = req.body;
        const reportType = await ReportType.create({ name, description });
        res.status(201).json({ reportType, success: true });
    } catch (error) {
        res.status(500).json({ message: error.message, success: false });
    }
});

// Get all report types
router.get("/types", async (req, res) => {
    try {
        const reportTypes = await ReportType.find();
        res.status(200).json({ reportTypes, success: true });
    } catch (error) {
        res.status(500).json({ message: error.message, success: false });
    }
});

// Get reports with filters
router.get("/reports", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Build query with filters
        let query = {};
        
        // Filter by report type
        if (req.query.reportTypeId) {
            query.reportType = req.query.reportTypeId;
        }
        
        // Filter by status
        if (req.query.status) {
            query.status = req.query.status;
        }

        // Build aggregation pipeline to filter by university/campus
        const pipeline = [
            { $match: query },
            {
                $lookup: {
                    from: "users",
                    localField: "reportedByUserId",
                    foreignField: "_id",
                    as: "reportedBy"
                }
            },
            {
                $lookup: {
                    from: "reporttypes",
                    localField: "reportType",
                    foreignField: "_id",
                    as: "reportTypeDetails"
                }
            }
        ];

        // Add university/campus filters if provided
        if (req.query.universityId || req.query.campusId) {
            pipeline.push({
                $match: {
                    $or: [
                        { "reportedBy.university.universityOrigin": req.query.universityId },
                        { "reportedBy.university.campusId._id": req.query.campusId }
                    ].filter(Boolean)
                }
            });
        }

        // Add lookup for reported content based on model type
        pipeline.push(
            {
                $lookup: {
                    from: "posts",
                    localField: "postId",
                    foreignField: "_id",
                    as: "reportedPost"
                }
            },
            {
                $lookup: {
                    from: "postcomments",
                    localField: "commentId",
                    foreignField: "_id",
                    as: "reportedComment"
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userReportedId",
                    foreignField: "_id",
                    as: "reportedUser"
                }
            },
            {
                $lookup: {
                    from: "societies",
                    localField: "societyId",
                    foreignField: "_id",
                    as: "reportedSociety"
                }
            },
            {
                $lookup: {
                    from: "teacherratings",
                    localField: "feedbackId",
                    foreignField: "_id",
                    as: "reportedFeedback"
                }
            },
            {
                $lookup: {
                    from: "feedbackcommentteachers",
                    localField: "feedbackCommentId",
                    foreignField: "_id",
                    as: "reportedFeedbackComment"
                }
            },
            {
                $lookup: {
                    from: "pastpaperitems",
                    localField: "pastPaperItemId",
                    foreignField: "_id",
                    as: "reportedPastPaperItem"
                }
            },
            {
                $lookup: {
                    from: "files",
                    localField: "fileId",
                    foreignField: "_id",
                    as: "reportedFile"
                }
            },
            {
                $lookup: {
                    from: "discussions",
                    localField: "discussionId",
                    foreignField: "_id",
                    as: "reportedDiscussion"
                }
            },
            {
                $lookup: {
                    from: "discussioncomments",
                    localField: "discussionCommentId",
                    foreignField: "_id",
                    as: "reportedDiscussionComment"
                }
            }
        );

        pipeline.push(
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        );

        const [reports, total] = await Promise.all([
            Report.aggregate(pipeline),
            Report.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            reports,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Ban reported item
router.post("/ban/:reportId", async (req, res) => {
    try {
        const { reportId } = req.params;
        const { reason } = req.body;

        const report = await Report.findById(reportId)
            .populate('postId')
            .populate('commentId')
            .populate('userReportedId')
            .populate('societyId')
            .populate('feedbackId')
            .populate('feedbackCommentId')
            .populate('pastPaperItemId')
            .populate('discussionId')
            .populate('discussionCommentId')
            .populate('fileId');

        if (!report) {
            return res.status(404).json({ success: false, message: "Report not found" });
        }

        let targetModel, modelType;
        
        // Determine which model is being reported and get the populated data
        if (report.postId) {
            targetModel = report.postId;
            modelType = 'Post';
        } else if (report.commentId) {
            targetModel = report.commentId;
            modelType = 'PostComment';
        } else if (report.userReportedId) {
            targetModel = report.userReportedId;
            modelType = 'User';
        } else if (report.societyId) {
            targetModel = report.societyId;
            modelType = 'Society';
        } else if (report.feedbackId) {
            targetModel = report.feedbackId;
            modelType = 'TeacherRating';
        } else if (report.feedbackCommentId) {
            targetModel = report.feedbackCommentId;
            modelType = 'FeedBackCommentTeacher';
        } else if (report.pastPaperItemId) {
            targetModel = report.pastPaperItemId;
            modelType = 'PastPaperItem';
        } else if (report.discussionId) {
            targetModel = report.discussionId;
            modelType = 'Discussion';
        } else if (report.discussionCommentId) {
            targetModel = report.discussionCommentId;
            modelType = 'DiscussionComment';
        } else if (report.fileId) {
            targetModel = report.fileId;
            modelType = 'File';
        }

        if (!targetModel) {
            return res.status(404).json({ success: false, message: "Reported content not found" });
        }

        // Set ban flags - handle different model structures
        if (modelType === 'Post') {
            targetModel.status.isDeleted = true;
        } else {
            targetModel.isDeleted = true;
        }
        targetModel.isReported = { status: true, reportId: reportId, reason: reason || 'Violates community standards' };
        await targetModel.save();

        // Update report status
        report.status = 'banned';
        await report.save();

        res.status(200).json({ 
            success: true, 
            message: `${modelType} banned successfully`,
            bannedItem: { id: targetModel._id, type: modelType }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Unban reported item
router.post("/unban/:reportId", async (req, res) => {
    try {
        const { reportId } = req.params;

        const report = await Report.findById(reportId)
            .populate('postId')
            .populate('commentId')
            .populate('userReportedId')
            .populate('societyId')
            .populate('feedbackId')
            .populate('feedbackCommentId')
            .populate('pastPaperItemId')
            .populate('discussionId')
            .populate('discussionCommentId')
            .populate('fileId');

        if (!report) {
            return res.status(404).json({ success: false, message: "Report not found" });
        }

        let targetModel, modelType;
        
        // Determine which model is being reported and get the populated data
        if (report.postId) {
            targetModel = report.postId;
            modelType = 'Post';
        } else if (report.commentId) {
            targetModel = report.commentId;
            modelType = 'PostComment';
        } else if (report.userReportedId) {
            targetModel = report.userReportedId;
            modelType = 'User';
        } else if (report.societyId) {
            targetModel = report.societyId;
            modelType = 'Society';
        } else if (report.feedbackId) {
            targetModel = report.feedbackId;
            modelType = 'TeacherRating';
        } else if (report.feedbackCommentId) {
            targetModel = report.feedbackCommentId;
            modelType = 'FeedBackCommentTeacher';
        } else if (report.pastPaperItemId) {
            targetModel = report.pastPaperItemId;
            modelType = 'PastPaperItem';
        } else if (report.discussionId) {
            targetModel = report.discussionId;
            modelType = 'Discussion';
        } else if (report.discussionCommentId) {
            targetModel = report.discussionCommentId;
            modelType = 'DiscussionComment';
        } else if (report.fileId) {
            targetModel = report.fileId;
            modelType = 'File';
        }

        if (!targetModel) {
            return res.status(404).json({ success: false, message: "Reported content not found" });
        }

        // Remove ban flags - handle different model structures
        if (modelType === 'Post') {
            targetModel.status.isDeleted = false;
        } else {
            targetModel.isDeleted = false;
        }
        targetModel.isReported = { status: false, reportId: null, reason: null };
        await targetModel.save();

        // Update report status
        report.status = 'rejected';
        await report.save();

        res.status(200).json({ 
            success: true, 
            message: `${modelType} unbanned successfully`,
            unbannedItem: { id: targetModel._id, type: modelType }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all banned items
router.get("/banned-items", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Get all reports that have approved status (banned items)
        const reports = await Report.find({ status: 'banned' })
            .populate('postId')
            .populate('commentId')
            .populate('userReportedId')
            .populate('societyId')
            .populate('feedbackId')
            .populate('feedbackCommentId')
            .populate('pastPaperItemId')
            .populate('discussionId')
            .populate('discussionCommentId')
            .populate('fileId')
            .populate('reportType')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit);

            const total = await Report.countDocuments({ status: 'banned' });

        // Format the banned items with their content
        const bannedItems = reports.map(report => {
            let content = null;
            let modelType = null;

            if (report.postId) {
                content = report.postId;
                modelType = 'Post';
            } else if (report.commentId) {
                content = report.commentId;
                modelType = 'PostComment';
            } else if (report.userReportedId) {
                content = report.userReportedId;
                modelType = 'User';
            } else if (report.societyId) {
                content = report.societyId;
                modelType = 'Society';
            } else if (report.feedbackId) {
                content = report.feedbackId;
                modelType = 'TeacherRating';
            } else if (report.feedbackCommentId) {
                content = report.feedbackCommentId;
                modelType = 'FeedBackCommentTeacher';
            } else if (report.pastPaperItemId) {
                content = report.pastPaperItemId;
                modelType = 'PastPaperItem';
            } else if (report.discussionId) {
                content = report.discussionId;
                modelType = 'Discussion';
            } else if (report.discussionCommentId) {
                content = report.discussionCommentId;
                modelType = 'DiscussionComment';
            } else if (report.fileId) {
                content = report.fileId;
                modelType = 'File';
            }

            return {
                ...content?.toObject(),
                modelType,
                reportId: report._id,
                reportType: report.reportType,
                bannedAt: report.updatedAt,
                banReason: report.reason
            };
        }).filter(item => item.modelType); // Filter out items where content wasn't found

        res.status(200).json({
            success: true,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            bannedItems
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete report type
router.delete("/type/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await ReportType.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Report type deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;