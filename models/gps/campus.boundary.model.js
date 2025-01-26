const mongoose = require("mongoose");

const campusBoundarySchema = new mongoose.Schema({
    name: { type: String, required: true },
    coordinates: { type: [[Number]], required: true }, // Array of [latitude, longitude]
});

module.exports = mongoose.model("CampusBoundary", campusBoundarySchema);
