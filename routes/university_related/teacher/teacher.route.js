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
// const redisClient = require('../../../db/reddis');
const FeedBackCommentTeacher = require("../../../models/university/teacher/feedback.rating.teacher.model");

const axios = require('axios');







router.get("/campus/teachers", async (req, res) => {
  try {

    const { user, userId, role, universityOrigin, campusOrigin, departmentId } = getUserDetails(req);
    console.log("Campus Origin", user, userId, role, universityOrigin, campusOrigin, departmentId)

    // const cacheKey = `campus_teachers_${campusOrigin}`;
    // const cachedData = await redisClient.get(cacheKey);
    // if (cachedData) {
    //   console.log("Cache hit: campus teachers");
    //   return res.status(200).json(JSON.parse(cachedData))
    // }

    if (!campusOrigin) return res.status(400).json({ error: "Campus location not provided" });

    const findCampus = await Campus.findOne({ _id: campusOrigin });
    if (!findCampus) return res.status(404).json({ error: "Error finding campus" });

    const teachers = await Teacher.find({ campusOrigin: campusOrigin , hiddenByMod: false, hiddenBySuper: false })
      .populate({
        path: "ratingsByStudents",
        select: "feedback upvoteCount userId",
        match: { isDeleted: false, hiddenByMod: false , hiddenBySuper: false},
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

    // await redisClient.set(cacheKey, JSON.stringify(result), 'EX', 3600)

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in teacher:", error);
    res.status(500).json({ message: error.message });
  }
});





// CREATEBYTEACHER a TEACHER modal created by a teacher
router.post("/by/teacher/create", async (req, res) => {
  const { user, userId, role, universityOrigin, campusOrigin, departmentId , platform} = getUserDetails(req);

  console.log(user, userId, role, universityOrigin, campusOrigin, departmentId);

  if (role !== UserRoles.teacher) {
    return res.status(403).json({ error: "Your role is not Teacher" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate University
    const findUni = await University.findById(universityOrigin).session(session);
    if (!findUni) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "No such University found" });
    }

    // Validate Campus
    const findCampus = await Campus.findOne({
      _id: campusOrigin,
      universityOrigin: universityOrigin,
    }).session(session);
    if (!findCampus) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "No such Campus found" });
    }

    // Validate Department
    const findDepartment = await Department.findOne({
      _id: departmentId,
      "references.campusOrigin": campusOrigin,
      "references.universityOrigin": universityOrigin,
    }).session(session);
    if (!findDepartment) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "No such Department found" });
    }

    // Validate User
    const userExists = await User.findById(userId).session(session);
    
    if (!userExists) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "User not found" });
    }

    // Upsert Teacher Record
    const teacher = await Teacher.findOneAndUpdate(
      {
        userAttachedBool: true,
        userAttached: userExists._id,
        "userAttachedBy.by": userExists._id,
        "userAttachedBy.userType": "teacher",
      },
      {
        name: userExists.name,
        email: userExists.universityEmail,
        imageUrl: userExists.profile.picture ?? "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
        "department.name": findDepartment.name,
        "department.departmentId": departmentId,
        universityOrigin: universityOrigin,
        campusOrigin: campusOrigin,
        userAttachedBool: true,
        userAttached: userExists._id,
        "userAttachedBy.by": userExists._id,
        "userAttachedBy.userType": "teacher",
      },
      { upsert: true, new: true, session }
    );

    if (!teacher) {
      await session.abortTransaction();
      session.endSession();
      return res.status(502).json({ error: "Failed to create teacher" });
    }

    // Save Related Data
    await Promise.all([
      Department.findByIdAndUpdate(
        departmentId,
        { $push: { teachers: teacher._id } },
        { session }
      ),
      Campus.findByIdAndUpdate(
        campusOrigin,
        { $push: { teachers: teacher._id } },
        { session }
      ),
      User.findByIdAndUpdate(
        userId,
        {
          $set: {
            "teacherConnectivities.teacherModal": teacher._id,
            "teacherConnectivities.attached": true,
          },
        },
        { session }
      ),
    ]);
    console.log("BEFORE")

    if(platform === 'web'){
      // Update Session
    req.session.user.teacherConnectivities = {
      attached: true,
      teacherModal: teacher._id,
    };

    await sessionSaveHandler(req, res);
    }

    // Invalidate relevant Redis caches
    // await Promise.all([
    //   redisClient.del(`campus_teachers_${campusOrigin}`),
    //   redisClient.del(`campus_teacher_${teacher._id}`)
    // ]);

    await session.commitTransaction();
    // session.endSession();
    const data = { message: "Teacher created successfully", teacher }
    if(platform === 'app'){
      data.teacherConnectivities = {
        attached: true,
        teacherModal: teacher._id,
      }
    }

    res.status(201).json(data);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in creating teacher:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});








