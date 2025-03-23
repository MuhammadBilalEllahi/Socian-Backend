const express = require("express");
const geolib = require("geolib");

const Event = require("../../models/gps/event.model"); 
const EventAttendance = require("../../models/gps/event.attendance.model");
const UserLocation = require("../../models/gps/user.location.model");

const router = express.Router(); // Ensure you use express.Router()

module.exports = (io) => {
  // Create an event
  router.post("/create-event", async (req, res) => {
    const { societyId, area, startTime, endTime } = req.body;

    try {
      const event = new Event({ societyId, area, startTime, endTime });
      await event.save();

      res.status(200).json({ message: "Event created successfully", event });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Mark attendance
  router.post("/mark-attendance", async (req, res) => {
    const { userId, eventId, latitude, longitude } = req.body;

    try {
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const isInEventArea = geolib.isPointInPolygon(
        { latitude, longitude },
        event.area.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))
      );

      if (!isInEventArea) {
        return res.status(400).json({ message: "You are not in the event area" });
      }

      // Update attendance
      const attendance = await EventAttendance.findOneAndUpdate(
        { memberId: userId, eventId },
        { $set: { isPresent: true }, $inc: { timeSpent: 1 } }, // Increment time spent
        { upsert: true, new: true }
      );

      // Update user location
      await UserLocation.findOneAndUpdate(
        { userId },
        { latitude, longitude, timestamp: new Date() },
        { upsert: true, new: true }
      );

      // Fetch current participants in the event area
      const activeUsers = await EventAttendance.find({ eventId, isPresent: true })
        .populate("memberId", "name")
        .lean();

      // Emit real-time event update
      io.emit(`event-${eventId}-update`, activeUsers);

      res.status(200).json({ message: "Attendance updated", attendance });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Get attendees of an event
  router.get("/get-attendees/:eventId", async (req, res) => {
    try {
      const attendees = await EventAttendance.find({ eventId: req.params.eventId, isPresent: true })
        .populate("memberId", "name")
        .lean();

      res.status(200).json({ attendees, count: attendees.length });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  return router; // Ensure router is returned properly
};
