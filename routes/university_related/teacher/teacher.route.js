const express = require("express");
const Subject = require("../../../models/university/department/subject/subject.department.model");
const University = require("../../../models/university/university.register.model");
const Campus = require("../../../models/university/campus.university.model");
const Department = require("../../../models/university/department/department.university.model");
const Teacher = require("../../../models/university/teacher/teacher.model");
const router = express.Router();
const TeacherRating = require("../../../models/university/teacher/rating.teacher.model");
const { default: mongoose } = require("mongoose");
const { getUserDetails } = require("../../../utils/utils");
const UserRoles = require("../../../models/userRoles");
const User = require("../../../models/user/user.model");
const { sessionSaveHandler } = require("../../../utils/save.session");
const redisClient = require('../../../db/reddis');
const FeedBackCommentTeacher = require("../../../models/university/teacher/feedback.rating.teacher.model");

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


// GET all teachers by campus on student feedback page

router.get("/campus/teachers", async (req, res) => {
  try {

    const { user, userId, role, universityOrigin, campusOrigin, departmentId } = getUserDetails(req);
    console.log("Campus Origin", user, userId, role, universityOrigin, campusOrigin, departmentId)

    const cacheKey = `campus_teachers_${campusOrigin}`;
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log("Cache hit: campus teachers");
      return res.status(200).json(JSON.parse(cachedData))
    }

    if (!campusOrigin) return res.status(400).json({ error: "Campus location not provided" });

    const findCampus = await Campus.findOne({ _id: campusOrigin });
    if (!findCampus) return res.status(404).json({ error: "Error finding campus" });

    const teachers = await Teacher.find({ campusOrigin: campusOrigin })
      .populate({
        path: "ratingsByStudents",
        select: "feedback upvoteCount userId",
        match: { isDeleted: false },
        options: { sort: { upvoteCount: -1 }, limit: 1 },
      })
      .lean();


    const result = teachers.map((teacher) => {
      const topRating = teacher.ratingsByStudents?.[0] || null;
      return {
        ...teacher,
        topFeedback: topRating ? topRating.feedback : null,
        topFeedbackUser: topRating ? topRating.userId : null,
      };
    });

    await redisClient.set(cacheKey, JSON.stringify(result), 'EX', 3600)

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in teacher:", error);
    res.status(500).json({ message: error.message });
  }
});



