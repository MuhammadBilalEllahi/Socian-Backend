const express = require("express");
const Subject = require("../../../models/university/department/subject/subject.department.model");
const University = require("../../../models/university/university.register.model");
const Campus = require("../../../models/university/campus.university.model");
const Department = require("../../../models/university/department/department.university.model");
const {
  PastPaper,
  PastpapersCollectionByYear,
} = require("../../../models/university/papers/pastpaper.model");
const { getUserDetails } = require("../../../utils/utils");
const router = express.Router();

// TODO - create subject as single entity, ref with campus, so that user could attach them to department later



router.get('/my/department/subjects/all', async (req, res) => {
  try {
    const { universityOrigin, campusOrigin, departmentId } = getUserDetails(req)
    console.log({ universityOrigin, campusOrigin, departmentId })
    const subjects = await Subject.find({
      "references.departmentId": departmentId,
      "references.universityOrigin": universityOrigin,
      "references.campusOrigin": campusOrigin,
    });
    if (!subjects) res.status(404).json({ error: "No subjects till now" });

    res.status(200).json(subjects);
  } catch (error) {
    console.error("Error in subject: /my/department/subjects/all", error);
    res.status(500).json({ message: error.message });
  }
});


router.get('/other/department/subjects/all', async (req, res) => {
  try {
    const { universityOrigin, campusOrigin } = getUserDetails(req);
    const { departmentId } = req.query;
    const subjects = await Subject.find({
      "references.departmentId": departmentId,
      "references.universityOrigin": universityOrigin,
      "references.campusOrigin": campusOrigin,
    });

    if (!subjects) res.status(404).json({ error: "No subjects till now" });

    res.status(200).json(subjects);
  } catch (error) {
    console.error("Error in subject: /my/department/subjects/all", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
