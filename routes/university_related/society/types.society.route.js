const express = require('express');
const SocietyType = require('../../../models/society/society.type.model');

const router = express.Router();



router.post('/create-community-types', async (req, res) => {
    try {

        const publicMember = await SocietyType.create({
            societyType: "public",
            totalPublic: 0,
        });

        const privateMember = await SocietyType.create({
            societyType: "private",
            totalPrivate: 0,
        });

        const restrictedMember = await SocietyType.create({
            societyType: "restricted",
            totalRestricted: 0,
        });

        res.status(201).json({
            message: "Members entries created successfully",
            data: {
                publicMember,
                privateMember,
                restrictedMember
            }
        });
    } catch (error) {
        console.error("Error while creating member entries:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;