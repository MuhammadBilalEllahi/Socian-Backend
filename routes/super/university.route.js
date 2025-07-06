const express = require("express");
const University = require("../../models/university/university.register.model");
const { uploadUniversityImage } = require("../../utils/multer.utils");
const { uploadUniversityImageAws } = require("../../utils/aws.bucket.utils");
const router = express.Router();

const mongoose= require("mongoose")


router.post("/register", uploadUniversityImage.single("file"), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  console.log("req.body", req.body)
  console.log("req.file", req.file)

  try {
    const { name, mainLocationAddress, adminEmails, telephone } = req.body;

    if (!name) return res.status(400).json({ error: "Name is required" });

    const existing = await University.findOne({ name }).session(session);
    if (existing) {
      await session.abortTransaction();
      return res.status(400).json({ error: "University already exists" });
    }

    const newUniversity = await University.create([{
      name,
      mainLocationAddress: mainLocationAddress || '',
      adminEmails: adminEmails || '',
      telephone: telephone || ''
    }], { session });

    const createdUniversity = newUniversity[0]; // .create() with array returns an array

    // Upload university picture
    const { url, type } = await uploadUniversityImageAws(req.file,req, createdUniversity._id);

    // Update picture fields
    createdUniversity.picture = url;
    createdUniversity.pictureType = type;
    await createdUniversity.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json(createdUniversity);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("University creation failed:", error);
    return res.status(500).json({ error: "Unable to create university. Please try again." });
  }
});


router.put("/:universityId", async (req, res) => {
  const { universityId } = req.params;
  // const { name, mainLocationAddress } = req.body;

  try {
    const universityExistsAndUpdated = await University.findByIdAndUpdate(
      { _id: universityId },
      req.body
    );
    // console.log(universityExistsAndUpdated);
    if (!universityExistsAndUpdated)
      return res.status(400).json("University does not Exists");

    res.status(201).json(universityExistsAndUpdated);
  } catch (error) {
    console.error("Error creating university:", error);
    throw new Error("Unable to create university. Please try again.");
  }
});



router.get("/", async (req, res) => {
  try {
    const university = await University.find().populate({
      path: "campuses",
      populate: [{
        path: "departments",
        populate: {
          path: "subjects"
        }
      },
      {
        path: "teachers"
      }],
    });

    res.status(200).json(university);
  } catch (error) {
    console.error("Error creating campus:", error);
    res.status(500).json({ message: error.message }); // Unable to create campus. Please try again.
  }
});


router.get("/:universityId/campuses", async (req, res) => {
  const { universityId } = req.params;
  // console.log(req.query, "and", req.params);
  try {
    const university = await University.findOne({
      _id: universityId,
    })
      .populate("campuses").select('-users');

    res.status(200).json({ campuses: university.campuses });
  } catch (error) {
    console.error("Error creating campus:", error);
    res.status(500).json({ message: error.message }); // Unable to create campus. Please try again.
  }
});

router.get("/:universityId", async (req, res) => {
  const { universityId } = req.params;
  // console.log(req.query, "and", req.params);
  try {
    const university = await University.findOne({
      _id: universityId,
    }).select('-users')

    res.status(200).json({  university: university });
  } catch (error) {
    console.error("Error creating campus:", error);
    res.status(500).json({ message: error.message }); // Unable to create campus. Please try again.
  }
});

module.exports = router;
