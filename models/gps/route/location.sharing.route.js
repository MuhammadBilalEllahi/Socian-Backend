const express = require("express");
const geolib = require("geolib");
const UserLocation = require("../../models/userLocation.model");
const CampusBoundary = require("../../models/campusBoundary.model");

const router = express.Router();

router.post("/share-location", async (req, res) => {
    const { senderId, receiverId, latitude, longitude } = req.body;

    try {
        const campus = await CampusBoundary.findOne();

        const isInCampus = geolib.isPointInPolygon(
            { latitude, longitude },
            campus.coordinates.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))
        );

        if (!isInCampus) {
            return res.status(400).json({ message: "You are not in the university premises" });
        }

        const location = new UserLocation({
            userId: senderId,
            latitude,
            longitude,
        });

        await location.save();

        res.status(200).json({ message: "Location shared successfully", location });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

router.get("/get-location/:userId", async (req, res) => {
    try {
        const location = await UserLocation.findOne({ userId: req.params.userId }).sort({ timestamp: -1 });

        if (!location) {
            return res.status(404).json({ message: "Location not found" });
        }

        const campus = await CampusBoundary.findOne();

        const isInCampus = geolib.isPointInPolygon(
            { latitude: location.latitude, longitude: location.longitude },
            campus.coordinates.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))
        );

        if (!isInCampus) {
            return res.status(200).json({ message: "User is not in the university premises" });
        }

        res.status(200).json({ location });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
