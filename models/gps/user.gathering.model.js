

// const mongoose = require("mongoose");

// const gatheringSchema = new mongoose.Schema({
//   title: { type: String, required: true },
//   description: { type: String },
//   creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   location: {
//     latitude: { type: Number, required: true },
//     longitude: { type: Number, required: true },
//   },
//   radius: { type: Number, required: true, default: 500 }, // in meters
//   startTime: { type: Date, required: true },
//   endTime: { type: Date, required: true },
//   attendees: [{
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//     name: { type: String, required: true }, // Added name field
//     location: {
//       latitude: { type: Number, required: true },
//       longitude: { type: Number, required: true },
//     },
//     timestamp: { type: Date, required: true, default: Date.now }
//   }],
//   createdAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model("Gathering", gatheringSchema);








const mongoose = require("mongoose");

const gatheringSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  societyId: { type: mongoose.Schema.Types.ObjectId, ref: "Society" }, // Optional society reference
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  radius: { type: Number, required: true, default: 500 }, // in meters
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  attendees: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    timestamp: { type: Date, required: true, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Gathering", gatheringSchema);