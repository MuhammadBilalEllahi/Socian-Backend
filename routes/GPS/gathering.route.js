const express = require("express");
const router = express.Router();
const Gathering = require("../../models/gps/user.gathering.model");
const { check, validationResult } = require("express-validator");
const geolib = require('geolib');
const User = require("../../models/user/user.model")



// Create a new gathering
router.post("/", [
  check('title', 'Title is required').not().isEmpty(),
  check('location.latitude', 'Valid latitude is required').isFloat({ min: -90, max: 90 }),
  check('location.longitude', 'Valid longitude is required').isFloat({ min: -180, max: 180 }),
  check('radius', 'Valid radius is required').isInt({ min: 5 }),
  check('startTime', 'Valid start time is required').isISO8601(),
  check('endTime', 'Valid end time is required').isISO8601()
], async (req, res) => {
  console.log("POST /api/gatherings: Request body:", req.body);
  console.log("POST /api/gatherings: req.user:", req.user);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("POST /api/gatherings: Validation errors:", errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    if (!req.user || !req.user._id) {
      console.log("POST /api/gatherings: User not authenticated");
      return res.status(401).json({ error: "User not authenticated" });
    }

    const gathering = new Gathering({
      ...req.body,
      creatorId: req.user._id // Use _id instead of id
    });

    await gathering.save();
    console.log("POST /api/gatherings: Gathering saved:", gathering);
    res.status(201).json(gathering);
  } catch (err) {
    console.error("POST /api/gatherings: Error:", err.message);
    return res.status(400).json({ error: err.message });
  }
});
router.get("/all", async (req, res) => {
  try {
    const gatherings = await Gathering.find()
      .populate('creatorId', 'name')
      .select('title description location radius startTime endTime creatorId attendees');
    console.log('All gatherings:', JSON.stringify(gatherings, null, 2));
    res.json(gatherings);
  } catch (err) {
    console.error('Error fetching all gatherings:', err.message);
    res.status(500).send("Server error");
  }
});
// Get all upcoming gatherings
router.get("/upcoming", async (req, res) => {
  console.log('Upcoming gatherings endpoint hit'); // Add this line
  try {
    // @Rayyan-6 You should know these issues, havent you ever deployed an app to server?
    const offset = 5 * 60; // Pakistan Standard Time (UTC+5) in minutes
    const nowUTC = new Date();
    const karachiTime = new Date(nowUTC.getTime() + offset * 60000);


    const gatherings = await Gathering.find({
      startTime: { $gt: karachiTime } // Adjusted for timezone
    }).sort({ startTime: 1 });

    console.log(`Found ${gatherings.length} gatherings`); // Add this line
    res.json(gatherings);
  } catch (err) {
    console.error('Error in upcoming gatherings:', err.message); // Enhanced logging
    res.status(500).send("Server error");
  }
});

// Mark attendance for a gathering
// routes/gatherings.js
router.post('/:id/attend', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Location data required' });
    }

    const gathering = await Gathering.findById(req.params.id);
    if (!gathering) {
      return res.status(404).json({ message: 'Gathering not found' });
    }

    // Check existing attendance
    const existingIndex = gathering.attendees.findIndex(
      a => a.userId.toString() === req.user._id.toString()
    );

    if (existingIndex >= 0) {
      // Update existing attendance
      gathering.attendees[existingIndex] = {
        userId: req.user._id,
        name: req.user.name,
        location: { latitude, longitude },
        timestamp: new Date()
      };
    } else {
      // Add new attendance
      gathering.attendees.push({
        userId: req.user._id,
        name: req.user.name,
        location: { latitude, longitude },
        timestamp: new Date()
      });
    }

    await gathering.save();

    // Safely emit socket event if available
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('attendanceUpdate', {
          gatheringId: gathering._id,
          attendees: gathering.attendees
        });
      }
    } catch (socketError) {
      console.error('Socket emit error:', socketError);
      // Continue even if socket fails
    }

    return res.json({
      success: true,
      attendees: gathering.attendees
    });

  } catch (err) {
    console.error('Attendance error:', err);
    return res.status(500).json({
      message: 'Server error: ' + err.message
    });
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

// Delete a gathering
router.delete("/:id", async (req, res) => {
  console.log("DELETE /api/gatherings/:id: Request params:", req.params);
  console.log("DELETE /api/gatherings/:id: req.user:", req.user);

  try {
    // Validate ObjectId
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      console.log("DELETE /api/gatherings/:id: Invalid gathering ID");
      return res.status(400).json({ error: "Invalid gathering ID" });
    }

    // Find the gathering
    const gathering = await Gathering.findById(req.params.id);
    if (!gathering) {
      console.log("DELETE /api/gatherings/:id: Gathering not found");
      return res.status(404).json({ error: "Gathering not found" });
    }

    // Check if user is authorized (creator)
    if (gathering.creatorId.toString() !== req.user._id) {
      console.log("DELETE /api/gatherings/:id: User not authorized");
      return res.status(403).json({ error: "Not authorized to delete this gathering" });
    }

    // Delete the gathering
    await Gathering.findByIdAndDelete(req.params.id);
    console.log("DELETE /api/gatherings/:id: Gathering deleted:", req.params.id);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("DELETE /api/gatherings/:id: Error:", err.message);
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Invalid gathering ID" });
    }
    res.status(500).json({ error: "Server error" });
  }
});


router.post('/:id/update-location', [
  check('latitude', 'Valid latitude is required').isFloat({ min: -90, max: 90 }),
  check('longitude', 'Valid longitude is required').isFloat({ min: -180, max: 180 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('POST /:id/update-location: Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    if (!req.user) {
      console.error('POST /:id/update-location: User not authenticated');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { latitude, longitude } = req.body;
    const gathering = await Gathering.findById(req.params.id);
    if (!gathering) {
      console.error('POST /:id/update-location: Gathering not found');
      return res.status(404).json({ message: 'Gathering not found' });
    }

    const distance = geolib.getDistance(
      { latitude, longitude },
      { latitude: gathering.location.latitude, longitude: gathering.location.longitude }
    );

    let removed = false;
    const attendeeIndex = gathering.attendees.findIndex(
      a => a.userId.toString() === req.user._id.toString()
    );

    if (distance > gathering.radius) {
      if (attendeeIndex >= 0) {
        gathering.attendees.pull(gathering.attendees[attendeeIndex]._id);
        removed = true;
      }
    } else if (attendeeIndex >= 0) {
      gathering.attendees[attendeeIndex].location = { latitude, longitude };
      gathering.attendees[attendeeIndex].timestamp = new Date();
    } else {
      return res.status(400).json({ message: 'User not in attendees list' });
    }

    await gathering.save();
    console.log('POST /:id/update-location: Updated:', { removed, attendeeIndex, distance });

    try {
      const io = req.app.get('io');
      if (io) {
        io.to(gathering._id.toString()).emit('attendanceUpdate', {
          gatheringId: gathering._id,
          attendees: gathering.attendees,
        });
        console.log('POST /:id/update-location: Emitted attendanceUpdate:', gathering.attendees);
      }
    } catch (socketError) {
      console.error('POST /:id/update-location: Socket emit error:', socketError);
    }

    return res.json({ success: true, removed });
  } catch (err) {
    console.error('POST /:id/update-location: Error:', err.message);
    return res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

module.exports = router;