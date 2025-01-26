const express = require("express");
const Subject = require("../../../models/university/department/subject/subject.department.model");
const University = require("../../../models/university/university.register.model");
const Campus = require("../../../models/university/campus.university.model");
const Department = require("../../../models/university/department/department.university.model");
const {
  PastPaper,
  PastpapersCollectionByYear,
} = require("../../../models/university/papers/pastpaper.subject.model");
const router = express.Router();

// TODO - create subject as single entity, ref with campus, so that user could attach them to department later

// creates a subject then create a pastpaper id and attach to subject [default]
router.post("/create", async (req, res) => {
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

    if (!findCampus.academic?.FormatType)
      return res
        .status(302)
        .json({
          message: "Please Complete university Academic Format to continue",
        });

    const findDepartment = await Department.findOne({
      _id: departmentId,
      "references.campusOrigin": campusOrigin,
      "references.universityOrigin": universityOrigin,
    });
    if (!findDepartment)
      return res.status(404).json({ message: "no such Department found" });

    const subject = await Subject.create({
      name: name,
      "references.departmentId": departmentId,
      "references.universityOrigin": universityOrigin,
      "references.campusOrigin": campusOrigin,
    });

    const createPastpaperCollectionByYear =
      await PastpapersCollectionByYear.create({
        type: findCampus.academic.FormatType,
        references: {
          universityOrigin: findUni._id,
          subjectId: subject._id,
          campusOrigin: findCampus._id,
        },
      });

    subject.pastpapersCollectionByYear = createPastpaperCollectionByYear._id;

    await subject.save();

    findDepartment.subjects.push(subject);

    findDepartment.save();

    if (!subject)
      return res.status(502).json({ error: "Failed to create Subject" });

    res.status(200).json(subject);
  } catch (error) {
    console.error("Error in subject:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
