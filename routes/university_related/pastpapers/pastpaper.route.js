const express = require('express');
const Subject = require('../../../models/university/department/subject/subject.department.model');
const { PastPaper } = require('../../../models/university/papers/pastpaper.model.js');
const { PastPaperItem } = require('../../../models/university/papers/pastpaper.item.model');
const { getUserDetails } = require('../../../utils/utils');
const router = express.Router();
const redisClient = require("../../../db/reddis.js");
const mongoose = require('mongoose');
const { DiscussionComment, PastPaperQuestion } = require('../../../models/university/papers/discussion/discussion.comment');
const s3Service = require('../../../utils/aws/aws.js');
const {upload}= require('../../../utils/multer.utils.js');
const { PastpapersCollectionByYear } = require('../../../models/university/papers/paper.collection.model.js');
const fs = require('fs');
// Cache configuration
const CACHE_TTL = 3600; // 1 hour in seconds
const CACHE_KEYS = {
    PAPER_BY_TYPE: (paperId, type) => `paper_${type}_${paperId}`,
    ALL_PAPERS: (subjectId) => `all_papers_${subjectId}`,
    PAPER_STATS: (subjectId) => `paper_stats_${subjectId}`
};

// Error handler middleware
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation middleware
const validatePaperUpload = (req, res, next) => {
    const { name, type, category, term, year, subjectId, file } = req.body;
    if (!name || !type || !year || !subjectId || !file?.url) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    next();
};

// Cache middleware
const cacheMiddleware = (keyGenerator) => async (req, res, next) => {
    try {
        const cacheKey = keyGenerator(req);
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }
        next();
    } catch (error) {
        next(error);
    }
};

// Get all papers for a subject
router.get('/all-pastpapers-in-subject/:subjectId',
    // cacheMiddleware(req => CACHE_KEYS.ALL_PAPERS(req.params.subjectId)),
    asyncHandler(async (req, res) => {
        const { subjectId } = req.params;

        // Get all papers for the subject using PastPaperItem
        const papers = await PastPaperItem.find({ subjectId })
            .sort({ academicYear: -1, type: 1 })
            .populate([
                {
                    path: 'references',
                    select: 'subjectId universityOrigin campusOrigin departmentId'
                },
                {
                    path: 'paperId',
                    populate: {
                        path: 'papers.files',
                        populate:
                            { path: 'teachers', select: 'name email' },
                    }
                }
            ]);

        // Get the subject name
        const subject = await Subject.findById(subjectId).select('name');
        if (!subject) {
            return res.status(404).json({ message: "Subject not found" });
        }

        // Group papers by academic year
        const papersByYear = papers.reduce((acc, paper) => {
            const year = paper.academicYear;
            if (!acc[year]) {
                acc[year] = [];
            }
            acc[year].push(paper);
            return acc;
        }, {});

        // Transform the data for the frontend
        const response = {
            subjectName: subject.name,
            papers: Object.entries(papersByYear).map(([year, papers]) => ({
                academicYear: parseInt(year),
                papers: papers
            })).sort((a, b) => b.academicYear - a.academicYear)
        };

        // Cache the response
        await redisClient.setex(
            CACHE_KEYS.ALL_PAPERS(subjectId),
            CACHE_TTL,
            JSON.stringify(response)
        );

        res.json(response);
    })
);

