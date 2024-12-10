const express = require("express");
const SocietyType = require("../../../models/society/society.type.model");
const Society = require("../../../models/society/society.model");
const router = express.Router();

// For Alumni
router.post("/request-verification", async (req, res) => {
    try {
        const { campusModeratorId, requestedBy, requiredDocuments } = req.body;

        const newRequest = new VerificationRequest({
            alumni: alumniId,
            campusModerator: campusModeratorId,
            requiredDocuments: requiredDocuments,
            requestedBy,
        });

        await newRequest.save();

        return res.status(201).json({ message: "Verification request sent", request: newRequest });
    } catch (error) {
        console.error("Error in verification request: ", error);
        res.status(500).json("Internal Server Error");
    }
});



module.exports = router;
