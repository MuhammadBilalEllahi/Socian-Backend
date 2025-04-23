const express = require("express");
const router = express.Router();
const Gathering = require("../../models/gps/user.gathering.model");
const { check, validationResult } = require("express-validator");
const geolib = require('geolib');

// Create a new gathering
router.post("/", [
  check('title', 'Title is required').not().isEmpty(),
  check('location.latitude', 'Valid latitude is required').isFloat({ min: -90, max: 90 }),
  check('location.longitude', 'Valid longitude is required').isFloat({ min: -180, max: 180 }),
  check('radius', 'Radius is required').isInt({ min: 100 }),
  check('startTime', 'Valid start time is required').isISO8601(),
  check('endTime', 'Valid end time is required').isISO8601()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const gathering = new Gathering({
      ...req.body,
      creatorId: req.user.id // Assuming you have authentication middleware
    });

    await gathering.save();
    res.status(201).json(gathering);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Get all upcoming gatherings
router.get("/upcoming", async (req, res) => {
    console.log('Upcoming gatherings endpoint hit'); // Add this line
    try {
      const gatherings = await Gathering.find({
        startTime: { $gt: new Date() }
      }).sort({ startTime: 1 });
  
      console.log(`Found ${gatherings.length} gatherings`); // Add this line
      res.json(gatherings);
    } catch (err) {
      console.error('Error in upcoming gatherings:', err.message); // Enhanced logging
      res.status(500).send("Server error");
    }
  });

// Mark attendance for a gathering
router.post("/:id/attend", [
  check('latitude', 'Valid latitude is required').isFloat({ min: -90, max: 90 }),
  check('longitude', 'Valid longitude is required').isFloat({ min: -180, max: 180 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const gathering = await Gathering.findById(req.params.id);
    if (!gathering) {
      return res.status(404).json({ msg: "Gathering not found" });
    }

    // Check if gathering is currently active
    const now = new Date();
    if (now < gathering.startTime || now > gathering.endTime) {
      return res.status(400).json({ msg: "Gathering is not active" });
    }

    // Check if user is within radius
    const distance = geolib.getDistance(
      { latitude: gathering.location.latitude, longitude: gathering.location.longitude },
      { latitude: req.body.latitude, longitude: req.body.longitude }
    );

    if (distance > gathering.radius) {
      return res.status(400).json({ msg: "You are not within the gathering radius" });
    }

    // Remove existing attendance if any
    gathering.attendees = gathering.attendees.filter(
      attendee => attendee.userId.toString() !== req.user.id
    );

    // Add new attendance
    gathering.attendees.push({
      userId: req.user.id,
      location: {
        latitude: req.body.latitude,
        longitude: req.body.longitude
      }
    });

    await gathering.save();
    res.json(gathering);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Get gathering details
router.get("/:id", async (req, res) => {
  try {
    const gathering = await Gathering.findById(req.params.id);
    if (!gathering) {
      return res.status(404).json({ msg: "Gathering not found" });
    }

    res.json(gathering);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;