// Get papers by type for a subject
router.get('/:type/:subjectId',
    cacheMiddleware(req => CACHE_KEYS.PAPER_BY_TYPE(req.params.subjectId, req.params.type)),
    asyncHandler(async (req, res) => {
        const { type, subjectId } = req.params;

        // Get papers using the PastPaperItem model
        const papers = await PastPaperItem.findBySubjectAndType(subjectId, type);

        // Get the subject name
        const subject = await Subject.findById(subjectId).select('name');
        if (!subject) {
            return res.status(404).json({ message: "Subject not found" });
        }

        // Group papers by academic year
        const papersByYear = papers.reduce((acc, paper) => {
            const year = paper.academicYear;
            if (!acc[year]) {
                acc[year] = [];
            }
            acc[year].push(paper);
            return acc;
        }, {});

        // Transform the data for the frontend
        const response = {
            subjectName: subject.name,
            papers: Object.entries(papersByYear).map(([year, papers]) => ({
                academicYear: parseInt(year),
                papers: papers
            })).sort((a, b) => b.academicYear - a.academicYear)
        };

        // Cache the response
        await redisClient.setex(
            CACHE_KEYS.PAPER_BY_TYPE(subjectId, type),
            CACHE_TTL,
            JSON.stringify(response)
        );

        res.json(response);
    })
);


