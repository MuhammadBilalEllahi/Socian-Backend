import mongoose from "mongoose";

const userLocationSchema = new mongoose.Schema({
    // userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userId: { type: String, ref: "User", required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("UserLocation", userLocationSchema);