router.get("/super-teachers-by-campus", async (req, res) => {
  try {

    const campusOrigin = req.query.campusId

    if (!campusOrigin) return res.status(400).json({ error: "Campus location not provided" });

    const findCampus = await Campus.findOne({ _id: campusOrigin });
    if (!findCampus) return res.status(404).json({ error: "Error finding campus" });

    const teachers = await Teacher.find({ campusOrigin: campusOrigin })
      .populate({
        path: "ratingsByStudents",
        select: "feedback upvoteCount userId",
        match: { isDeleted: false },
        options: { sort: { upvoteCount: -1 }, limit: 1 },
      })
      .lean();


    const result = teachers.map((teacher) => {
      const topRating = teacher.ratingsByStudents?.[0] || null;
      return {
        ...teacher,
        topFeedback: topRating ? topRating.feedback : null,
        topFeedbackUser: topRating ? topRating.userId : null,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in teacher:", error);
    res.status(500).json({ message: error.message });
  }
});






// // CREATEBYTEACHER a TEACHER modal created by a teacher
// router.post("/by/teacher/create", async (req, res) => {

//   const { user, userId, role, universityOrigin, campusOrigin, departmentId } = getUserDetails(req)

//   console.log(user, userId, role, universityOrigin, campusOrigin, departmentId)
//   if (!role === UserRoles.teacher) return res.status(304).json({ error: "Your role is not Teacher" })
//   try {
//     const findUni = await University.findOne({ _id: universityOrigin });
//     if (!findUni)
//       return res.status(404).json({ error: "no such University found" });

//     const findCampus = await Campus.findOne({
//       _id: campusOrigin,
//       universityOrigin: universityOrigin,
//     });
//     if (!findCampus)
//       return res.status(404).json({ error: "no such Campus found" });

//     const findDepartment = await Department.findOne({
//       _id: departmentId,
//       "references.campusOrigin": campusOrigin,
//       "references.universityOrigin": universityOrigin,
//     });
//     if (!findDepartment)
//       return res.status(404).json({ error: "no such Department found" });

//     const userExists = await User.findById(userId);

//     // addd gender also later
//     const teacher = await Teacher.findOneAndUpdate(
//       {
//         userAttachedBool: true,
//         userAttached: userId,
//         'userAttachedBy.by': userId,
//         'userAttachedBy.userType': 'teacher'
//       },
//       {
//         name: user.name,
//         email: user.universityEmail,
//         imageUrl: user.profile.picture ?? 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg',
//         "department.name": findDepartment.name,
//         "department.departmentId": departmentId,
//         universityOrigin: universityOrigin,
//         campusOrigin: campusOrigin,
//         userAttachedBool: true,
//         userAttached: userId,
//         'userAttachedBy.by': userId,
//         'userAttachedBy.userType': 'teacher'
//       }, {
//       upsert: true
//     });

//     teacher.save();

//     findDepartment.teachers.push(teacher);
//     findCampus.teachers.push(teacher);

//     findDepartment.save();
//     findCampus.save();

//     userExists.teacherConnectivities.teacherModal = teacher._id;
//     userExists.teacherConnectivities.attached = true;

//     userExists.save()


//     console.log("\nuser", userExists, "\nteacher", teacher)

//     if (!teacher)
//       return res.status(502).json({ error: "Failed to create teacher" });

//     // res.status(200).json(teacher);

//     req.session.user.teacherConnectivities = {
//       attached: user.teacherConnectivities.attached,
//       teacherModal: user.teacherConnectivities.teacherModal
//     }
//     sessionSaveHandler()
//   } catch (error) {
//     console.error("Error in teacher:", error);
//     res.status(500).json({ message: error.message });
//   }
// });


// CREATEBYTEACHER a TEACHER modal created by a teacher
router.post("/by/teacher/create", async (req, res) => {
  const { user, userId, role, universityOrigin, campusOrigin, departmentId } = getUserDetails(req);

  console.log(user, userId, role, universityOrigin, campusOrigin, departmentId);

  if (role !== UserRoles.teacher) {
    return res.status(403).json({ error: "Your role is not Teacher" });
  }

  try {
    // Validate University
    const findUni = await University.findById(universityOrigin);
    if (!findUni) return res.status(404).json({ error: "No such University found" });

    // Validate Campus
    const findCampus = await Campus.findOne({
      _id: campusOrigin,
      universityOrigin: universityOrigin,
    });
    if (!findCampus) return res.status(404).json({ error: "No such Campus found" });

    // Validate Department
    const findDepartment = await Department.findOne({
      _id: departmentId,
      "references.campusOrigin": campusOrigin,
      "references.universityOrigin": universityOrigin,
    });
    if (!findDepartment) return res.status(404).json({ error: "No such Department found" });

    // Validate User
    const userExists = await User.findById(userId);
    if (!userExists) return res.status(404).json({ error: "User not found" });

    // Upsert Teacher Record
    const teacher = await Teacher.findOneAndUpdate(
      {
        userAttachedBool: true,
        userAttached: userId,
        "userAttachedBy.by": userId,
        "userAttachedBy.userType": "teacher",
      },
      {
        name: user.name,
        email: user.universityEmail,
        imageUrl: user.profile.picture ?? "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
        "department.name": findDepartment.name,
        "department.departmentId": departmentId,
        universityOrigin: universityOrigin,
        campusOrigin: campusOrigin,
        userAttachedBool: true,
        userAttached: userId,
        "userAttachedBy.by": userId,
        "userAttachedBy.userType": "teacher",
      },
      { upsert: true, new: true }
    );

    if (!teacher) return res.status(502).json({ error: "Failed to create teacher" });

    // Save Related Data
    await Promise.all([
      teacher.save(),
      Department.findByIdAndUpdate(departmentId, { $push: { teachers: teacher._id } }),
      Campus.findByIdAndUpdate(campusOrigin, { $push: { teachers: teacher._id } }),
      User.findByIdAndUpdate(userId, {
        $set: {
          "teacherConnectivities.teacherModal": teacher._id,
          "teacherConnectivities.attached": true,
        },
      }),
    ]);

    // Update Session
    req.session.user.teacherConnectivities = {
      attached: true,
      teacherModal: teacher._id,
    };

    await sessionSaveHandler(req, res);
    // res.status(201).json({ message: "Teacher created successfully", teacher });
  } catch (error) {
    console.error("Error in creating teacher:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});






// CREATE TEACHER
router.post("/", async (req, res) => {
  const { name, email, picture, departmentId, universityOrigin, campusOrigin } = req.body;
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
      email: email,
      imageUrl: picture,
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
    const cacheKey = `campus_teacher_${id}`;
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log("Cache hit: teacher");
      return res.status(200).json(JSON.parse(cachedData))
    }


    const teacher = await Teacher.findById(id).populate({
      path: "department.departmentId campusOrigin",
    });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    // console.log(teacher)
    await redisClient.set(cacheKey, JSON.stringify(teacher), 'EX', 36000);


    res.status(200).json(teacher);
  } catch (error) {
    console.error("Error In teacherSpeficicInfo", {
      message: "Server error",
      error: error.message,
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/reviews/feedbacks", async (req, res) => {
  const { id } = req.query;
  // console.log(id, ":in review commetn");
  try {
    const teacher = await Teacher.findById(id).populate({
      path: "ratingsByStudents",
      populate: [{
        path: "userId",
        select:
          "_id name username personalEmail universityEmail profile universityEmailVerified personalEmailVerified",
      },
      {
        path: 'replies',
        populate: {
          path: 'user mentions',
          select: "_id name username"
        }
      }],
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // console.log("Teacher: ", teacher);

    const populatedRatings = await Promise.all(
      teacher.ratingsByStudents.map(async (review) => {
        let userIdData;
        // console.log("REVIEWs", review)
        if (review.userId) {
          userIdData = {
            _id: review.userId._id,
            name: review.hideUser ? 'Anonymous' : review.userId.name,
            personalEmail: review.hideUser ? 'Anonymous' : review.userId.personalEmail,
            universityEmail: review.hideUser ? 'Anonymous' : review.userId.universityEmail,
            profilePic: review.hideUser ? 'Anonymous' : review.userId.profilePic,
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

        // const userVote = await UserReviewTeacherVote.findOne({
        //   reviewId: review._id,
        //   userId: review.userId?._id,
        // });
        // console.log("first time null ", userVote);

        return {
          rating: review.rating,
          feedback: review.feedback,
          __v: review.__v,
          _id: review._id,
          upvoteCount: review.upvoteCount,
          downvoteCount: review.downvoteCount * -1,
          updatedAt: review.updatedAt,
          userId: userIdData,
          hideUser: review.hideUser,
          replies: review.replies
          // userVote: userVote ? userVote.userVotes : "none",
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

router.get("/mob/reviews/feedbacks", async (req, res) => {
  const { id } = req.query;

  try {
    const teacher = await Teacher.findById(id).populate({
      path: "ratingsByStudents",
      populate: [{
        path: "userId",
        select: "_id name username profile.picture universityEmailVerified", // Reduced fields
      },
      {
        path: 'replies',
        populate: {
          path: 'user mentions',
          select: "_id name username" // Keeping only essential fields
        }
      }],
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const populatedRatings = teacher.ratingsByStudents.map((review) => {
      // Standardize user data
      const userData = review.userId ? {
        _id: review.userId._id,
        name: review.hideUser ? 'Anonymous' : review.userId.name,
        username: review.hideUser ? null : review.userId.username,
        profilePic: review.hideUser ? null : review.userId.profile?.picture,
        isVerified: review.userId.universityEmailVerified,
      } : {
        _id: null,
        name: "[deleted]",
        username: null,
        profilePic: null,
        isVerified: false,
      };

      // Process replies to standardize their format
      const processedReplies = review.replies.map(reply => ({
        _id: reply._id,
        text: reply.text,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
        user: reply.user ? {
          _id: reply.user._id,
          name: reply.hideUser ? 'Anonymous' : reply.user.name,
          username: reply.hideUser ? null : reply.user.username,
          isVerified: reply.user.universityEmailVerified
        } : {
          _id: null,
          name: "[deleted]",
          username: null,
          isVerified: false
        },
        isAnonymous: reply.hideUser || false,
        reactions: reply.reactions || {},
        mentions: reply.mentions?.map(mention => ({
          _id: mention._id,
          name: mention.name,
          username: mention.username
        })) || []
      }));

      // Return standardized review object
      return {
        _id: review._id,
        rating: review.rating,
        feedback: review.feedback,
        upvoteCount: review.upvoteCount || 0,
        downvoteCount: Math.abs(review.downvoteCount || 0),
        updatedAt: review.updatedAt,
        createdAt: review.createdAt,
        user: userData,
        isAnonymous: review.hideUser,
        replies: processedReplies
      };
    });

    res.status(200).json(populatedRatings);
  } catch (err) {
    console.error("Error in reviews/feedbacks:", err.message);
    res.status(500).json({
      message: "Failed to fetch reviews",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});




router.post("/rate", async (req, res) => {
  const { teacherId, userId, rating, feedback, hideUser = false } = req.body;

  if (!teacherId || !userId || rating === undefined) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    let existingRating = await TeacherRating.findOne({ teacherId, userId });
    console.log("existing?", existingRating);
    if (existingRating) {
      existingRating.rating = rating;
      existingRating.feedback = feedback;
      existingRating.__v += 1;
      existingRating.hideUser = hideUser;
      existingRating.upVotesCount = 0;
      existingRating.downVotesCount = 0;
      existingRating.replies = []
      existingRating.userVotes = {}
      existingRating.isFeedbackEdited.timestamp = Date.now()
      existingRating.isFeedbackEdited.bool = true;
      await existingRating.save();
      teacher.ratingsByStudentsMap.clear()
      // teacher.save()
    } else {
      existingRating = new TeacherRating({
        teacherId,
        userId,
        rating,
        feedback,
        hideUser,
        userVotes: { userId: 'upVote' }
      });
      existingRating.save();
      teacher.ratingsByStudents.push(existingRating._id);
      teacher.ratingsByStudentsMap.set(userId, rating)
      // await teacher.save();
    }

    const ratingsArray = Array.from(teacher.ratingsByStudentsMap.values());
    const totalRatings = ratingsArray.reduce((acc, curr) => acc + curr, 0);
    const averageRating = ratingsArray.length > 0 ? totalRatings / ratingsArray.length : 0;

    teacher.rating = parseFloat(averageRating.toFixed(2));

    // console.log("This is Teacher rating:", teacher.rating, "and average: ", averageRating, "sum ", sumRatings)

    await teacher.save();

    res.status(200).json({ message: "Rating processed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ "Server error": err.message });
  }
});


// router.post('/reply/feedback', async (req, res) => {
//   try {
//     const { feedbackComment, gifUrl, feedbackId, teacherId, mentions } = req.body;
//     const { userId } = getUserDetails(req)

//     const commentedOnaFeedback = await FeedBackCommentTeacher.create({
//       teacherId: teacherId,
//       parentTeacherRatingCommentId: feedbackId,
//       user: userId,
//       comment: feedbackComment,
//       gifUrl: gifUrl || '',
//       mentions: mentions || []

//     })

//     const teacher = await Teacher.findByIdAndUpdate({teacherId}, {
//       $push: {
//         replies: [commentedOnaFeedback]
//       }
//     }, {upsert: true})

//   } catch (error) {
//     console.error("Error in /feedback/reply: ", error)
//     res.status(500).json({ message: "Internal Server Error" })
//   }
// })


router.post('/reply/feedback', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { feedbackComment, gifUrl, feedbackReviewId, teacherId, mentions } = req.body;
    const { userId } = getUserDetails(req);

    console.log("HEREHERE", { userId, feedbackComment, gifUrl, feedbackReviewId, teacherId, mentions })
    // Create feedback comment
    const commentedOnaFeedback = await FeedBackCommentTeacher.create([{
      teacherId: teacherId,
      parentTeacherRatingCommentId: feedbackReviewId, // this one is different OK?
      user: userId,
      comment: feedbackComment,
      gifUrl: gifUrl || '',
      mentions: mentions || []
    }], { session });

    if (!userId || !feedbackComment) {
      console.error("ERROR: Missing required fields", { userId, feedbackComment });
      return res.status(400).json({ message: "Missing required fields" });
    }

    console.log("commentedOnaFeedback", commentedOnaFeedback, commentedOnaFeedback[0]._id)
    // Update teacher with the new reply
    const teacherDone = await TeacherRating.findByIdAndUpdate({ _id: feedbackReviewId }, {
      $push: { replies: commentedOnaFeedback[0]._id }
    }, { session, new: true });
    console.log("DATA", teacherDone)

    if (!teacherDone) return res.status(400).json({ message: "Couldnt add to Review" });
    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: "Feedback reply added successfully", commentedOnaFeedback });
  } catch (error) {
    // Rollback transaction in case of error
    await session.abortTransaction();
    session.endSession();

    console.error("Error in /reply/feedback: ", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


router.post('/reply/reply/feedback', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { feedbackComment, gifUrl, feedbackCommentId, teacherId, mentions } = req.body;
    const { userId } = getUserDetails(req);
    console.log("HEREHERE_2", { userId, feedbackComment, feedbackCommentId, gifUrl, teacherId, mentions })

    // Create feedback comment
    const feedBackOnAFeedback = await FeedBackCommentTeacher.create([{
      teacherId: teacherId,
      parentFeedbackCommentId: feedbackCommentId, // this one is different OK? //only pass first child id here.
      user: userId,
      comment: feedbackComment,
      gifUrl: gifUrl || '',
      mentions: mentions || []
    }], { session });

    if (!userId || !feedbackComment) {
      console.error("ERROR: Missing required fields", { userId, feedbackComment });
      return res.status(400).json({ message: "Missing required fields" });
    }

    console.log("feedBackOnAFeedback", feedBackOnAFeedback, feedBackOnAFeedback[0]._id)

    // Update teacher with the new reply
    const fdeedBackCommentTeacher = await FeedBackCommentTeacher.findByIdAndUpdate(feedbackCommentId, {
      $push: { replies: feedBackOnAFeedback[0]._id }
    }, { session, upsert: true, new: true });

    console.log("new feedback", fdeedBackCommentTeacher)
    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: "Feedback reply added successfully", feedbackCommentId });
  } catch (error) {
    // Rollback transaction in case of error
    await session.abortTransaction();
    session.endSession();

    console.error("Error in /reply/reply/feedback: ", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


router.get('/reply/reply/feedback', async (req, res) => {
  try {

    const { feedbackCommentId } = req.query;
    const getReplies = await FeedBackCommentTeacher.findById(feedbackCommentId).populate([{
      path: 'replies',
      populate: {
        path: 'user',
        select: 'username name profile.picture'
      }
    }])
    if (!getReplies) return res.status(404).json({ message: "No Reply yet" })// however this operation should never initiate from frontedn

    console.log("FEEDBACK LE", getReplies)
    res.status(200).json({ replies: getReplies })

  } catch (error) {
    console.error("Error in /reply/reply/feedback ", error);
    res.status(500).json({ message: "Internal Server Error" })
  }
})



// router.post('/reply/reply/feedback', async (req, res) => {
//   try {
//     const { feedbackComment, replyTo } = req.body;
//     const { userId } = getUserDetails(req)

//     const commentedOnaFeedback = await FeedBackCommentTeacher.create()
//   } catch (error) {
//     console.error("Error in /feedback/reply: ", error)
//     res.status(500).json({ message: "Internal Server Error" })
//   }
// })


router.post("/reviews/feedbacks/vote", async (req, res) => {
  const { reviewId, userIdOther, voteType } = req.body;

  if (!reviewId || !userIdOther || !voteType) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId } = getUserDetails(req);


    const review = await TeacherRating.findOne({ _id: reviewId, userId: userIdOther }).session(session);

    if (!review) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Review not found" });
    }


    // Fetch current vote status
    const currentVote = review.userVotes.get(userId) || null;

    // If the user has already voted and is changing their vote
    if (currentVote !== null && currentVote !== voteType) {
      const updateOps = {
        $set: { [`userVotes.${userId}`]: voteType }
      };

      // Remove the old vote first (decrement the respective vote count)
      if (currentVote === 'upVote') {
        updateOps.$inc = { upVotesCount: -1 };
      } else if (currentVote === 'downVote') {
        updateOps.$inc = { downVotesCount: -1 };
      }

      // Apply the new vote and increment the respective vote count
      if (voteType === 'upVote') {
        updateOps.$inc = { ...updateOps.$inc, upVotesCount: 1 };
      } else if (voteType === 'downVote') {
        updateOps.$inc = { ...updateOps.$inc, downVotesCount: 1 };
      }

      // Perform the update with the changes
      const reviewUpdated = await TeacherRating.findOneAndUpdate({ _id: reviewId, userId: userIdOther }, updateOps, { session, new: true });

      return res.status(200).json({
        message: "Vote reprocessed successfully.",
        upVotesCount: reviewUpdated.upVotesCount,
        downVotesCount: reviewUpdated.downVotesCount,
      });
    }

    // Skip processing if the vote is unchanged
    if (currentVote === voteType) {
      const updateOps = {
        $set: { [`userVotes.${userId}`]: null }
      };

      // If the user is undoing the vote, decrement the vote count accordingly
      if (voteType === 'upVote') {
        updateOps.$inc = { upVotesCount: -1 };
      } else if (voteType === 'downVote') {
        updateOps.$inc = { downVotesCount: -1 };
      }

      const reviewUpdated = await TeacherRating.findOneAndUpdate({ _id: reviewId, userId: userIdOther }, updateOps, { session, new: true });
      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        message: "Vote already registered.",
        upVotesCount: reviewUpdated.upVotesCount,
        downVotesCount: reviewUpdated.downVotesCount,
        noneSelected: true

      });
    }

    // Handle the initial vote if the user hasn't voted yet
    const updateOps = {
      $set: { [`userVotes.${userId}`]: voteType }
    };

    if (voteType === 'upVote') {
      updateOps.$inc = { upVotesCount: 1 };
    } else if (voteType === 'downVote') {
      updateOps.$inc = { downVotesCount: 1 };
    }

    const reviewUpdated = await TeacherRating.findOneAndUpdate({ _id: reviewId, userId: userIdOther }, updateOps, { session, new: true });


    await session.commitTransaction();
    session.endSession();


    return res.status(200).json({
      message: "Vote processed successfully.",
      upVotesCount: reviewUpdated.upVotesCount,
      downVotesCount: reviewUpdated.downVotesCount,
    });


  } catch (error) {
    console.error("Error updating vote:", error);
    await session.abortTransaction();
    res.status(500).json({ error: "Server error" });
  }
});


router.delete("/reviews/feedbacks/delete", async (req, res) => {
  const { teacherId, userId } = req.body;

  if (!teacherId || !userId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const review = await TeacherRating.findOneAndDelete({ teacherId, userId });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
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

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ error: "Server error" });
  }
});


router.get('/account/feedbacks', async (req, res) => {
  const { teacherId } = req.query;
  // console.log(teacherId, ":in review commetn");
  try {
    const teacher = await Teacher.findById(teacherId).populate({
      path: "ratingsByStudents",
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // console.log("Teacher: ", teacher);

    const populatedRatings = await Promise.all(
      teacher.ratingsByStudents.map(async (review) => {
        return {
          rating: review.rating,
          feedback: review.feedback,
          __v: review.__v,
          _id: review._id,
          upVotesCount: review.upVotesCount,
          downVotesCount: review.downVotesCount * -1,
          updatedAt: review.updatedAt,
        };
      })
    );

    // console.log("pop rate", populatedRatings);
    res.status(200).json({ teacher: teacher, feedbacks: populatedRatings });
  } catch (err) {
    console.error("error", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
})
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
