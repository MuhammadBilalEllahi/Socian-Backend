const express = require("express");
const router = express.Router();

const University = require("../../models/university/university.register.model");
const Campus = require("../../models/university/campus.university.model");

//  Routes
router.post("/register", async (req, res) => {
  const { universityOrigin, ...campusData } = req.body;

  const { location, name, regex, domain } = campusData;

  try {
    if (!universityOrigin) {
      return res.status(400).json({ message: "University ID is required" });
    }
    // console.log("CAMPUS DATA", campusData)

    const university = await University.findById({ _id: universityOrigin });

    if (!university) {
      return res.status(404).json("University not found");
    }

    const newCampus = new Campus({
      location,
      name,
      "emailPatterns.regex": regex,
      "emailPatterns.domain": domain,

      universityOrigin,
    });
    // console.log("CAMPUS onbj", newCampus)
    await newCampus.save();

    // Update the university's campuses array
    university.campuses.push(newCampus._id);
    await university.save();

    // console.log('Campus created successfully:', newCampus);
    res.status(201).json(newCampus);
  } catch (error) {
    console.error("Error creating campus:", error);
    res.status(500).json({ message: error.message }); // Unable to create campus. Please try again.
  }
});

router.get("/", async (req, res) => {
  try {
    const campus = await Campus.find();

    res.status(200).json(campus);
  } catch (error) {
    console.error("Error creating campus:", error);
    res.status(500).json({ message: error.message }); // Unable to create campus. Please try again.
  }
});

module.exports = router;
