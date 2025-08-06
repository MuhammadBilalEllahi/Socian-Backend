import express from "express";
import Subject from "../../../models/university/department/subject/subject.department.model.js";
import University from "../../../models/university/university.register.model.js";
import Campus from "../../../models/university/campus.university.model.js";
import Department from "../../../models/university/department/department.university.model.js";
import PastPaper from "../../../models/university/papers/pastpaper.model.js";
import { PastpapersCollectionByYear } from "../../../models/university/papers/paper.collection.model.js";
import { getUserDetails } from "../../../utils/utils.js";
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

export default router;
