const mongoose = require("mongoose");

const gatheringSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  creatorId: { type: String, ref: "User", required: true },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  radius: { type: Number, required: true, default: 500 }, // in meters
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  attendees: [{
    userId: { type: String, ref: "User" },
    location: {
      latitude: Number,
      longitude: Number,
    },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Gathering", gatheringSchema);