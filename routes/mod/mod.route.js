const express = require('express');
const User = require('../../models/user/user.model');
const { getUserDetails } = require('../../utils/utils');
const router = express.Router();
const modCafeRouter = require('./cafe/cafe.mod.route');



router.get('/users', async (req, res) => {
    try {
        const { campusId } = getUserDetails(req);
        const { page = 1, limit = 10 } = req.query;

        const users = await User.find({ campusId })
            .select("name email role") // Fetch only necessary fields
            .sort({ createdAt: -1 }) // Sort by latest users first
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const totalUsers = await User.countDocuments({ campusId });

        res.status(200).json({
            users,
            totalUsers,
            totalPages: Math.ceil(totalUsers / limit),
            currentPage: Number(page),
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});



router.get('/users', async (req, res) => {
    try {
        const { campusId } = getUserDetails(req);
        const { role } = req.body
        const { page = 1, limit = 10 } = req.query;

        const users = await User.find({ campusId, role })
            .select("name email role") // Fetch only necessary fields
            .sort({ createdAt: -1 }) // Sort by latest users first
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const totalUsers = await User.countDocuments({ campusId });

        res.status(200).json({
            users,
            totalUsers,
            totalPages: Math.ceil(totalUsers / limit),
            currentPage: Number(page),
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});



router.use('/cafe', modCafeRouter)



module.exports = router;