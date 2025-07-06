const express = require("express");
const router = express.Router();

const University = require("../../models/university/university.register.model");
const Campus = require("../../models/university/campus.university.model");
const redisClient = require("../../db/reddis");
const mongoose = require('mongoose')
//  Routes
router.post("/register", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { universityOrigin, ...campusData } = req.body;
    const { location, name, regex, domain } = campusData;

    if (!universityOrigin) {
      await session.abortTransaction();
      return res.status(400).json({ message: "University ID is required" });
    }

    if (!domain) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Domain not in body" });
    }

    if (!regex) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Regex not in body" });
    }

    const university = await University.findById(universityOrigin).session(session);
    if (!university) {
      await session.abortTransaction();
      return res.status(404).json({ message: "University not found" });
    }

    const newCampus = new Campus({
      location,
      name,
      "emailPatterns.regex": regex,
      "emailPatterns.domain": domain,
      picture: university?.picture || "",
      universityOrigin,
    });

    await newCampus.save({ session });

    university.campuses.push(newCampus._id);
    await university.save({ session });

    await session.commitTransaction();
    session.endSession();

    const cacheKey = "universitiesGroupedCampus";
    await redisClient.del(cacheKey);

    return res.status(201).json(newCampus);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error creating campus:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.put("/:id", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const campusId = req.params.id;
    const { universityOrigin, location, name, regex, domain } = req.body;

    if (!campusId) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Campus ID is required" });
    }

    const campus = await Campus.findById(campusId).session(session);
    if (!campus) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Campus not found" });
    }

    // 🔁 Handle university change
    if (universityOrigin && campus.universityOrigin.toString() !== universityOrigin) {
      const newUniversity = await University.findById(universityOrigin).session(session);
      if (!newUniversity) {
        await session.abortTransaction();
        return res.status(404).json({ message: "New University not found" });
      }

      // 🛠 Remove campus from old university & add to new one concurrently
      const [pullResult, pushResult] = await Promise.all([
        University.findByIdAndUpdate(
          campus.universityOrigin,
          { $pull: { campuses: campus._id } },
          { session }
        ),
        University.findByIdAndUpdate(
          universityOrigin,
          { $addToSet: { campuses: campus._id } },
          { session }
        )
      ]);

      if (!pullResult || !pushResult) {
        await session.abortTransaction();
        return res.status(500).json({ message: "Failed to update university references" });
      }

      campus.universityOrigin = universityOrigin;
      campus.picture = newUniversity.picture || campus.picture;
    }

    // ✏️ Update other fields
    if (location) campus.location = location;
    if (name) campus.name = name;
    if (regex) campus.emailPatterns.regex = regex;
    if (domain) campus.emailPatterns.domain = domain;

    await campus.save({ session });

    await session.commitTransaction();
    session.endSession();

    const cacheKey = "universitiesGroupedCampus";
    await redisClient.del(cacheKey);

    return res.status(200).json(campus);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error updating campus:", error);
    return res.status(500).json({ message: error.message });
  }
});



router.delete("/:campusId", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { campusId } = req.params;

    const campus = await Campus.findById(campusId).session(session);
    if (!campus) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Campus not found" });
    }

    const university = await University.findById(campus.universityOrigin).session(session);
    if (!university) {
      await session.abortTransaction();
      return res.status(404).json({ message: "University not found for this campus" });
    }

    // Soft delete campus
    campus.isDeleted = true;
    await campus.save({ session });

    // Remove campus from university's list
    university.campuses.pull(campusId);
    await university.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Invalidate cache
    const cacheKey = "universitiesGroupedCampus";
    await redisClient.del(cacheKey);

    return res.status(200).json({ message: "Campus soft-deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in soft-deleting campus:", error);
    return res.status(500).json({ message: error.message });
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

router.get('/edit', async (req, res) => {
  try {
    const id = req.query.campusId;

    if (!id) {
      return res.status(404).json("Requires Campus Origin");
    }

    const campus = await Campus.findById(id)
      .populate([
        { path: 'universityOrigin', select: 'name location' },
        {
          path: 'departments',
          populate: {
            path: 'subjects',
            populate: [
              { path: 'pastpapersCollectionByYear', select: 'year papers' },
              { path: 'references.departmentId', select: 'name' },
              { path: 'references.universityOrigin', select: 'name location' },
              { path: 'references.campusOrigin', select: 'name location' },
            ],
          },
        },
        { path: 'users', select: 'name email role' },
      ]);

    if (!campus) {
      return res.status(404).json("Not Found Campus Origin");
    }

    res.status(200).json(campus);
  } catch (error) {
    console.error(error);
    res.status(500).json("Internal Server Error");
  }
});

router.get('/:campusId/departments', async (req, res) => {
  try {
    const id = req.params.campusId;

    if (!id) {
      return res.status(404).json("Requires Campus Origin");
    }

    const campus = await Campus.findById(id)
      .populate([
        {
          path: 'departments',
        }]);

    if (!campus) {
      return res.status(404).json("Not Found Campus Origin");
    }

    res.status(200).json({departments:campus.departments});
  } catch (error) {
    console.error(error);
    res.status(500).json("Internal Server Error");
  }
});




router.get('/:campusId', async (req, res) => {
  try {
    const id = req.params.campusId;

    if (!id) {
      return res.status(404).json("Requires Campus Origin");
    }

    const campus = await Campus.findById(id)
      .populate([
        { path: 'universityOrigin', select: 'name location' },
        {
          path: 'departments',
          populate: {
            path: 'subjects',
            populate: [
              { path: 'pastpapersCollectionByYear', select: 'year papers' },
              { path: 'references.departmentId', select: 'name' },
              { path: 'references.universityOrigin', select: 'name location' },
              { path: 'references.campusOrigin', select: 'name location' },
            ],
          },
        },
        { path: 'users', select: 'name email role' },
      ]);

    if (!campus) {
      return res.status(404).json("Not Found Campus Origin");
    }

    res.status(200).json(campus);
  } catch (error) {
    console.error(error);
    res.status(500).json("Internal Server Error");
  }
});



module.exports = router;
