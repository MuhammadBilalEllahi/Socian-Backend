const express = require("express");
const User = require("../../models/user/user.model");
const Campus = require("../../models/university/campus.university.model");
const University = require("../../models/university/university.register.model");
const Society = require("../../models/society/society.model");
const Subject = require("../../models/university/department/subject/subject.department.model");
const { PastPaper } = require("../../models/university/papers/pastpaper.model");
// PastpapersCollectionByYear

const {PastPaperItem} = require("../../models/university/papers/pastpaper.item.model");
const router = express.Router();
const redisClient = require("../../db/reddis");
const { getUserDetails } = require("../../utils/utils");
const mongoose = require("mongoose");
const { PastpapersCollectionByYear } = require("../../models/university/papers/paper.collection.model");

const campusRouter = require('./campus.route');
const univeristyRouter = require('./university.route');
const societyRouter = require('./societies.route');
const usersRouter = require('./users.route');
const teachersRouter = require('./teachers.route')
const Department = require("../../models/university/department/department.university.model");
const Teacher = require("../../models/university/teacher/teacher.model");
const FeedBackCommentTeacher = require("../../models/university/teacher/feedback.rating.teacher.model");
const TeacherRating = require("../../models/university/teacher/rating.teacher.model");
const { uploadPostMedia } = require("../../utils/aws.bucket.utils");
const SocietyPostAndCommentVote = require("../../models/society/post/vote/vote.post.community.model");
const PostCommentCollection = require("../../models/society/post/comment/post.comment.collect.model");
const Post = require("../../models/society/post/post.model");
const { upload } = require("../../utils/multer.utils");

router.use('/campus', campusRouter);
router.use('/university', univeristyRouter);
router.use('/societies', societyRouter);
router.use('/users', usersRouter)
router.use('/teachers',teachersRouter);


router.post("/post/create", upload.array('file'), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { userId,role,super_role   } = getUserDetails(req);
        

        const { title, body, author = userId, campusOrigin, universityOrigin  } = req.body;
        const files = req.files;

        console.log("/create- post admin ", { title, body, files, author });

        if (!title || !author) {
            return res.status(400).json("Title and author are required");
        }
        if (!body && !files) {
            return res.status(400).json({ message: 'Body or image/video is required' });
        }

        let postContent = {
            title: title,
            author: author,
            postByAdmin: true,
            "references.role": role,
            "references.campusOrigin": campusOrigin,
            "references.universityOrigin": universityOrigin,
        };

        if (body) {
            postContent.body = body;
        }
        if (files && files.length > 0) {
            let mediaArray = [];
            for (let file of files) {
                const { url, type } = await uploadPostMedia(userId, file, req);
                mediaArray.push({ type, url });
            }
            postContent.media = mediaArray;
        }
        postContent.isPersonalPost = true; // Mark as personal post

        const post = new Post(postContent);
        await post.save({ session });

        const postCommentId = new SocietyPostAndCommentVote({
            postId: post._id,
        });
        await postCommentId.save({ session });
        post.voteId = postCommentId._id;

        const postCommentCollection = new PostCommentCollection({
            _id: post._id,
        });
        await postCommentCollection.save({ session });
        post.comments = postCommentCollection._id;

        await post.save({ session });

        const user = await User.findByIdAndUpdate(
            { _id: userId },
            { $addToSet: { "profile.posts": post._id } },
            { new: true, session }
        );
        if (!user) return res.status(409).json({ error: "User not found" });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "Post Created", postId: post._id, postTitle: post.title });
    } catch (error) {
        console.error("Error in /create-indiv", error);
        await session.abortTransaction();
        session.endSession();
        res.status(500).json("Internal Server Error");
    }
});



