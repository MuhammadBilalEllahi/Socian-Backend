const express = require("express");
const geolib = require("geolib");
const UserLocation = require("../../models/gps/user.location.model");
const CampusBoundary = require("../../models/gps/campus.boundary.model");
const User = require("../../models/user/user.model"); // Assuming you have a User model for name lookup

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

    const location = await UserLocation.findOneAndUpdate(
      { userId: senderId },
      { latitude, longitude, timestamp: new Date() },
      { upsert: true, new: true }
    );

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

// New endpoint: Get users within a radius
router.get("/users-in-radius", async (req, res) => {
  const { lat, lng, radius } = req.query;

  try {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusInMeters = parseFloat(radius);

    if (!latitude || !longitude || !radiusInMeters) {
      return res.status(400).json({ message: "Missing required parameters: lat, lng, radius" });
    }

    // Fetch all user locations
    const userLocations = await UserLocation.find().lean();

    // Filter users within the radius using geolib
    const usersInRadius = await Promise.all(
      userLocations
        .filter((loc) => {
          const distance = geolib.getDistance(
            { latitude, longitude },
            { latitude: loc.latitude, longitude: loc.longitude }
          );
          return distance <= radiusInMeters;
        })
        .map(async (loc) => {
          const user = await User.findById(loc.userId).select("name").lean();
          return {
            id: loc.userId,
            name: user ? user.name : "Unknown",
            latitude: loc.latitude,
            longitude: loc.longitude,
          };
        })
    );

    res.status(200).json(usersInRadius);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;