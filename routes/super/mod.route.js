const router = require("express").Router();
const ModActivity = require("../../models/mod/modActivity.model");
const { getUserDetails } = require("../../utils/utils");

// Import models that might need to be updated during undo
const TeacherRating = require("../../models/university/teacher/rating.teacher.model");
const Teacher = require("../../models/university/teacher/teacher.model");
const FeedBackCommentTeacher = require("../../models/university/teacher/feedback.rating.teacher.model");
const Society = require("../../models/society/society.model");
const mongoose = require("mongoose");

// Get all mod activities
router.get("/get-all-mod-activity", async (req, res) => {
    try {
        const modActivity = await ModActivity.find()
            .populate({
                path: "userId",
                model: "User",
                select: "name username profile.picture _id",
            })
            .populate({
                path: "campusId",
                model: "Campus",
                select: "name _id",
            })
            .populate({
                path: "universityId",
                model: "University",
                select: "name _id",
            })
            .sort({ timestamp: -1 });
        res.status(200).json(modActivity);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get mod activity by ID
router.get("/get-mod-activity-by-id/:id", async (req, res) => {
    try {
        const modActivity = await ModActivity.findById(req.params.id)
            .populate({
                path: "userId",
                model: "User",
                select: "name username profile.picture _id",
            })
            .populate({
                path: "campusId",
                model: "Campus",
                select: "name _id",
            })
            .populate({
                path: "universityId",
                model: "University",
                select: "name _id",
            });
        res.status(200).json(modActivity);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all mod activities for a specific campus
router.get("/get-all-campus-mod-activity/:campusId", async (req, res) => {
    try {
        const modActivity = await ModActivity.find({
            campusId: req.params.campusId
        }).populate({
            path: "userId",
            model: "User",
            select: "name username profile.picture _id",
        })
        .populate({
            path: "campusId",
            model: "Campus",
            select: "name _id",
        })
        .populate({
            path: "universityId",
            model: "University",
            select: "name _id",
        })
        .sort({ timestamp: -1 });
        res.status(200).json(modActivity);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all mod activities for a specific university
router.get("/get-all-university-mod-activity/:universityId", async (req, res) => {
    try {
        const modActivity = await ModActivity.find({
            universityId: req.params.universityId
        }).populate({
            path: "userId",
            model: "User",
            select: "name username profile.picture _id",
        })
        .populate({
            path: "campusId",
            model: "Campus",
            select: "name _id",
        })
        .populate({
            path: "universityId",
            model: "University",
            select: "name _id",
        })
        .sort({ timestamp: -1 });
        res.status(200).json(modActivity);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get mod activities with filtering options
router.get("/get-filtered-mod-activity", async (req, res) => {
    try {
        const { universityId, campusId, userId, method, startDate, endDate, page = 1, limit = 50 } = req.query;
        
        let filter = {};
        
        if (universityId) filter.universityId = universityId;
        if (campusId) filter.campusId = campusId;
        if (userId) filter.userId = userId;
        if (method) filter.method = method;
        
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        const skip = (page - 1) * limit;
        
        const modActivity = await ModActivity.find(filter)
            .populate({
                path: "userId",
                model: "User",
                select: "name username profile.picture _id",
            })
            .populate({
                path: "campusId",
                model: "Campus",
                select: "name _id",
            })
            .populate({
                path: "universityId",
                model: "University",
                select: "name _id",
            })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalCount = await ModActivity.countDocuments(filter);
        
        res.status(200).json({
            data: modActivity,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete mod activity log (for super admin)
router.delete("/delete-mod-activity/:id", async (req, res) => {
    try {
        const modActivity = await ModActivity.findByIdAndDelete(req.params.id);
        if (!modActivity) {
            return res.status(404).json({ message: "Mod activity not found" });
        }
        res.status(200).json({ message: "Mod activity deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Undo a mod activity
router.post("/undo-mod-activity/:activityId", async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { activityId } = req.params;
        const { reason } = req.body;
        const { userId } = getUserDetails(req);

        // Find the activity
        const activity = await ModActivity.findById(activityId).session(session);
        if (!activity) {
            await session.abortTransaction();
            return res.status(404).json({ message: "Activity not found" });
        }

        // Check if already undone
        if (activity.isUndone) {
            await session.abortTransaction();
            return res.status(400).json({ message: "Activity has already been undone" });
        }

        // Check if it can be undone
        if (!activity.canBeUndone) {
            await session.abortTransaction();
            return res.status(400).json({ message: "This activity cannot be undone" });
        }

        // Analyze the activity and perform the undo action
        const undoResult = await performUndoAction(activity, session);
        
        if (!undoResult.success) {
            await session.abortTransaction();
            return res.status(400).json({ message: undoResult.message });
        }

        // Mark the activity as undone
        activity.isUndone = true;
        activity.undoneAt = new Date();
        activity.undoneBy = userId;
        activity.undoReason = reason || 'Undone by super admin';
        activity.undoAttempts = (activity.undoAttempts || 0) + 1;
        await activity.save({ session });

        // Log the undo action as a new activity
        const undoActivity = new ModActivity({
            userId: userId,
            method: 'POST',
            endpoint: `/api/super/mod/undo-mod-activity/${activityId}`,
            role: 'super',
            body: { reason, originalActivityId: activityId },
            query: {},
            ip: req.ip,
            campusId: activity.campusId,
            universityId: activity.universityId,
            canBeUndone: false, // Undo actions cannot be undone
        });
        await undoActivity.save({ session });

        await session.commitTransaction();
        res.status(200).json({ 
            message: "Activity undone successfully",
            undoDetails: undoResult.details
        });
    } catch (error) {
        await session.abortTransaction();
        console.error("Error undoing mod activity:", error);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        session.endSession();
    }
});

// Helper function to perform the actual undo action
async function performUndoAction(activity, session) {
    const { method, endpoint, body, query } = activity;
    
    try {
        // Teacher review/feedback hide actions
        if (endpoint.includes('/teacher/reviews/feedbacks/hide') && method === 'PUT') {
            const { teacherId, reviewId } = body;
            const review = await TeacherRating.findOneAndUpdate(
                { teacherId, _id: reviewId },
                { 
                    hiddenByMod: false, 
                    $unset: { reason: 1 }
                },
                { session }
            );
            if (!review) {
                return { success: false, message: "Review not found for undo" };
            }
            
            // Restore the review to teacher's rating calculation
            const teacher = await Teacher.findById(teacherId).session(session);
            if (teacher) {
                teacher.ratingsByStudents.push(review._id);
                // Recalculate rating
                const allReviews = await TeacherRating.find({ teacherId, hiddenByMod: { $ne: true } }).session(session);
                const averageRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
                teacher.rating = averageRating || 0;
                await teacher.save({ session });
            }
            
            return { success: true, details: "Teacher review unhidden and rating recalculated" };
        }
        
        // Teacher feedback reply hide actions
        if (endpoint.includes('/teacher/reply/feedback/hide') && method === 'PUT') {
            const { feedbackReviewId } = query;
            const feedback = await FeedBackCommentTeacher.findByIdAndUpdate(
                feedbackReviewId,
                { 
                    hiddenByMod: false, 
                    $unset: { reason: 1 }
                },
                { session }
            );
            if (!feedback) {
                return { success: false, message: "Feedback not found for undo" };
            }
            return { success: true, details: "Feedback reply unhidden" };
        }
        
        // Teacher feedback reply reply hide actions
        if (endpoint.includes('/teacher/reply/reply/feedback/hide') && method === 'PUT') {
            const { feedbackCommentId } = query;
            const feedback = await FeedBackCommentTeacher.findByIdAndUpdate(
                feedbackCommentId,
                { 
                    hiddenByMod: false, 
                    $unset: { reason: 1 }
                },
                { session }
            );
            if (!feedback) {
                return { success: false, message: "Feedback comment not found for undo" };
            }
            return { success: true, details: "Feedback comment unhidden" };
        }
        
        // Teacher hide actions
        if (endpoint.includes('/teacher/hide') && method === 'PUT') {
            const { teacherId } = query;
            const teacher = await Teacher.findByIdAndUpdate(
                teacherId,
                { 
                    hiddenByMod: false, 
                    $unset: { reason: 1 }
                },
                { session }
            );
            if (!teacher) {
                return { success: false, message: "Teacher not found for undo" };
            }
            return { success: true, details: "Teacher unhidden" };
        }
        
        // Teacher un-hide actions (reverse by hiding again)
        if (endpoint.includes('/teacher/un-hide') && method === 'PUT') {
            const { teacherId } = query;
            const teacher = await Teacher.findByIdAndUpdate(
                teacherId,
                { 
                    hiddenByMod: true, 
                    reason: "Restored to hidden state by super admin undo"
                },
                { session }
            );
            if (!teacher) {
                return { success: false, message: "Teacher not found for undo" };
            }
            return { success: true, details: "Teacher hidden again (undoing unhide action)" };
        }
        
        // Society hide actions
        if (endpoint.includes('/society/hide/') && method === 'GET') {
            const societyId = endpoint.split('/society/hide/')[1];
            const society = await Society.findByIdAndUpdate(
                societyId,
                { 
                    hiddenByMod: false, 
                    $unset: { reason: 1 }
                },
                { session }
            );
            if (!society) {
                return { success: false, message: "Society not found for undo" };
            }
            return { success: true, details: "Society unhidden" };
        }
        
        // If no matching action found
        return { success: false, message: "Cannot determine how to undo this action" };
        
    } catch (error) {
        console.error("Error in performUndoAction:", error);
        return { success: false, message: "Error performing undo action: " + error.message };
    }
}

module.exports = router;