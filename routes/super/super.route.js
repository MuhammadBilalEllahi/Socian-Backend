const express = require("express");
const User = require("../../models/user/user.model");
const Campus = require("../../models/university/campus.university.model");
const University = require("../../models/university/university.register.model");
const Society = require("../../models/society/society.model");
const router = express.Router();

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
    const campus = await Campus.find().populate("universityOrigin");

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


module.exports = router;
