const express = require("express");
const User = require("../../models/user/user.model");
const Campus = require("../../models/university/campus.university.model");
const University = require("../../models/university/university.register.model");
const Society = require("../../models/society/society.model");
const Subject = require("../../models/university/department/subject/subject.department.model");
const { PastPaper } = require("../../models/university/papers/pastpaper.model");
// PastpapersCollectionByYear

const { PastPaperItem } = require("../../models/university/papers/pastpaper.item.model");
const router = express.Router();
const redisClient = require("../../db/reddis");
const { getUserDetails } = require("../../utils/utils");
const mongoose = require("mongoose");
const { PastpapersCollectionByYear } = require("../../models/university/papers/paper.collection.model");
const fs = require('fs');
const path = require('path');

const campusRouter = require('./campus.route');
const univeristyRouter = require('./university.route');
const societyRouter = require('./societies.route');
const usersRouter = require('./users.route');
const teachersRouter = require('./teachers.route');
const reportRouter = require("./report.route");
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
router.use('/teachers', teachersRouter);
router.use('/report', reportRouter);


router.post("/post/create", upload.array('file'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, role, super_role } = getUserDetails(req);


    const { title, body, author = userId, campusOrigin, universityOrigin } = req.body;
    const forCampus = req.body.forCampus === "true";
    const forUniversity = req.body.forUniversity === "true";
    const forAllUniversites = req.body.forAllUniversites === "true";

    const files = req.files;
    console.log("title", title, "body", body, "userId", userId, "campusOrigin", campusOrigin, "forCampus", forCampus, "forUniversity", forUniversity, "universityOrigin", universityOrigin, forAllUniversites)

    console.log("/create- post admin ", { title, body, files, author });

    if (!forCampus && !forUniversity && !forAllUniversites) {
      return res.status(400).json({ message: "You must select target option" });
    }

    if (forCampus) {
      if (!campusOrigin) return res.status(400).json({ message: "You must select target campus" });

    } else if (forUniversity && !universityOrigin) {
      return res.status(400).json({ message: "You must select target university" });
    }

    if (!title || !author) {
      return res.status(400).json({ message: "Title and author are required" });
    }
    if (!body && !files) {
      return res.status(400).json({ message: 'Body or image/video is required' });
    }

    let postContent = {
      title: title,
      author: author,
      postByAdmin: true,
      // "references.role": role,
    };
    if (campusOrigin && forCampus) {
      postContent.references = {};
      postContent.references.campusOrigin = campusOrigin;
      postContent.forCampus = true;
    };
    if (universityOrigin && forUniversity) {
      postContent.references = {};
      postContent.references.universityOrigin = universityOrigin;
      postContent.forUniversity = true;
    };
    if (forAllUniversites) { postContent.forAllUniversites = true; }
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

    const allPosts = await Post.find({ postByAdmin: true })
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
    const objectId = new mongoose.Types.ObjectId(postId);
    console.log("postid", postId)
    const updatedPost1 = await Post.findOne({
      _id: objectId,
      __skipHiddenAdminFilter: true
    }).lean();
    console.log("updatedPost1", updatedPost1)

    if (!updatedPost1) {
      console.log("Post not found (bypass failed)")
      return res.status(404).json({ message: "Post not found (bypass failed)" });
    }


    const updatedPost = await Post.findOneAndUpdate(
      { _id: objectId, __skipHiddenAdminFilter: true },
      { "adminSetStatus.isArchived": true },
      { new: true }
    );
    console.log("POST ", updatedPost)

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

    const updatedPost = await Post.findOneAndUpdate(
      {_id: postId, __skipHiddenAdminFilter: true,},
      {  "adminSetStatus.isArchived": false },
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
  const { universityOrigin, campusOrigin, userId, year, type, term, termMode, paperName, pdfUrl, teachers, subjectId, departmentId, sessionType } = req.body;
  // const { universityOrigin, campusOrigin, userId } = getUserDetails(req);

  console.log("Data: ", universityOrigin, campusOrigin, userId, departmentId, subjectId, year, type, term, termMode, paperName, pdfUrl, teachers, sessionType)
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
            files: {
              teachers: teachers || [],
              uploadedBy: userId,
              url: pdfUrl,
              uploadedAt: new Date()
            }
          }
        },
      ).session(session);
      if (paperItemExistsAndAdded) {
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
        files: [{
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


// LOG ANALYTICS FUNCTIONALITY
// Helper function to parse a single log line
function parseLogLine(line) {
  try {
    if (!line || !line.includes(' - ')) return null;
    
    const [timestampPart, dataPart] = line.split(' - ', 2);
    if (!timestampPart || !dataPart) return null;

    const timestamp = new Date(timestampPart);
    if (isNaN(timestamp.getTime())) return null;

    const data = {
      timestamp,
      universityEmail: null,
      deviceId: null,
      userId: null,
      route: null,
      ip: null,
      universityId: null,
      campusId: null
    };

    // Parse each field
    const fields = dataPart.split(' | ');
    fields.forEach(field => {
      const trimmedField = field.trim();
      if (trimmedField.startsWith('req.user.universityEmail:')) {
        data.universityEmail = trimmedField.replace('req.user.universityEmail:', '').trim() || null;
      } else if (trimmedField.startsWith('x_device_id:')) {
        data.deviceId = trimmedField.replace('x_device_id:', '').trim() || null;
      } else if (trimmedField.startsWith('userId:')) {
        data.userId = trimmedField.replace('userId:', '').trim() || null;
      } else if (trimmedField.startsWith('route:')) {
        data.route = trimmedField.replace('route:', '').trim() || null;
      } else if (trimmedField.startsWith('ip:')) {
        const ipPart = trimmedField.replace('ip:', '').trim();
        const ipMatch = ipPart.match(/^([^\s]+)/);
        data.ip = ipMatch ? ipMatch[1] : null;
      }
    });

    // Parse universityId and campusId from the end of the line
    const universityMatch = dataPart.match(/universtityId\s+([a-f0-9]{24})/i);
    if (universityMatch) {
      data.universityId = universityMatch[1];
    }

    const campusMatch = dataPart.match(/campusId:\s*([a-f0-9]{24})/i);
    if (campusMatch) {
      data.campusId = campusMatch[1];
    }

    return data;
  } catch (error) {
    console.error('Error parsing log line:', error);
    return null;
  }
}

// Helper function to get available log files
function getAvailableLogFiles() {
  const logsDir = path.join(__dirname, '../../logs');
  const logFiles = [];

  try {
    if (!fs.existsSync(logsDir)) return [];

    const years = fs.readdirSync(logsDir).filter(item => 
      fs.statSync(path.join(logsDir, item)).isDirectory()
    );

    years.forEach(year => {
      const yearPath = path.join(logsDir, year);
      const months = fs.readdirSync(yearPath).filter(item =>
        fs.statSync(path.join(yearPath, item)).isDirectory()
      );

      months.forEach(month => {
        const monthPath = path.join(yearPath, month);
        const files = fs.readdirSync(monthPath).filter(file => 
          file.startsWith('records-') && file.endsWith('.log')
        );

        files.forEach(file => {
          const dateMatch = file.match(/records-(\d{4}-\d{2}-\d{2})\.log/);
          if (dateMatch) {
            logFiles.push({
              date: dateMatch[1],
              year,
              month,
              file,
              path: path.join(monthPath, file)
            });
          }
        });
      });
    });

    return logFiles.sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error('Error getting log files:', error);
    return [];
  }
}

// Helper function to read and parse log files with date range
function readLogData(startDate, endDate, filters = {}) {
  const logFiles = getAvailableLogFiles();
  const allData = [];

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  logFiles.forEach(logFile => {
    const fileDate = new Date(logFile.date);
    
    // Filter by date range
    if (start && fileDate < start) return;
    if (end && fileDate > end) return;

    try {
      if (fs.existsSync(logFile.path)) {
        const content = fs.readFileSync(logFile.path, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
          const parsed = parseLogLine(line);
          if (parsed) {
            // Apply filters
            if (filters.universityId && parsed.universityId !== filters.universityId) return;
            if (filters.campusId && parsed.campusId !== filters.campusId) return;
            if (filters.userId && parsed.userId !== filters.userId) return;
            if (filters.deviceId && parsed.deviceId !== filters.deviceId) return;
            if (filters.route && !parsed.route?.includes(filters.route)) return;

            allData.push(parsed);
          }
        });
      }
    } catch (error) {
      console.error(`Error reading log file ${logFile.path}:`, error);
    }
  });

  return allData.sort((a, b) => b.timestamp - a.timestamp);
}

// Analytics Summary Route
router.get('/analytics/summary', async (req, res) => {
  try {
    const { startDate, endDate, universityId, campusId, userId, deviceId, route } = req.query;
    
    const filters = {};
    if (universityId) filters.universityId = universityId;
    if (campusId) filters.campusId = campusId;
    if (userId) filters.userId = userId;
    if (deviceId) filters.deviceId = deviceId;
    if (route) filters.route = route;

    const logData = readLogData(startDate, endDate, filters);

    // Calculate summary statistics
    const summary = {
      totalRequests: logData.length,
      uniqueUsers: new Set(logData.map(d => d.userId).filter(Boolean)).size,
      uniqueDevices: new Set(logData.map(d => d.deviceId).filter(Boolean)).size,
      uniqueRoutes: new Set(logData.map(d => d.route).filter(Boolean)).size,
      dateRange: {
        start: logData.length > 0 ? logData[logData.length - 1].timestamp : null,
        end: logData.length > 0 ? logData[0].timestamp : null
      }
    };

    res.status(200).json(summary);
  } catch (error) {
    console.error('Error in analytics summary:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Route Analytics
router.get('/analytics/routes', async (req, res) => {
  try {
    const { startDate, endDate, universityId, campusId, userId, deviceId, route, limit = 10 } = req.query;
    
    const filters = {};
    if (universityId) filters.universityId = universityId;
    if (campusId) filters.campusId = campusId;
    if (userId) filters.userId = userId;
    if (deviceId) filters.deviceId = deviceId;
    if (route) filters.route = route;

    const logData = readLogData(startDate, endDate, filters);

    // Count route usage
    const routeStats = {};
    logData.forEach(entry => {
      if (entry.route) {
        if (!routeStats[entry.route]) {
          routeStats[entry.route] = {
            count: 0,
            uniqueUsers: new Set(),
            uniqueDevices: new Set(),
            universities: new Set(),
            campuses: new Set()
          };
        }
        routeStats[entry.route].count++;
        if (entry.userId) routeStats[entry.route].uniqueUsers.add(entry.userId);
        if (entry.deviceId) routeStats[entry.route].uniqueDevices.add(entry.deviceId);
        if (entry.universityId) routeStats[entry.route].universities.add(entry.universityId);
        if (entry.campusId) routeStats[entry.route].campuses.add(entry.campusId);
      }
    });

    // Convert sets to counts and sort
    const routeData = Object.entries(routeStats)
      .map(([route, stats]) => ({
        route,
        count: stats.count,
        uniqueUsers: stats.uniqueUsers.size,
        uniqueDevices: stats.uniqueDevices.size,
        universities: stats.universities.size,
        campuses: stats.campuses.size
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, parseInt(limit));

    res.status(200).json(routeData);
  } catch (error) {
    console.error('Error in route analytics:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// User Activity Analytics
router.get('/analytics/users', async (req, res) => {
  try {
    const { startDate, endDate, universityId, campusId, userId, deviceId, route, limit = 10 } = req.query;
    
    const filters = {};
    if (universityId) filters.universityId = universityId;
    if (campusId) filters.campusId = campusId;
    if (userId) filters.userId = userId;
    if (deviceId) filters.deviceId = deviceId;
    if (route) filters.route = route;

    const logData = readLogData(startDate, endDate, filters);

    // Count user activity
    const userStats = {};
    logData.forEach(entry => {
      if (entry.userId) {
        if (!userStats[entry.userId]) {
          userStats[entry.userId] = {
            count: 0,
            routes: new Set(),
            devices: new Set(),
            email: entry.universityEmail,
            universityId: entry.universityId,
            campusId: entry.campusId,
            lastActive: entry.timestamp
          };
        }
        userStats[entry.userId].count++;
        if (entry.route) userStats[entry.userId].routes.add(entry.route);
        if (entry.deviceId) userStats[entry.userId].devices.add(entry.deviceId);
        if (entry.timestamp > userStats[entry.userId].lastActive) {
          userStats[entry.userId].lastActive = entry.timestamp;
        }
      }
    });

    // Convert sets to counts and sort
    const userData = Object.entries(userStats)
      .map(([userId, stats]) => ({
        userId,
        email: stats.email,
        universityId: stats.universityId,
        campusId: stats.campusId,
        requestCount: stats.count,
        uniqueRoutes: stats.routes.size,
        uniqueDevices: stats.devices.size,
        lastActive: stats.lastActive
      }))
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, parseInt(limit));

    res.status(200).json(userData);
  } catch (error) {
    console.error('Error in user analytics:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Timeline Analytics
router.get('/analytics/timeline', async (req, res) => {
  try {
    const { startDate, endDate, universityId, campusId, userId, deviceId, route, groupBy = 'hour' } = req.query;
    
    const filters = {};
    if (universityId) filters.universityId = universityId;
    if (campusId) filters.campusId = campusId;
    if (userId) filters.userId = userId;
    if (deviceId) filters.deviceId = deviceId;
    if (route) filters.route = route;

    const logData = readLogData(startDate, endDate, filters);

    // Group by time periods
    const timeStats = {};
    logData.forEach(entry => {
      let timeKey;
      const date = new Date(entry.timestamp);
      
      switch (groupBy) {
        case 'minute':
          timeKey = date.toISOString().substring(0, 16); // YYYY-MM-DDTHH:MM
          break;
        case 'hour':
          timeKey = date.toISOString().substring(0, 13); // YYYY-MM-DDTHH
          break;
        case 'day':
          timeKey = date.toISOString().substring(0, 10); // YYYY-MM-DD
          break;
        case 'week':
          const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
          timeKey = weekStart.toISOString().substring(0, 10);
          break;
        case 'month':
          timeKey = date.toISOString().substring(0, 7); // YYYY-MM
          break;
        default:
          timeKey = date.toISOString().substring(0, 13); // Default to hour
      }

      if (!timeStats[timeKey]) {
        timeStats[timeKey] = {
          requests: 0,
          uniqueUsers: new Set(),
          uniqueDevices: new Set(),
          routes: new Set()
        };
      }
      timeStats[timeKey].requests++;
      if (entry.userId) timeStats[timeKey].uniqueUsers.add(entry.userId);
      if (entry.deviceId) timeStats[timeKey].uniqueDevices.add(entry.deviceId);
      if (entry.route) timeStats[timeKey].routes.add(entry.route);
    });

    // Convert to array and sort by time
    const timelineData = Object.entries(timeStats)
      .map(([time, stats]) => ({
        time,
        requests: stats.requests,
        uniqueUsers: stats.uniqueUsers.size,
        uniqueDevices: stats.uniqueDevices.size,
        uniqueRoutes: stats.routes.size
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    res.status(200).json(timelineData);
  } catch (error) {
    console.error('Error in timeline analytics:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Get available filters
router.get('/analytics/filters', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const logData = readLogData(startDate, endDate);

    const filters = {
      universities: [...new Set(logData.map(d => d.universityId).filter(Boolean))],
      campuses: [...new Set(logData.map(d => d.campusId).filter(Boolean))],
      routes: [...new Set(logData.map(d => d.route).filter(Boolean))].sort(),
      users: [...new Set(logData.map(d => d.userId).filter(Boolean))],
      devices: [...new Set(logData.map(d => d.deviceId).filter(Boolean))],
      availableDates: getAvailableLogFiles().map(f => f.date)
    };

    // Get university and campus names
    if (filters.universities.length > 0) {
      const universities = await University.find({ 
        _id: { $in: filters.universities } 
      }).select('_id name').lean();
      filters.universitiesWithNames = universities;
    }

    if (filters.campuses.length > 0) {
      const campuses = await Campus.find({ 
        _id: { $in: filters.campuses } 
      }).select('_id name universityOrigin').populate('universityOrigin', 'name').lean();
      filters.campusesWithNames = campuses;
    }

    res.status(200).json(filters);
  } catch (error) {
    console.error('Error getting analytics filters:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Dashboard data route
router.get('/dashboard', async (req, res) => {
  try {
    const { universityId, campusId } = req.query;
    
    // Get basic stats
    const [users, universities, campuses, societies] = await Promise.all([
      User.countDocuments(),
      University.countDocuments(),
      Campus.countDocuments(),
      Society.countDocuments()
    ]);

    // Get recent log analytics (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const filters = {};
    if (universityId) filters.universityId = universityId;
    if (campusId) filters.campusId = campusId;

    const recentLogs = readLogData(sevenDaysAgo.toISOString().split('T')[0], null, filters);
    
    const dashboardData = {
      stats: {
        totalUsers: users,
        totalUniversities: universities,
        totalCampuses: campuses,
        totalSocieties: societies,
        recentActivity: {
          totalRequests: recentLogs.length,
          uniqueUsers: new Set(recentLogs.map(d => d.userId).filter(Boolean)).size,
          uniqueDevices: new Set(recentLogs.map(d => d.deviceId).filter(Boolean)).size,
          dateRange: '7 days'
        }
      },
      topRoutes: recentLogs.reduce((acc, log) => {
        if (log.route) {
          acc[log.route] = (acc[log.route] || 0) + 1;
        }
        return acc;
      }, {}),
      activityByDay: []
    };

    // Calculate activity by day for the chart
    const dailyActivity = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyActivity[dateKey] = 0;
    }

    recentLogs.forEach(log => {
      const dateKey = log.timestamp.toISOString().split('T')[0];
      if (dailyActivity.hasOwnProperty(dateKey)) {
        dailyActivity[dateKey]++;
      }
    });

    dashboardData.activityByDay = Object.entries(dailyActivity).map(([date, count]) => ({
      date,
      requests: count
    }));

    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Error in dashboard data:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

module.exports = router;
