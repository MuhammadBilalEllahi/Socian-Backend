const express = require('express');
const University = require('../../models/university/university.register.model');
const router = express.Router()

const NodeCache = require("node-cache");
const User = require('../../models/user/user.model');
const redisClient = require('../../db/reddis')

/**
 * In sign up page this route gets the universities with campus as 6757657-87687687 uni-campus
 */
// add cache here
router.get("/universities/grouped/campus", async (req, res) => {
    try {
        const cacheKey = "universitiesGroupedCampus";
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            console.log("Cache hit: universitiesGroupedCampus");
            return res.status(200).json(JSON.parse(cachedData)); // Return parsed JSON from cache
        }


        const universities = await University.find().populate({
            path: "campuses",
            populate: {
                path: "departments",
                model: "Department",
            },
        });

        const uniWithCampus = universities.flatMap(university =>
            university.campuses.map(campus => ({
                name: `${university.name} - ${campus.name}`, // Combine university and campus names
                _id: `${university._id}-${campus._id}`,    // Format _id as "universityId-campusId"
                domain: `${campus.emailPatterns.domain}`,
                regex: `${campus.emailPatterns.regex}`,
                departments: campus.departments.map(department =>
                (
                    {
                        name: department.name,
                        _id: department._id
                    }
                )
                )
            }))
        );

        await redisClient.set(cacheKey, JSON.stringify(uniWithCampus), 'EX', 36000);


        res.status(200).json(uniWithCampus);
    } catch (error) {
        console.error("Error getting campuses:", error);
        res.status(500).json({ message: error.message }); // Unable to create campus. Please try again.
    }
});

router.get('/usernames', async (req, res) => {
    try {



        const username = req.query.username


        const cacheKey = `username_${username}`; // ## delete username on username update
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            console.log("Cache hit: usernames");
            return res.status(200).json(true); // If the username exists in cache, return true
        }

        // console.log(username)
        if (!username) return res.status(302).json("Username not provided")
        const usernameExists = await User.findOne({ username }).select('username')
        // .lean()
        // .explain("executionStats");;
        // console.log("USername here", usernameExists)
        if (!usernameExists) return res.status(200).json(false)
        // usernameExists,
        // console.log(usernameExists)
        await redisClient.set(cacheKey, true, 'EX', 36000);

        res.status(200).json(true);
    } catch (error) {
        console.error("Error creating campus:", error);
        res.status(500).json({ message: error.message }); // Unable to create campus. Please try again.
    }
})


// const departmentExists = await Department.findOne({
//     _id: departmentId,
//     references: {
//       universityOrigin: universityId,
//       campusOrigin: campusId
//     }
//   })
//   if (!departmentExists) return res.status(404).json({ message: "No Department selected" })




//     router.get("/campus-grouped-departments", async (req, res) => {
//         try {
//             const cachedData = cache.get("CampusGroupedDepartments");
//             if (cachedData) {
//                 // console.log("Cache hit: CampusGroupedDepartments");
//                 return res.status(200).json(cachedData);
//             }

//             const universities = await University.find().populate("campuses");

//             const uniWithCampus = universities.flatMap(university =>
//                 university.campuses.map(campus => ({
//                     name: `${university.name} - ${campus.name}`, // Combine university and campus names
//                     _id: `${university._id}-${campus._id}`,    // Format _id as "universityId-campusId"
//                     domain: `${campus.emailPatterns.domain}`
//                 }))
//             );
//             // Store the data in the cache
//             cache.set("CampusGroupedDepartments", uniWithCampus);
//             res.status(200).json(uniWithCampus);
//         } catch (error) {
//             console.error("Error creating campus:", error);
//             res.status(500).json({ message: error.message }); // Unable to create campus. Please try again.
//         }
//     });




module.exports = router