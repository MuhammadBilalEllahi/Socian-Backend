import mongoose from "mongoose";

const campusBoundarySchema = new mongoose.Schema({
    name: { type: String, required: true },
    coordinates: { type: [[Number]], required: true }, // Array of [latitude, longitude]
});

export default mongoose.model("CampusBoundary", campusBoundarySchema);
