const express = require("express");
const Department = require("../../../models/university/department/department.university.model");
const University = require("../../../models/university/university.register.model");
const Campus = require("../../../models/university/campus.university.model");
const { getUserDetails } = require("../../../utils/utils");
const router = express.Router();

const redisClient = require('../../../db/reddis');



router.get("/by-university", async (req, res) => {
  const { universityId } = req.body;
  try {
    // const departments = await Department.find().lean()

    const departments = await Department.findOne({
      "references.universityOrigin": universityId,
    }).lean();

    if (!departments)
      return res.status(300).json({ message: "Error fetching Department" });

    res.status(200).json({ departments });
  } catch (error) {
    console.error("Error in department:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/by-campus", async (req, res) => {
  const { campusId } = req.body;
  try {
    const departments = await Department.findOne({
      "references.campusOrigin": campusId,
    }).lean();

    if (!departments)
      return res.status(300).json({ message: "Error fetching Department" });

    res.status(200).json({ departments });
  } catch (error) {
    console.error("Error in department:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/campus/auth", async (req, res) => {
  const { campusOrigin } = getUserDetails(req);
  try {
    const departments = await Department.find({
      "references.campusOrigin": campusOrigin,
    })

    if (!departments)
      return res.status(300).json({ message: "Error fetching Department" });

    // console.log(departments)


    const departmentsInFormat = departments.map(department => {
      return {
        name: `${department.name}`,
        _id: `${department._id}`
      }
    })
    console.log("IN format", departmentsInFormat)

    res.status(200).json({ departmentsInFormat });
  } catch (error) {
    console.error("Error in department:", error);
    res.status(500).json({ message: error.message });
  }
});

// TO FIX : req.session will always have campusId, if it doesnot then such user doesnot need it
// router.get("/with-subjects-by-campus", async (req, res) => {
//   // const { campusId } = req.body;
//   // const ifAvailableCampusIdFromUser = req.session.user.university.campusId._id;
//   const { campusOrigin } = getUserDetails(req)


//   try {
//     const campus = await Campus.find({
//       _id: campusOrigin,
//     })
//       .select("departments")
//       .populate({
//         path: "departments",
//         select: "name _id",
//         populate: {
//           path: "subjects",
//           select: "name _id",
//           options: { lean: true },
//         },
//       })
//       .lean();

//     if (!campus)
//       return res.status(300).json({ message: "Dang! No subjects yet" });
//     // return res.status(300).json({ message: "Error fetching campus" });
//     // console.log("Departments: ", JSON.stringify(campus))
//     res.status(200).json(campus);
//   } catch (error) {

//     console.error("Error in department:", error);
//     res.status(500).json({ message: error.message });
//   }
// });


router.get("/campus/subjects", async (req, res) => {
  const { campusOrigin } = getUserDetails(req);


  // Cache key (specific to the campus)
  const cacheKey = `campus_and_subjects-${campusOrigin}`;

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    // console.log("CHECKING", campusOrigin)

    // Fetch data from the database if not in cache
    const campus = await Campus.find({ _id: campusOrigin })
      .select("departments")
      .populate({
        path: "departments",
        select: "name _id",
        populate: {
          path: "subjects",
          select: "name _id",
          options: { lean: true },
        },
      })
      .lean();

    if (!campus || campus.length === 0) {
      return res.status(300).json({ message: "Dang! No subjects yet" });
    }

    // Store the fetched data in cache
    await redisClient.set(cacheKey, JSON.stringify(campus), 'EX', 3600);


    res.status(200).json(campus);
  } catch (error) {
    console.error("Error in department:", error);
    res.status(500).json({ message: error.message });
  }
});

// TO FIX : get ids from session or jwt
// TO FIX: GET THESE ALL Functions into schema methods
router.post("/", async (req, res) => {
  const { name, universityId, campusId } = req.body;
  try {
    if (!name || !universityId || !campusId)
      return res
        .status(400)
        .json({ message: "name, universityId, campusId  are required" });
    if (name === "" || universityId === "" || campusId === "")
      return res
        .status(400)
        .json({ message: "name, universityId, campusId  are required" });

    const findUni = await University.findOne({ _id: universityId });
    if (!findUni)
      return res.status(404).json({ message: "no such University found" });

    const findCampus = await Campus.findOne({
      _id: campusId,
      universityOrigin: universityId,
    });
    if (!findCampus)
      return res.status(404).json({ message: "no such Campus found" });

    const department = await Department.findOne({
      name: name,
      "references.universityOrigin": universityId,
      "references.campusOrigin": campusId,
    });
    if (department)
      return res.status(300).json({ message: "Department already exists" });

    const departmentCreated = await Department.create({
      name: name,
      "references.universityOrigin": universityId,
      "references.campusOrigin": campusId,
    });

    departmentCreated.save();

    findCampus.departments.push(departmentCreated);
    findCampus.save();

    const cacheKey = `campus_and_subjects-${campusId}`;
    await redisClient.del(cacheKey);

    res.status(200).json({ message: departmentCreated });
  } catch (error) {
    console.error("Error in department:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/campus", async (req, res) => {
  try {
    // const { campusId } = req.query;
    const { campusOrigin } = getUserDetails(req)

    const cacheKey = `departments_campus_${campusOrigin}`


    if (!campusOrigin) {
      return res.status(404).json("Requires Campus Origin");
    }

    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      console.log("Cache hit: departments_campus_");
      return res.status(200).json(JSON.parse(cachedData));
    }



    const campus = await Campus.findById({ _id: campusOrigin })
      .select("departments")
      .populate(
        "departments",
        "name _id",
        null,
        { sort: { name: 1 } },
        { lean: true }
      )

    await redisClient.set(cacheKey, JSON.stringify(campus, 'EX', 3600))
    res.status(200).json(campus);

  } catch (error) {
    console.error("Error in department:", error);
    res.status(500).json({ message: error.message });
  }
});



router.get("/subjects", async (req, res) => {
  const { departmentId } = req.query;
  try {
    const department = await Department.findById(departmentId)
      .select("subjects")
      .populate("subjects", "name _id") 

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.status(200).json(department); 
  } catch (error) {
    console.error("Error in department:", error);
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