router.get("/info", async (req, res) => {
  const { id } = req.query;
  // console.log("info id", id);
  try {
    // const cacheKey = `campus_teacher_${id}`;
    // const cachedData = await redisClient.get(cacheKey);
    // if (cachedData) {
    //   console.log("Cache hit: teacher");
    //   return res.status(200).json(JSON.parse(cachedData))
    // }


    const teacher = await Teacher.findById(id).populate({
      path: "department.departmentId campusOrigin",
      match: {hiddenBySuper: false,hiddenByMod: false, }
    });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    // console.log(teacher)
    // await redisClient.set(cacheKey, JSON.stringify(teacher), 'EX', 36000);


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
      match: {hiddenByMod: false,hiddenBySuper: false,},
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
              match: { hiddenByMod : false, hiddenBySuper: false,},
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
      }, ],
    });

    console.log("TEACHER ", teacher)

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const populatedRatings = teacher.ratingsByStudents.map((review) => {
      // Standardize user data

      console.log("\n___________WHAT IS REVIEW_____________________\n", review)
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
        upvoteCount: review.upVotesCount || 0,
        downvoteCount: Math.abs(review.downVotesCount || 0),
        isEdited: review.isFeedbackEdited.bool || false,
        upVotesCount: review.upVotesCount || 0,
        downVotesCount: Math.abs(review.downVotesCount || 0),
        favouritedByTeacher: review.favouritedByTeacher || false,
        userVotes: review.userVotes || {},
        updatedAt: review.updatedAt,
        createdAt: review.createdAt,
        user: userData,
        isAnonymous: review.hideUser,
        teacherDirectComment: review.teacherDirectComment[review.teacherDirectComment.length - 1] || null,
        replies: processedReplies
      };
    });

    console.log("\n\n\n\n\n\n\nPOPULATED RTINGS", populatedRatings)

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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const teacher = await Teacher.findById(teacherId).session(session);
    if (!teacher) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Teacher not found" });
    }

    let existingRating = await TeacherRating.findOneAndUpdate(
      { teacherId, userId },
      {
        rating,
        feedback,
        hiddenByMod: false,
        hiddenBySuper: false,
        hideUser,
        upVotesCount: 0,
        downVotesCount: 0,
        favouritedByTeacher: false,
        replies: [],
        userVotes: {},
        isFeedbackEdited: {
          timestamp: Date.now(),
          bool: true,
        },
      },
      { new: true, runValidators: true, upsert: true, session }
    );

    if (!teacher.ratingsByStudents.includes(existingRating._id)) {
      teacher.ratingsByStudents.push(existingRating._id);
    }

    teacher.ratingsByStudentsMap.set(userId, rating);
    console.log("HERE rating", teacher.ratingsByStudentsMap)

    // Recalculate average rating
    const ratingsArray = Array.from(teacher.ratingsByStudentsMap.values());
    teacher.rating =
      ratingsArray.length > 0
        ? parseFloat((ratingsArray.reduce((acc, curr) => acc + curr, 0) / ratingsArray.length).toFixed(2))
        : 0;

    await teacher.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Invalidate relevant Redis caches
    // await Promise.all([
    //   redisClient.del(`campus_teachers_${teacher.campusOrigin}`),
    //   redisClient.del(`campus_teacher_${teacherId}`)
    // ]);



    res.status(200).json({ message: "Rating processed successfully" });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    res.status(500).json({ "Server error": err.message });
  }
});

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
      parentTeacherRatingCommentId: feedbackReviewId,
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

    res.status(201).json({ message: "Feedback reply added successfully", commentedOnaFeedback, feedBackReplyId: commentedOnaFeedback[0]._id });
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
    const { feedbackComment, gifUrl, feedbackCommentId, teacherId, replyTo, mentions } = req.body;

    console.log("reply to ", replyTo)
    const { userId } = getUserDetails(req);
    console.log("HEREHERE_2", { userId, feedbackComment, feedbackCommentId, gifUrl, teacherId, mentions })

    // Create feedback comment
    const feedBackOnAFeedback = await FeedBackCommentTeacher.create([{
      teacherId: teacherId,
      parentFeedbackCommentId: feedbackCommentId, // this one is different OK? //only pass first child id here.
      user: userId,
      comment: feedbackComment,
      gifUrl: gifUrl || '',
      mentions: mentions || [],
      replyTo: replyTo
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

    res.status(201).json({ message: "Feedback reply added successfully", feedbackCommentId, feedbackReplyId: feedBackOnAFeedback[0]._id });
  } catch (error) {
    // Rollback transaction in case of error
    await session.abortTransaction();
    session.endSession();

    console.error("Error in /reply/reply/feedback: ", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


router.put('/reply/feedback/edit', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { feedbackCommentId, feedbackComment, gifUrl, mentions } = req.body;
    const { userId } = getUserDetails(req);

    if (!userId || feedbackComment === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const updateData = {};
    if (feedbackComment !== undefined) updateData.comment = feedbackComment;
    if (gifUrl !== undefined) updateData.gifUrl = gifUrl;
    if (mentions !== undefined) updateData.mentions = mentions;

    const updated = await FeedBackCommentTeacher.findByIdAndUpdate(
      feedbackCommentId,
      { $set: updateData },
      { session, new: true }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Feedback reply updated",
      updated
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Something went wrong" });
  }
});



router.put('/reply/reply/feedback/edit', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { feedbackCommentId, feedbackComment, gifUrl, mentions } = req.body;
    const { userId } = getUserDetails(req);

    console.log(">REPLY DATA",feedbackCommentId, feedbackComment, gifUrl, mentions )

    if (!userId || feedbackComment === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const updateData = {};
    if (feedbackComment !== undefined) updateData.comment = feedbackComment;
    if (gifUrl !== undefined) updateData.gifUrl = gifUrl;
    if (mentions !== undefined) updateData.mentions = mentions;

    const updated = await FeedBackCommentTeacher.findByIdAndUpdate(
      feedbackCommentId,
      { $set: updateData },
      { session, new: true }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Reply updated",
      updated
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Something went wrong" });
  }
});


router.delete('/reply/feedback/delete', async (req, res) => {
  try {
    const { feedbackReviewId } = req.query;
    const { userId } = getUserDetails(req);

    if (!userId || !feedbackReviewId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const deleted = await FeedBackCommentTeacher.findByIdAndDelete(feedbackReviewId);

    if (!deleted) {
      return res.status(404).json({ message: "Feedback reply not found" });
    }

    res.status(200).json({ message: "Feedback reply deleted successfully", deletedId: deleted._id });
  } catch (err) {
    console.error("Delete feedback error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


router.delete('/reply/reply/feedback/delete', async (req, res) => {
  try {
    const { feedbackCommentId } = req.query;
    const { userId } = getUserDetails(req);

    if (!userId || !feedbackCommentId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const deleted = await FeedBackCommentTeacher.findByIdAndDelete(feedbackCommentId);

    if (!deleted) {
      return res.status(404).json({ message: "Reply to feedback not found" });
    }

    res.status(200).json({ message: "Reply to feedback deleted successfully", deletedId: deleted._id });
  } catch (err) {
    console.error("Delete reply error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});




router.get('/reply/feedback', async (req, res) => {
  try {

    const { feedbackCommentId } = req.query;
    const getReplies = await TeacherRating.findById(feedbackCommentId).populate([{
      path: 'replies',
      match: {hiddenByMod: false, hiddenBySuper: false,},
      populate: {
        path: 'user',
        select: 'username name profile.picture'
      }
    }]);
    if (!getReplies) return res.status(404).json({ message: "No Reply yet" })// however this operation should never initiate from frontedn

        console.log("FEEDBACK LE", JSON.stringify(getReplies?.replies[0]?.user, null, 2))

    res.status(200).json({ replies: getReplies })

  } catch (error) {
    console.error("Error in /reply/reply/feedback ", error);
    res.status(500).json({ message: "Internal Server Error" })
  }
})



router.get('/reply/reply/feedback', async (req, res) => {
  try {

    const { feedbackCommentId } = req.query;

    const getReplies = await FeedBackCommentTeacher.findById(feedbackCommentId).populate([{
      path: 'replies',
      match: {hiddenByMod: false, hiddenBySuper: false,},
      populate: [{
        path: 'user',
        select: 'username name profile.picture'
      },
      {
        path: 'replyTo',
        select: 'username name profile.picture'
      }]
    }])
    if (!getReplies) return res.status(404).json({ message: "No Reply yet" })// however this operation should never initiate from frontedn

    console.log("FEEDBACK LE", JSON.stringify(getReplies, null, 2))
    // getReplies.replies.forEach(reply => {
    //   console.log("DATA ", reply);
    // });
    res.status(200).json({ replies: getReplies })

  } catch (error) {
    console.error("Error in /reply/reply/feedback ", error);
    res.status(500).json({ message: "Internal Server Error" })
  }
})

router.post("/reviews/feedbacks/vote", async (req, res) => {
  const { reviewId, userIdOther, voteType } = req.body;
  const voteTypes = {
    upvote: "upvote",
    downvote: "downvote",
  };
  const voteTypeData = voteType.toString().toLowerCase();

  console.log("\n_________VOTE TYPE_________\n", voteTypeData, voteType , voteTypes.upvote, voteTypes.downvote, voteTypes)

  if (!reviewId || !userIdOther || !voteTypeData) {
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
    const currentVote = review.userVotes.get(userId)?.toString()?.toLowerCase() || null;

    console.log("\n ________Current Vote______\n ", currentVote, review.userVotes.get(userId), userId, review.userVotes)

    // If the user has already voted and is changing their vote
    if (currentVote !== null && currentVote !== voteTypeData) {
      const updateOps = {
        $set: { [`userVotes.${userId}`]: voteTypeData }
      };

      // Remove the old vote first (decrement the respective vote count)
      if (currentVote === voteTypes.upvote) {
        updateOps.$inc = { upVotesCount: -1 };
      } else if (currentVote === voteTypes.downvote) {
        updateOps.$inc = { downVotesCount: -1 };
      }

      // Apply the new vote and increment the respective vote count
      if (voteTypeData === voteTypes.upvote) {
        updateOps.$inc = { ...updateOps.$inc, upVotesCount: 1 };
      } else if (voteTypeData === voteTypes.downvote) {
        updateOps.$inc = { ...updateOps.$inc, downVotesCount: 1 };
      }

      // Perform the update with the changes
      const reviewUpdated = await TeacherRating.findOneAndUpdate({ _id: reviewId, userId: userIdOther }, updateOps, { session, new: true });

      console.log("updated review first", reviewUpdated, 
        "\n",  review.userVotes.get(userId)?.toString(),  reviewUpdated.userVotes
      )
      
    await session.commitTransaction();
    session.endSession();

      return res.status(200).json({
        message: "Vote reprocessed successfully.",
        upVotesCount: reviewUpdated.upVotesCount,
        downVotesCount: reviewUpdated.downVotesCount,
      });
    }

    // Skip processing if the vote is unchanged
    if (currentVote === voteTypeData) {
      const updateOps = {
        $set: { [`userVotes.${userId}`]: null }
        // $unset: { [`userVotes.${userId}`]: "" }
      };

      // If the user is undoing the vote, decrement the vote count accordingly
      if (voteTypeData === voteTypes.upvote) {
        updateOps.$inc = { upVotesCount: -1 };
      } else if (voteTypeData === voteTypes.downvote) {
        updateOps.$inc = { downVotesCount: -1 };
      }

      const reviewUpdated = await TeacherRating.findOneAndUpdate({ _id: reviewId, userId: userIdOther }, updateOps, { session, new: true });
      await session.commitTransaction();
      session.endSession();

      
  console.log("updated review already reg\n", reviewUpdated, 
    "\n",  review.userVotes.get(userId)?.toString(),  review.userVotes
  )

      return res.status(200).json({
        message: "Vote already registered.",
        upVotesCount: reviewUpdated.upVotesCount,
        downVotesCount: reviewUpdated.downVotesCount,
        noneSelected: true

      });
    }

    // Handle the initial vote if the user hasn't voted yet
    const updateOps = {
      $set: { [`userVotes.${userId}`]: voteTypeData }
    };

    if (voteTypeData === voteTypes.upvote) {
      updateOps.$inc = { upVotesCount: 1 };
    } else if (voteTypeData === voteTypes.downvote) {
      updateOps.$inc = { downVotesCount: 1 };
    }

    const reviewUpdated = await TeacherRating.findOneAndUpdate({ _id: reviewId, userId: userIdOther }, updateOps, { session, new: true });


    await session.commitTransaction();
    session.endSession();

  console.log("updated review End", reviewUpdated, 
    "\n",  review.userVotes.get(userId)?.toString(),  review.userVotes
  )


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
  const { teacherId } = req.query;
  const {userId} = getUserDetails(req);
  
  console.log("FIELDS", teacherId)

  if (!teacherId || !userId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const review = await TeacherRating.findOneAndDelete({ teacherId, userId }).session(session);

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

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
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
          teacherDirectComment: review?.teacherDirectComment?.length >=0  && review.teacherDirectComment[review.teacherDirectComment.length-1] || [],
          feedback: review.feedback,
          __v: review.__v,
          _id: review._id,
          upVotesCount: review.upVotesCount,
          downVotesCount: review.downVotesCount * -1,
          updatedAt: review.updatedAt,
          favouritedByTeacher: review.favouritedByTeacher,
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


router.post('/feedback/comment/teacher', async (req, res) => {
  try {
    const {comment, ratingId} = req.body;
    console.log("comment", comment, ratingId)
    if (!comment || !ratingId) {
      return res.status(400).json({ message: "Comment and ratingId are required" });
    }
    
    const { userId , role} = getUserDetails(req);
    if(role !== UserRoles.teacher) return res.status(403).json({ message: "Your role is not Teacher" });

    const ratingTeacher= await TeacherRating.findByIdAndUpdate(
      ratingId,
      {
        $push: {
          teacherDirectComment: {
            comment,
            teacherUserId: userId
          }
        }
      },
      {
        new: true,
        timestamps: false
      }
    );
    if (!ratingTeacher) {
      return res.status(404).json({ message: "Rating not found" });
    }
    res.status(200).json({ message: "Comment added successfully" });

  } catch (error) {
    console.error("Error in /feedback/comment/teacher ", error);
    res.status(500).json({ message: "Internal Server Error" });
    
  }
})
router.post('/feedback/comment/favorite', async (req, res) => {
  try {
    const { ratingId } = req.body;

    if (!ratingId) {
      return res.status(400).json({ message: "ratingId is required" });
    }

    const { userId, role } = getUserDetails(req);
    if (role !== UserRoles.teacher) {
      return res.status(403).json({ message: "Your role is not Teacher" });
    }

    const updatedRating = await TeacherRating.findOneAndUpdate(
      { _id: ratingId },
      [
        { $set: { favouritedByTeacher: { $not: "$favouritedByTeacher" } } }
      ],
      {
        new: true,
        timestamps: false
      }
    );

    if (!updatedRating) {
      return res.status(404).json({ message: "Rating not found" });
    }
    console.log("updatedRating", updatedRating)

    res.status(200).json({ message: "Rated successfully", rating: updatedRating });

  } catch (error) {
    console.error("Error in /feedback/comment/favorite", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


router.post('subjectsTaught/add', async (req, res) => {
  try{
    const { teacherId, subjectId } = req.body;
    const { userId, role } = getUserDetails(req);

    if (role !== UserRoles.teacher) {
      return res.status(403).json({ message: "Your role is not Teacher" });
    }

    const teacher = await Teacher.findOne({userAttached: userId, _id: teacherId});
    if (!teacher) {
      return res.status(404).json({ message: "Teacher/User not attached" });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    if (teacher.subjectsTaught.includes(subjectId)) {
      return res.status(400).json({ message: "Subject already added" });
    }

    teacher.subjectsTaught.push(subjectId);
    await teacher.save();

    res.status(200).json({ message: "Subject added successfully", teacher });

  }catch(error){
    console.error("Error in /subjectsTaught/add", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
})


router.get('/all', async (req, res) => {
  const { campusId } = getUserDetails(req);

  try {
    console.log("campusId", campusId)
    const teachers = await Teacher.find({ campusOrigin: campusId }).select('name _id');
    console.log("teachers", teachers)
    if (!teachers || teachers.length === 0) {
      return res.status(404).json({ message: "No teachers found" });
    }

    return  res.status(200).json({ data: teachers });
  }
  catch (error) {
    console.error("Error in /all teachers", error);
    res.status(500).json({ message: "Internal Server Error" });
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
