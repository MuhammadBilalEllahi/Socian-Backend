const express = require('express');
const User = require('../../models/user/user.model');
const { getUserDetails } = require('../../utils/utils');
const router = express.Router();
const modCafeRouter = require('./cafe/cafe.mod.route');
const Teacher = require('../../models/university/teacher/teacher.model');
const TeacherRating = require('../../models/university/teacher/rating.teacher.model');
const mongoose = require('mongoose');


router.get('/users', async (req, res) => {
    try {
        const { campusId } = getUserDetails(req);
        const { page = 1, limit = 10 } = req.query;

        const users = await User.find({ campusId })
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

module.exports = router;