router.get('/admin/posts/all', async (req, res) => {
  try {
   
    const allPosts = await Post.find(      {postByAdmin: true})
      .sort({ createdAt: -1 })
      .populate("author", "name username")
      .lean();

    if (!allPosts) {
      return res.status(404).json({ message: "No active admin post found" });
    }

    return res.status(200).json({ post: allPosts || [] });
  } catch (error) {
    console.error("Error fetching latest admin post:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put('/post/archive/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    // Optional: you can check if the user making the request is an admin here
    // e.g., if (!req.user?.roles.includes("admin")) return res.status(403).json({ message: "Unauthorized" });

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $set: { "adminSetStatus.isArchived": true } },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.status(200).json({ message: "Post archived successfully", post: updatedPost });
  } catch (error) {
    console.error("Error archiving post:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put('/post/unarchive/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    // Optional: you can check if the user making the request is an admin here
    // e.g., if (!req.user?.roles.includes("admin")) return res.status(403).json({ message: "Unauthorized" });

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $set: { "adminSetStatus.isArchived": false } },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.status(200).json({ message: "Post unarchived successfully", post: updatedPost });
  } catch (error) {
    console.error("Error archiving post:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});


router.get("/all-users", async (req, res) => {
  try {
    const users = await User.find();

    return res.status(200).json(users);
  } catch (error) {
    console.error("Error in ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/all-campuses", async (req, res) => {
  try {
    const campus = await Campus.find().populate("universityOrigin users departments society subSociety");
console.log("DATA", JSON.stringify(campus, null, 2))
    return res.status(200).json(campus);
  } catch (error) {
    console.error("Error in ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/all-universities", async (req, res) => {
  try {
    const univeristy = await University.find();

    return res.status(200).json(univeristy);
  } catch (error) {
    console.error("Error in ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/***
 * @param {role} String  Find Societies based on role
 * @param {id} uuid  society Id
 */
router.post("/role-based/:id", async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  try {
    if (!role) return res.status(404).json("role required")
    const society = await Society.findOne({ _id: id }, { 'references.role': role })

    if (!society) return res.status(404).json("no society found in " + role)
    res.status(200).json(society)
  } catch (error) {
    console.error("Error in society.route.js ", error);
    res.status(500).json("Internal Server Error");
  }
});



/***
 * @param {role} String  Find ALL - Societies based on role
 * 
 */
router.post("/role-based/all", async (req, res) => {
  const { role } = req.body;

  try {
    if (!role) return res.status(404).json("role required")
    const society = await Society.find({ 'references.role': role })

    if (!society) return res.status(404).json("no society found in " + role)
    res.status(200).json(society)
  } catch (error) {
    console.error("Error in society.route.js ", error);
    res.status(500).json("Internal Server Error");
  }
});




// GET SOCITIES FROM -- One campus
router.get("/:campusId", async (req, res) => {
  const { campusId } = req.params;
  try {
    const society = await Society.find({ 'references.campusId': campusId })

    if (!society) return res.status(404).json("no societies found")
    res.status(200).json(society)
  } catch (error) {
    console.error("Error in society.route.js ", error);
    res.status(500).json("Internal Server Error");
  }
});

// GET SOCITIES FROM -- one uni
router.get("/:universityId", async (req, res) => {
  const { universityId } = req.params;
  try {
    const society = await Society.find({ 'references.universityOrigin': universityId })

    if (!society) return res.status(404).json("no societies found")
    res.status(200).json(society)
  } catch (error) {
    console.error("Error in society.route.js ", error);
    res.status(500).json("Internal Server Error");
  }
});


// GET ANY ONE SOCIETY
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const society = await Society.findOne({ _id: id })

    if (!society) return res.status(404).json("no society found")
    res.status(200).json(society)
  } catch (error) {
    console.error("Error in society.route.js ", error);
    res.status(500).json("Internal Server Error");
  }
});






router.post("/pastpaper/upload/types", async (req, res) => {
  const {universityOrigin, campusOrigin, userId,year, type, term, termMode, paperName, pdfUrl, teachers, subjectId, departmentId, sessionType } = req.body;
  // const { universityOrigin, campusOrigin, userId } = getUserDetails(req);

  console.log("Data: ",universityOrigin, campusOrigin, userId, departmentId, subjectId, year, type, term, termMode, paperName, pdfUrl, teachers, sessionType)
  // return res.status(200).json({message: "success"})
  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the subject and validate
      const findSubject = await Subject.findOne({
        _id: subjectId,
        'references.departmentId': departmentId,
        'references.universityOrigin': universityOrigin,
        'references.campusOrigin': campusOrigin,
      }).session(session);

      if (!findSubject) {
        throw new Error("No such subject found");
      }

      // First, create or find the PastPaper document to get its ID
      let pastPaper = await PastPaper.findOne({
        'references.subjectId': subjectId,
        academicYear: parseInt(year)
      }).session(session);

      if (!pastPaper) {
        pastPaper = new PastPaper({
          academicYear: parseInt(year),
          references: {
            subjectId,
            universityOrigin,
            campusOrigin
          },
          papers: []
        });
        await pastPaper.save({ session });
      }

      console.log("Past Paper ID:", pastPaper);
      let paperItemExistsAndAdded = await PastPaperItem.findOneAndUpdate({
        subjectId,
        type: type.toUpperCase(),
        academicYear: parseInt(year),
        term: term ? term.toUpperCase() : undefined,
        category: termMode ? termMode.toUpperCase() : undefined,
        sessionType: sessionType ? sessionType : undefined
      }, 
    {
      $push: {
        files:{
          teachers: teachers || [],
          uploadedBy: userId,
          url: pdfUrl,
          uploadedAt: new Date()
        }
      }
    },
  ).session(session);
  if(paperItemExistsAndAdded) {
    // Paper item already exists, just update the files array
    await session.commitTransaction();
    return res.status(200).json({
      message: `file added* successfully to ${type} that already exists`,
      pastPaperItem: paperItemExistsAndAdded,
      pastPaper,
      collection: null
    }
  )
}
      // Create new PastPaperItem with paperId
      const pastPaperItem = new PastPaperItem({
        sessionType: sessionType ? sessionType : undefined,
        paperId: pastPaper._id, // Set the paperId to reference the PastPaper document
        subjectId,
        name: paperName,
        type: type.toUpperCase(),
        category: termMode ? termMode.toUpperCase() : undefined,
        term: term ? term.toUpperCase() : undefined,
        academicYear: parseInt(year),
        
        // file: {
        //   uploadedBy: userId,
        //   url: pdfUrl,
        //   uploadedAt: new Date()
        // },
        // $push: {
          files:[{
            teachers: teachers || [],
            uploadedBy: userId,
            url: pdfUrl,
            uploadedAt: new Date()
          }],
        // },
        references: {
          universityOrigin,
          campusOrigin,
          departmentId
        }
      });

      // Save the PastPaperItem
      await pastPaperItem.save({ session });

      // Add paper reference to pastpaper document
      pastPaper.papers.push(pastPaperItem._id);
      await pastPaper.save({ session });

      // Update or create collection reference
      let collection = await PastpapersCollectionByYear.findById(subjectId).session(session);
      if (!collection) {
        collection = new PastpapersCollectionByYear({
          _id: subjectId,
          references: {
            subjectId,
            universityOrigin,
            campusOrigin
          },
          pastpapers: [pastPaper._id]
        });
      } else if (!collection.pastpapers.includes(pastPaper._id)) {
        collection.pastpapers.push(pastPaper._id);
      }

      // Update collection stats
      collection.stats.totalPapers = collection.pastpapers.length;
      collection.stats.lastUpdated = new Date();
      await collection.save({ session });

      // Invalidate cache
      const cacheKeys = [
        `pastpapers_${subjectId}`,
        `paper_${type.toLowerCase()}_${subjectId}`,
        `all_papers_${subjectId}`
      ];
      await Promise.all(cacheKeys.map(key => redisClient.del(key)));

      await session.commitTransaction();

      res.status(200).json({
        message: `${type} added successfully`,
        pastPaperItem,
        pastPaper,
        collection
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Error adding paper:', error);
    res.status(500).json({ message: error.message });
  }
});


// ? DEPARTMENT
router.post("/department/", async (req, res) => {
  const { name, universityId, campusId } = req.body;
  try {
    if (!name || !universityId || !campusId)
      return res
        .status(400)
        .json({ message: "name, universityId, campusId  are required" });
    if (name === "" || universityId === "" || campusId === "")
      return res
        .status(400)
        .json({ message: "name, universityId, campusId  are required" });

    const findUni = await University.findOne({ _id: universityId });
    if (!findUni)
      return res.status(404).json({ message: "no such University found" });

    const findCampus = await Campus.findOne({
      _id: campusId,
      universityOrigin: universityId,
    });
    if (!findCampus)
      return res.status(404).json({ message: "no such Campus found" });

    const department = await Department.findOne({
      name: name,
      "references.universityOrigin": universityId,
      "references.campusOrigin": campusId,
    });
    if (department)
      return res.status(300).json({ message: "Department already exists" });

    const departmentCreated = await Department.create({
      name: name,
      "references.universityOrigin": universityId,
      "references.campusOrigin": campusId,
    });

    departmentCreated.save();

    findCampus.departments.push(departmentCreated);
    findCampus.save();

    const cacheKey = `campus_and_subjects-${campusId}`;
    await redisClient.del(cacheKey);

    res.status(200).json({ message: departmentCreated });
  } catch (error) {
    console.error("Error in department:", error);
    res.status(500).json({ message: error.message });
  }
});


// ? SUBJECT
// creates a subject then create a pastpaper id and attach to subject [default]

router.post("/subject/create", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { name, departmentId, universityOrigin, campusOrigin } = req.body;

    const findUni = await University.findOne({ _id: universityOrigin }).session(session);
    if (!findUni) {
      await session.abortTransaction();
      return res.status(404).json({ message: "No such University found" });
    }

    const findCampus = await Campus.findOne({
      _id: campusOrigin,
      universityOrigin: universityOrigin,
    }).session(session);
    if (!findCampus) {
      await session.abortTransaction();
      return res.status(404).json({ message: "No such Campus found" });
    }

    if (!findCampus.academic?.FormatType) {
      await session.abortTransaction();
      return res
        .status(302)
        .json({ message: "Please complete university academic format to continue" });
    }

    const findDepartment = await Department.findOne({
      _id: departmentId,
      "references.campusOrigin": campusOrigin,
      "references.universityOrigin": universityOrigin,
    }).session(session);
    if (!findDepartment) {
      await session.abortTransaction();
      return res.status(404).json({ message: "No such Department found" });
    }

    const subject = await Subject.create([{
      name: name,
      "references.departmentId": departmentId,
      "references.universityOrigin": universityOrigin,
      "references.campusOrigin": campusOrigin,
    }], { session });

    const createPastpaperCollectionByYear =
      await PastpapersCollectionByYear.create([{
        _id: subject[0]._id,
        type: findCampus.academic.FormatType,
        references: {
          universityOrigin: findUni._id,
          subjectId: subject[0]._id,
          campusOrigin: findCampus._id,
        },
      }], { session });

    subject[0].pastpapersCollectionByYear = subject[0]._id;
    await subject[0].save({ session });

    findDepartment.subjects.push(subject[0]._id);
    await findDepartment.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json(subject[0]);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in subject creation:", error);
    return res.status(500).json({ message: error.message });
  }
});





module.exports = router;
