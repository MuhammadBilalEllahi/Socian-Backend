const express = require('express');
const User = require('../../models/user/user.model');
const { getUserDetails } = require('../../utils/utils');
const router = express.Router();
const modCafeRouter = require('./cafe/cafe.mod.route');
const Teacher = require('../../models/university/teacher/teacher.model');
const TeacherRating = require('../../models/university/teacher/rating.teacher.model');
const mongoose = require('mongoose');
const FeedBackCommentTeacher = require('../../models/university/teacher/feedback.rating.teacher.model');
const Society = require('../../models/society/society.model');
const ModActivity = require('../../models/mod/modActivity.model');

// Get moderator's own activities
router.get('/my-activities', async (req, res) => {
    try {
        const { userId } = getUserDetails(req);
        const { page = 1, limit = 20 } = req.query;
        
        const skip = (page - 1) * limit;
        
        const activities = await ModActivity.find({ userId })
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

        const totalCount = await ModActivity.countDocuments({ userId });
        
        res.status(200).json({
            data: activities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching mod activities:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Undo moderator's own activity
router.post('/undo-my-activity/:activityId', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { activityId } = req.params;
        const { reason } = req.body;
        const { userId } = getUserDetails(req);

        // Find the activity and ensure it belongs to the current mod
        const activity = await ModActivity.findOne({ 
            _id: activityId, 
            userId: userId 
        }).session(session);
        
        if (!activity) {
            await session.abortTransaction();
            return res.status(404).json({ message: "Activity not found or you don't have permission to undo it" });
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

        // Perform the undo action
        const undoResult = await performModUndoAction(activity, session);
        
        if (!undoResult.success) {
            await session.abortTransaction();
            return res.status(400).json({ message: undoResult.message });
        }

        // Mark the activity as undone
        activity.isUndone = true;
        activity.undoneAt = new Date();
        activity.undoneBy = userId;
        activity.undoReason = reason || 'Undone by moderator';
        activity.undoAttempts = (activity.undoAttempts || 0) + 1;
        await activity.save({ session });

        // Log the undo action as a new activity
        const undoActivity = new ModActivity({
            userId: userId,
            method: 'POST',
            endpoint: `/api/mod/undo-my-activity/${activityId}`,
            role: 'mod',
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

// Helper function to perform the actual undo action for moderators
async function performModUndoAction(activity, session) {
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
                    reason: "Restored to hidden state by moderator undo"
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
        console.error("Error in performModUndoAction:", error);
        return { success: false, message: "Error performing undo action: " + error.message };
    }
}


router.get('/users', async (req, res) => {
    try {
        const { campusId } = getUserDetails(req);
        const { role } = req.body
        const { page = 1, limit = 10 } = req.query;

        const users = await User.find({ campusId, role })
            .select("name email role") // Fetch only necessary fields
            .sort({ createdAt: -1 }) // Sort by latest users first
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const totalUsers = await User.countDocuments({ campusId });

        res.status(200).json({
            users,
            totalUsers,
            totalPages: Math.ceil(totalUsers / limit),
            currentPage: Number(page),
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});



router.use('/cafe', modCafeRouter)




router.put("/teacher/reviews/feedbacks/hide", async (req, res) => {
  const { teacherId, reviewId, reason } = req.body;
  

  if (!teacherId || !reviewId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const review = await TeacherRating.findOneAndUpdate({ teacherId, _id: reviewId }, {hiddenByMod: true, reason: reason}).session(session);
console.log("REVIEW ", review?._id)
    if (!review) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Review not found" });
    }

    const teacher = await Teacher.findById(teacherId).session(session);
    if (teacher) {
      const reviewRating = review.rating;
      const totalRatings = teacher.ratingsByStudents.length;

      if (totalRatings > 1) {
        const newRating =
          (teacher.rating * totalRatings - reviewRating) / (totalRatings - 1);
        teacher.ratingsByStudents = teacher.ratingsByStudents.filter(
          (rating) => !rating.equals(review._id)
        );
        teacher.rating = newRating;
      } else {
        teacher.rating = 0;
        teacher.ratingsByStudents = [];
      }

      await teacher.save({ session });

      // Invalidate relevant Redis caches
      // await Promise.all([
      //   redisClient.del(`campus_teachers_${teacher.campusOrigin}`),
      //   redisClient.del(`campus_teacher_${teacherId}`)
      // ]);
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Review hidden successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error hiding review:", error);
    res.status(500).json({ error: "Server error" });
  }
});


router.put("/teacher/hide", async (req, res) => {
  const { teacherId } = req.query;
  const {reason} = req.body;
  try {

    const teacher = await Teacher.findByIdAndUpdate(teacherId, {reason, hiddenByMod: true});
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.status(200).json({ message: "Teacher Hidden"});
  } catch (error) {
    console.error("Error In teacherSpeficicInfo", {
      message: "Server error",
      error: error.message,
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


router.put("/teacher/un-hide", async (req, res) => {
  const { teacherId } = req.query;
  const {reason} = req.body;
  try {

    const teacher = await Teacher.findByIdAndUpdate(teacherId, {reason, hiddenByMod: false});
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.status(200).json({ message: "Teacher <UN>-Hidden"});
  } catch (error) {
    console.error("Error In teacherSpeficicInfo", {
      message: "Server error",
      error: error.message,
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
});




router.put('/teacher/reply/feedback/hide', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { feedbackReviewId } = req.query;
    const {reason} = req.body;

    // Create feedback comment
    const commentedOnaFeedback = await FeedBackCommentTeacher.findByIdAndUpdate(feedbackReviewId, {hiddenByMod: true, reason: reason}, { session });
    if(!commentedOnaFeedback){
      return res.status(402).json({error: "Feedback could not be hidden"})
    }
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: "Feedback reply hidden successfully"});
  } catch (error) {
    // Rollback transaction in case of error
    await session.abortTransaction();
    session.endSession();

    console.error("Error in /reply/feedback: ", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put('/teacher/reply/reply/feedback/hide', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { feedbackCommentId } = req.query;
    const {reason} = req.body;

    // console.log("DATA", feedbackCommentId)

    // Create feedback comment
    const commentedOnaFeedback = await FeedBackCommentTeacher.findByIdAndUpdate(feedbackCommentId, {hiddenByMod: true, reason: reason}, { session });
    if(!commentedOnaFeedback){
      return res.status(402).json({error: "Feedback could not be hidden"})
    }
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: "Feedback reply hidden successfully"});
  } catch (error) {
    // Rollback transaction in case of error
    await session.abortTransaction();
    session.endSession();

    console.error("Error in /reply/feedback: ", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


router.get("/society/hide/:id", async (req, res) => {
  
  try {
    const { id } = req.params;
  const {reason} = req.body;
    const society = await Society.findByIdAndUpdate({ _id: id }, {hiddenByMod: true, reason})

    if (!society) return res.status(404).json("no society found")
    res.status(200).json(society)
  } catch (error) {
    console.error("Error in society.route.js ", error);
    res.status(500).json("Internal Server Error");
  }
});


module.exports = router;