const express = require("express");
const Subject = require("../../../models/university/department/subject/subject.department.model");
const University = require("../../../models/university/university.register.model");
const Campus = require("../../../models/university/campus.university.model");
const Department = require("../../../models/university/department/department.university.model");
const Teacher = require("../../../models/university/teacher/teacher.model");
const router = express.Router();
const UserReviewTeacherVote = require("../../../models/university/teacher/teacher.user.review.vote");
const TeacherRating = require("../../../models/university/teacher/rating.teacher.model");
const { default: mongoose } = require("mongoose");

// router.get("/teachers-by-campus", async (req, res) => {
//   try {
//     const user = req.session.user;

//     const campusLocation = user.university.campusId;
//     if (!campusLocation) return;
//     // console.log("campusLocation", campusLocation)
//     const findCampus = await Campus.findOne({ _id: campusLocation });
//     if (!findCampus)
//       return res.status(404).json({ error: "Error finding campus" });
//     // console.log("findCampus", findCampus)
//     const userInfo = await findCampus.populate("teachers");
//     // console.log("teachers", userInfo)
//     const teachers = userInfo.teachers;

//     // const teacherFullInfo = await teachers.populate([
//     //     { path: 'department', select: 'name' },
//     //     { path: 'campusOrigin', select: 'name' },
//     //     { path: 'universityOrigin', select: 'name' },
//     // ])
//     res.status(200).json(teachers);
//   } catch (error) {
//     console.error("Error in teacher:", error);
//     res.status(500).json({ message: error.message });
//   }
// });



