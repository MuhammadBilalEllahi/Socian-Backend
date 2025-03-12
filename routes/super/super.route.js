const express = require("express");
const User = require("../../models/user/user.model");
const Campus = require("../../models/university/campus.university.model");
const University = require("../../models/university/university.register.model");
const Society = require("../../models/society/society.model");
const Subject = require("../../models/university/department/subject/subject.department.model");
const { PastPaper, PastpapersCollectionByYear } = require("../../models/university/papers/pastpaper.subject.model");
const PastPaperItem = require("../../models/university/papers/pastpaper.item.model");
const router = express.Router();
const redisClient = require("../../db/reddis");
const { getUserDetails } = require("../../utils/utils");
const mongoose = require("mongoose");


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
  const { year, type, term, termMode, paperName, pdfUrl, teachers, subjectId, departmentId, sessionType } = req.body;
  const { universityOrigin, campusOrigin } = getUserDetails(req);

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
        teachers: teachers || [],
        file: {
          url: pdfUrl,
          uploadedAt: new Date()
        },
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



module.exports = router;