router.post("/upload", upload.single('file'), async (req, res) => {
  const {
    year, type, term, termMode,
    paperName, teachers, subjectId,
    departmentId, sessionType
  } = req.body;

  const {
    universityOrigin, campusOrigin,
    userId, role
  } = getUserDetails(req);

  const file = req.file;

  if (!file) {
    return res.status(400).send('No file uploaded');
  }

  console.log("Received Data:", { departmentId, subjectId, year, type, term, termMode, paperName, teachers, sessionType });

  try {
    // Construct the S3 path
    let pathSegment = "/";
    switch (type) {
      case "ASSIGNMENT":
      case "QUIZ":
        pathSegment = `/${type}`;
        break;
      case "MIDTERM":
      case "FINAL":
        pathSegment = `/${term}/${type}/${termMode}`;
        break;
      case "SESSIONAL":
        pathSegment = `/${type}/${sessionType}`;
        break;
    }

    const timestamp = Date.now();
    const pdfUrl = `${universityOrigin}/${campusOrigin}/${role}/pastpapers/${year}/${departmentId}/${subjectId}${pathSegment}/${file.originalname}-${timestamp}`;

    console.log("PDF Path:", pdfUrl);
        console.log("PDF FILE:", file);

        const fileBuffer = fs.readFileSync(file.path);
    await s3Service.putObjectBuffer(pdfUrl, fileBuffer, file.mimetype);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate subject
      const subject = await Subject.findOne({
        _id: subjectId,
        'references.departmentId': departmentId,
        'references.universityOrigin': universityOrigin,
        'references.campusOrigin': campusOrigin
      }).session(session);

      if (!subject) {
        throw new Error("Subject not found");
      }

      // Ensure PastPaper document exists
      let pastPaper = await PastPaper.findOne({
        'references.subjectId': subjectId,
        academicYear: parseInt(year)
      }).session(session);

      if (!pastPaper) {
        pastPaper = new PastPaper({
          academicYear: parseInt(year),
          references: { subjectId, universityOrigin, campusOrigin },
          papers: []
        });
        await pastPaper.save({ session });
      }

      // Try to find and update an existing PastPaperItem
      const updateQuery = {
        subjectId,
        type: type.toUpperCase(),
        academicYear: parseInt(year),
        term: term?.toUpperCase(),
        category: termMode?.toUpperCase(),
        sessionType: sessionType || undefined
      };

      const paperItemExists = await PastPaperItem.findOneAndUpdate(
        updateQuery,
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
        { new: true }
      ).session(session);

      if (paperItemExists) {
        await session.commitTransaction();
        
        // Invalidate cache
      const cacheKeys = [
        `pastpapers_${subjectId}`,
        `paper_${type.toLowerCase()}_${subjectId}`,
        `all_papers_${subjectId}`
      ];

      await Promise.all(cacheKeys.map(key => redisClient.del(key)));

        return res.status(200).json({
          message: `File successfully added to existing ${type}`,
          pastPaperItem: paperItemExists,
          pastPaper,
          collection: null
        });
      }

      // Create new PastPaperItem
      const newPastPaperItem = new PastPaperItem({
        sessionType: sessionType || undefined,
        paperId: pastPaper._id,
        subjectId,
        name: paperName,
        type: type.toUpperCase(),
        category: termMode?.toUpperCase(),
        term: term?.toUpperCase(),
        academicYear: parseInt(year),
        files: [{
          teachers: teachers || [],
          uploadedBy: userId,
          url: pdfUrl,
          uploadedAt: new Date()
        }],
        references: { universityOrigin, campusOrigin, departmentId }
      });

      await newPastPaperItem.save({ session });

      pastPaper.papers.push(newPastPaperItem._id);
      await pastPaper.save({ session });

      // Handle collection
      let collection = await PastpapersCollectionByYear.findById(subjectId).session(session);

      if (!collection) {
        collection = new PastpapersCollectionByYear({
          _id: subjectId,
          references: { subjectId, universityOrigin, campusOrigin },
          pastpapers: [pastPaper._id],
          stats: { totalPapers: 1, lastUpdated: new Date() }
        });
      } else {
        if (!collection.pastpapers.includes(pastPaper._id)) {
          collection.pastpapers.push(pastPaper._id);
        }
        collection.stats.totalPapers = collection.pastpapers.length;
        collection.stats.lastUpdated = new Date();
      }

      await collection.save({ session });

      // Invalidate cache
      const cacheKeys = [
        `pastpapers_${subjectId}`,
        `paper_${type.toLowerCase()}_${subjectId}`,
        `all_papers_${subjectId}`
      ];

      await Promise.all(cacheKeys.map(key => redisClient.del(key)));

      await session.commitTransaction();

      return res.status(200).json({
        message: `${type} uploaded successfully`,
        pastPaperItem: newPastPaperItem,
        pastPaper,
        collection
      });

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

  } catch (err) {
    console.error("Upload Error:", err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
});


// router.post("/upload",upload.single('file'), async (req, res) => {
//   const { year, type, term, termMode, paperName,  teachers, subjectId, departmentId, sessionType } = req.body;
//   const { universityOrigin, campusOrigin, userId ,role} = getUserDetails(req);

    
//   const file = req.file;
  

//   console.log("Data: ", departmentId, subjectId, year, type, term, termMode, paperName,  teachers, sessionType)
//   // return res.status(200).json({message: "success"})
//   try {

//     if (!file) {
//         return res.status(400).send('No file uploaded');
//     }




//         let concat = "/";
//     if (type === "ASSIGNMENT" || type === "QUIZ") {
//         console.log("IN MID OR FINAL", type, type === "ASSIGNMENT", type === "QUIZ")
//         concat = `/${type}`;
//     } else if (type === 'MIDTERM' || type === 'FINAL') {
//         console.log("IN MID OR FINAL", type, type === 'MIDTERM', type === 'FINAL')
//         concat = `/${term}/${type}/${termMode}`;
//     } else if (type === 'SESSIONAL') {
//         console.log("IN SESSIONAL", type, type === 'SESSIONAL' && (sessionType === '1' || sessionType === '2'))
//         concat = `/${type}/${sessionType}`;
//     }
//     else {

//     }
// const pdfUrl = `${universityOrigin}/${campusOrigin}/${role}/pastpapers/${year}/${departmentId}/${subjectId}${concat}/${file.originalname}-${Date.now()}`

//     console.log("Path Name", pdfUrl)
    

//     const value = await s3Service.putObject(pdfUrl, file.buffer, file.mimetype)

//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       // Find the subject and validate
//       const findSubject = await Subject.findOne({
//         _id: subjectId,
//         'references.departmentId': departmentId,
//         'references.universityOrigin': universityOrigin,
//         'references.campusOrigin': campusOrigin,
//       }).session(session);

//       if (!findSubject) {
//         throw new Error("No such subject found");
//       }

//       // First, create or find the PastPaper document to get its ID
//       let pastPaper = await PastPaper.findOne({
//         'references.subjectId': subjectId,
//         academicYear: parseInt(year)
//       }).session(session);

//       if (!pastPaper) {
//         pastPaper = new PastPaper({
//           academicYear: parseInt(year),
//           references: {
//             subjectId,
//             universityOrigin,
//             campusOrigin
//           },
//           papers: []
//         });
//         await pastPaper.save({ session });
//       }

//       console.log("Past Paper ID:", pastPaper);
//       let paperItemExistsAndAdded = await PastPaperItem.findOneAndUpdate({
//         subjectId,
//         type: type.toUpperCase(),
//         academicYear: parseInt(year),
//         term: term ? term.toUpperCase() : undefined,
//         category: termMode ? termMode.toUpperCase() : undefined,
//         sessionType: sessionType ? sessionType : undefined
//       }, 
//     {
//       $push: {
//         files:{
//           teachers: teachers || [],
//           uploadedBy: userId,
//           url: pdfUrl,
//           uploadedAt: new Date()
//         }
//       }
//     },
//   ).session(session);
//   if(paperItemExistsAndAdded) {
//     // Paper item already exists, just update the files array
//     await session.commitTransaction();
//     return res.status(200).json({
//       message: `file added* successfully to ${type} that already exists`,
//       pastPaperItem: paperItemExistsAndAdded,
//       pastPaper,
//       collection: null
//     }
//   )
// }
//       // Create new PastPaperItem with paperId
//       const pastPaperItem = new PastPaperItem({
//         sessionType: sessionType ? sessionType : undefined,
//         paperId: pastPaper._id, // Set the paperId to reference the PastPaper document
//         subjectId,
//         name: paperName,
//         type: type.toUpperCase(),
//         category: termMode ? termMode.toUpperCase() : undefined,
//         term: term ? term.toUpperCase() : undefined,
//         academicYear: parseInt(year),
        
//         // file: {
//         //   uploadedBy: userId,
//         //   url: pdfUrl,
//         //   uploadedAt: new Date()
//         // },
//         // $push: {
//           files:[{
//             teachers: teachers || [],
//             uploadedBy: userId,
//             url: pdfUrl,
//             uploadedAt: new Date()
//           }],
//         // },
//         references: {
//           universityOrigin,
//           campusOrigin,
//           departmentId
//         }
//       });

//       // Save the PastPaperItem
//       await pastPaperItem.save({ session });

//       // Add paper reference to pastpaper document
//       pastPaper.papers.push(pastPaperItem._id);
//       await pastPaper.save({ session });

//       // Update or create collection reference
//       let collection = await PastpapersCollectionByYear.findById(subjectId).session(session);
//       if (!collection) {
//         collection = new PastpapersCollectionByYear({
//           _id: subjectId,
//           references: {
//             subjectId,
//             universityOrigin,
//             campusOrigin
//           },
//           pastpapers: [pastPaper._id]
//         });
//       } else if (!collection.pastpapers.includes(pastPaper._id)) {
//         collection.pastpapers.push(pastPaper._id);
//       }

//       // Update collection stats
//       collection.stats.totalPapers = collection.pastpapers.length;
//       collection.stats.lastUpdated = new Date();
//       await collection.save({ session });

//       // Invalidate cache
//       const cacheKeys = [
//         `pastpapers_${subjectId}`,
//         `paper_${type.toLowerCase()}_${subjectId}`,
//         `all_papers_${subjectId}`
//       ];
//       await Promise.all(cacheKeys.map(key => redisClient.del(key)));

//       await session.commitTransaction();

//       res.status(200).json({
//         message: `${type} added successfully`,
//         pastPaperItem,
//         pastPaper,
//         collection
//       });
//     } catch (error) {
//       await session.abortTransaction();
//       throw error;
//     } finally {
//       session.endSession();
//     }
//   } catch (error) {
//     console.error('Error adding paper:', error);
//     res.status(500).json({ message: error.message });
//   }
// });

// Upload new paper
// router.post('/upload', validatePaperUpload, asyncHandler(async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         const { name, type, category, term, year, subjectId, file } = req.body;
//         const { userId, universityOrigin, campusOrigin, departmentId } = getUserDetails(req);

//         // Create entry in PastPaperItem collection
//         const pastPaperItem = new PastPaperItem({
//             subjectId,
//             name,
//             type: type.toUpperCase(),
//             category: category?.toUpperCase(),
//             term: term?.toUpperCase(),
//             academicYear: parseInt(year),
//             teachers: [userId],
//             file,
//             references: {
//                 universityOrigin,
//                 campusOrigin,
//                 departmentId
//             }
//         });

//         // Save the PastPaperItem
//         await pastPaperItem.save({ session });

//         // Find or create pastpaper document
//         let pastPaper = await PastPaper.findOne({
//             'references.subjectId': subjectId,
//             academicYear: parseInt(year)
//         }).session(session);

//         if (!pastPaper) {
//             pastPaper = new PastPaper({
//                 academicYear: parseInt(year),
//                 references: {
//                     subjectId,
//                     universityOrigin,
//                     campusOrigin
//                 },
//                 papers: []
//             });
//         }

//         // Add paper reference
//         pastPaper.papers.push(pastPaperItem._id);
//         await pastPaper.save({ session });

//         // Update or create collection reference
//         let collection = await PastpapersCollectionByYear.findById(subjectId).session(session);
//         if (!collection) {
//             collection = new PastpapersCollectionByYear({
//                 _id: subjectId,
//                 references: {
//                     subjectId,
//                     universityOrigin,
//                     campusOrigin
//                 },
//                 pastpapers: [pastPaper._id]
//             });
//         } else if (!collection.pastpapers.includes(pastPaper._id)) {
//             collection.pastpapers.push(pastPaper._id);
//         }

//         await collection.save({ session });

//         // Invalidate cache
//         await Promise.all([
//             redisClient.del(CACHE_KEYS.PAPER_BY_TYPE(subjectId, type)),
//             redisClient.del(CACHE_KEYS.ALL_PAPERS(subjectId)),
//             redisClient.del(CACHE_KEYS.PAPER_STATS(subjectId))
//         ]);

//         await session.commitTransaction();
//         res.status(201).json({
//             message: 'Paper uploaded successfully',
//             pastPaperItem,
//             pastPaper,
//             collection
//         });
//     } catch (error) {
//         await session.abortTransaction();
//         throw error;
//     } finally {
//         session.endSession();
//     }
// }));

// Get papers statistics
router.get('/stats/:subjectId',
    cacheMiddleware(req => CACHE_KEYS.PAPER_STATS(req.params.subjectId)),
    asyncHandler(async (req, res) => {
        const { subjectId } = req.params;
        const stats = await PastPaperItem.getSubjectStats(subjectId);

        // Cache the response
        await redisClient.setex(
            CACHE_KEYS.PAPER_STATS(subjectId),
            CACHE_TTL,
            JSON.stringify(stats)
        );

        res.json(stats);
    })
);

// Track paper view
router.post('/view/:paperId', asyncHandler(async (req, res) => {
    const { paperId } = req.params;
    const paper = await PastPaperItem.findById(paperId);
    if (!paper) {
        return res.status(404).json({ message: "Paper not found" });
    }
    await paper.incrementViews();
    res.json({ message: "View counted successfully" });
}));

// Track paper download
router.post('/download/:paperId', asyncHandler(async (req, res) => {
    const { paperId } = req.params;
    const paper = await PastPaperItem.findById(paperId);
    if (!paper) {
        return res.status(404).json({ message: "Paper not found" });
    }
    await paper.incrementDownloads();
    res.json({ message: "Download counted successfully" });
}));

module.exports = router;