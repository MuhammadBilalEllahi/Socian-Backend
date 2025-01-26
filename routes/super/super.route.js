const express = require("express");
const User = require("../../models/user/user.model");
const Campus = require("../../models/university/campus.university.model");
const University = require("../../models/university/university.register.model");
const Society = require("../../models/society/society.model");
const Subject = require("../../models/university/department/subject/subject.department.model");
const { PastPaper, PastpapersCollectionByYear } = require("../../models/university/papers/pastpaper.subject.model");
const router = express.Router();
const redisClient = require("../../db/reddis")


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
  const { year, type, term, termMode, paperName, pdfUrl, teachers, subjectId, departmentId } = req.body;

  // console.log(year, "\n", type, "\n", term, "\n", termMode, "\n", paperName, "\n", pdfUrl, "\n", subjectId, "\n", departmentId);

  const { universityOrigin, campusOrigin } = getUserDetails(req);


  try {
    // Find the subject and validate
    const findSubject = await Subject.findOne({
      _id: subjectId,
      'references.departmentId': departmentId,
      'references.universityOrigin': universityOrigin,
      'references.campusOrigin': campusOrigin,
    });
    if (!findSubject) return res.status(404).json({ message: "No such subject found" });

    // Update or create the collection directly
    const update = {
      $setOnInsert: { year, references: { subjectId, universityOrigin, campusOrigin } },
      $push: {},
    };

    if (type === 'quiz') {
      update.$push.quizzes = { name: paperName, teachers, 'file.pdf': pdfUrl };
    } else if (type === 'assignment') {
      update.$push.assignments = { name: paperName, teachers, 'file.pdf': pdfUrl };
    } else if (type === 'mid' || type === 'final') {
      const termField = `${term}.${type}.${termMode}`;
      // console.log("TERM FIELD", termField
      update.$push[`${termField}`] = { name: paperName, teachers, 'file.pdf': pdfUrl };
    } else if (type === 'sessional') {
      update.$push.sessional = { name: paperName, teachers, 'file.pdf': pdfUrl };
    }

    const updatedPastPaper = await PastPaper.findOneAndUpdate(
      { year, 'references.subjectId': subjectId, 'references.universityOrigin': universityOrigin, 'references.campusOrigin': campusOrigin },
      update,
      { upsert: true, new: true }
    );

    // Save to the collection
    const pastpapersCollectionUpdate = {
      $addToSet: { pastpapers: updatedPastPaper._id },
    };

    const updatedCollection = await PastpapersCollectionByYear.findOneAndUpdate(
      {
        _id: findSubject.pastpapersCollectionByYear._id,
        'references.subjectId': subjectId,
        'references.universityOrigin': universityOrigin,
        'references.campusOrigin': campusOrigin,
      },
      pastpapersCollectionUpdate,
      { new: true }
    );

    if (!updatedCollection) return res.status(404).json({ message: "No past papers collection found" });

    const cacheKey = `pastpapers_${subjectId}`;
    await redisClient.del(cacheKey);

    res.status(200).json({
      message: `${type} added successfully`,
      createdPastPaper: updatedPastPaper,
      updatedSubject: findSubject,
    });
  } catch (error) {
    console.error('Error adding paper:', error);
    res.status(500).json({ message: error.message });
  }
});



module.exports = router;