router.get("/teachers-by-campus", async (req, res) => {
  try {
    const user = req.session.user;

    const campusLocation = user.university.campusId;
    if (!campusLocation) return res.status(400).json({ error: "Campus location not provided" });

    const findCampus = await Campus.findOne({ _id: campusLocation });
    if (!findCampus) return res.status(404).json({ error: "Error finding campus" });

    const teachers = await Teacher.find({ campusOrigin: campusLocation })
      .populate({
        path: "ratingsByStudents",
        select: "comment upvoteCount userId",
        match: { isDeleted: false },
        options: { sort: { upvoteCount: -1 }, limit: 1 },
      })
      .lean();


    const result = teachers.map((teacher) => {
      const topRating = teacher.ratingsByStudents?.[0] || null;
      return {
        ...teacher,
        topComment: topRating ? topRating.comment : null,
        topCommentUser: topRating ? topRating.userId : null,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in teacher:", error);
    res.status(500).json({ message: error.message });
  }
});









router.post("/", async (req, res) => {
  const { name, departmentId, universityOrigin, campusOrigin } = req.body;
  try {
    const findUni = await University.findOne({ _id: universityOrigin });
    if (!findUni)
      return res.status(404).json({ message: "no such University found" });

    const findCampus = await Campus.findOne({
      _id: campusOrigin,
      universityOrigin: universityOrigin,
    });
    if (!findCampus)
      return res.status(404).json({ message: "no such Campus found" });

    const findDepartment = await Department.findOne({
      _id: departmentId,
      "references.campusOrigin": campusOrigin,
      "references.universityOrigin": universityOrigin,
    });
    if (!findDepartment)
      return res.status(404).json({ message: "no such Department found" });

    const teacher = await Teacher.create({
      name: name,
      "department.name": findDepartment.name,
      "department.departmentId": departmentId,
      universityOrigin: universityOrigin,
      campusOrigin: campusOrigin,
    });

    teacher.save();

    findDepartment.teachers.push(teacher);
    findCampus.teachers.push(teacher);

    findDepartment.save();
    findCampus.save();

    if (!teacher)
      return res.status(502).json({ error: "Failed to create teacher" });

    res.status(200).json(teacher);
  } catch (error) {
    console.error("Error in teacher:", error);
    res.status(500).json({ message: error.message });
  }
});

// router.post("/add-teachers-to-teacher", async (req, res) => {
//     try {

//     } catch (error) {
//         console.error('Error in teacher:', error);
//         res.status(500).json({ message: error.message });
//     }
// })
// router.post("/add-teachers", async (req, res) => {
//     try {

//     } catch (error) {
//         console.error('Error in teacher:', error);
//         res.status(500).json({ message: error.message });
//     }
// })

router.get("/info", async (req, res) => {
  const { id } = req.query;
  // console.log("info id", id);
  try {
    const teacher = await Teacher.findById(id).populate({
      path: "department.departmentId campusOrigin",
    });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    // console.log(teacher)
    res.status(200).json(teacher);
  } catch (error) {
    console.error("Error In teacherSpeficicInfo", {
      message: "Server error",
      error: error.message,
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/reviews/comments", async (req, res) => {
  const { id } = req.query;
  // console.log(id, ":in review commetn");
  try {
    const teacher = await Teacher.findById(id).populate({
      path: "ratingsByStudents",
      populate: {
        path: "userId",
        select:
          "_id name username personalEmail universityEmail profile universityEmailVerified personalEmailVerified",
      },
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // console.log("Teacher: ", teacher);

    const populatedRatings = await Promise.all(
      teacher.ratingsByStudents.map(async (review) => {
        let userIdData;
        if (review.userId) {
          userIdData = {
            _id: review.userId._id,
            name: review.userId.name,
            personalEmail: review.userId.personalEmail,
            universityEmail: review.userId.universityEmail,
            profilePic: review.userId.profilePic,
            universityEmailVerified: review.userId.universityEmailVerified,
            personalEmailVerified: review.userId.personalEmailVerified,
          };
        } else {
          userIdData = {
            _id: null,
            name: "[deleted]",
            personalEmail: "[deleted]",
            universityEmail: "[deleted]",
            profilePic: "[deleted]",
            universityEmailVerified: false,
            personalEmailVerified: false,
          };
        }
        // console.log("user data", userIdData);

        const userVote = await UserReviewTeacherVote.findOne({
          reviewId: review._id,
          userId: review.userId?._id,
        });
        // console.log("first time null ", userVote);

        return {
          rating: review.rating,
          comment: review.comment,
          __v: review.__v,
          _id: review._id,
          upvoteCount: review.upvoteCount,
          downvoteCount: review.downvoteCount * -1,
          updatedAt: review.updatedAt,
          userId: userIdData,
          hideUser: review.hideUser,
          userVote: userVote ? userVote.voteType : "none",
        };
      })
    );

    // console.log("pop rate", populatedRatings);
    res.status(200).json(populatedRatings);
  } catch (err) {
    console.error("error", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/rate", async (req, res) => {
  const { teacherId, userId, rating, comment, hideUser = false } = req.body;

  if (!teacherId || !userId || rating === undefined) {
    return res.status(400).send("Missing required fields");
  }

  try {
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).send("Teacher not found");
    }

    let existingRating = await TeacherRating.findOne({ teacherId, userId });
    // console.log("existing?", existingRating);
    if (existingRating) {
      existingRating.rating = rating;
      existingRating.comment = comment;
      existingRating.__v += 1;
      existingRating.hideUser = hideUser;
      existingRating.upvoteCount = 0;
      existingRating.downvoteCount = 0;
      await existingRating.save();
    } else {
      existingRating = new TeacherRating({
        teacherId,
        userId,
        rating,
        comment,
        hideUser,
      });
      existingRating.save();
      teacher.ratingsByStudents.push(existingRating._id);

      await teacher.save();
    }
    // const teacherIdObj = new mongoose.Types.ObjectId(teacherId);

    const [sumRatings] = await TeacherRating.aggregate([
      { $match: { teacherId: teacher._id } },
      { $group: { _id: null, total: { $sum: "$rating" }, count: { $sum: 1 } } },
    ]);

    const averageRating = sumRatings ? sumRatings.total / sumRatings.count : 0;
    teacher.rating = averageRating;

    // console.log("This is Teacher rating:", teacher.rating, "and average: ", averageRating, "sum ", sumRatings)

    await teacher.save();

    res.status(200).send("Rating processed successfully");
  } catch (err) {
    console.error(err);
    res.status(500).json({ "Server error": err.message });
  }
});

router.post("/reviews/comments/vote", async (req, res) => {
  const { reviewId, userId, voteType } = req.body;

  if (!reviewId || !userId || !voteType) {
    return res.status(400).send("Missing required fields");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const review = await TeacherRating.findById(reviewId).session(session);
    if (!review) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).send("Review not found");
    }

    const existingVote = await UserReviewTeacherVote.findOne({
      reviewId,
      userId,
    }).session(session);

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        review[voteType === "upvote" ? "upvoteCount" : "downvoteCount"]--;
        await UserReviewTeacherVote.deleteOne({
          _id: existingVote._id,
        }).session(session);
      } else {
        review[
          existingVote.voteType === "upvote" ? "upvoteCount" : "downvoteCount"
        ]--;
        review[voteType === "upvote" ? "upvoteCount" : "downvoteCount"]++;
        existingVote.voteType = voteType;
        await existingVote.save();
      }
    } else {
      review[voteType === "upvote" ? "upvoteCount" : "downvoteCount"]++;
      await UserReviewTeacherVote.create([{ reviewId, userId, voteType }], {
        session,
      });
    }

    await review.save();
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      upvoteCount: review.upvoteCount,
      downvoteCount: review.downvoteCount * -1,
    });
  } catch (error) {
    console.error("Error updating vote:", error);
    await session.abortTransaction();
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/reviews/comments/delete", async (req, res) => {
  const { teacherId, userId } = req.body;

  if (!teacherId || !userId) {
    return res.status(400).send("Missing required fields");
  }

  try {
    const review = await TeacherRating.findOneAndDelete({ teacherId, userId });

    if (!review) {
      return res.status(404).send("Review not found");
    }

    const teacher = await Teacher.findById(teacherId);
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

      await teacher.save();
    }

    res.status(200).send("Review deleted successfully");
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ error: "Server error" });
  }
});

const getTeacherReviews = async (req, res) => {
  const { id } = req.query;

  try {
    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    res.status(200).json(teacher);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = router;
