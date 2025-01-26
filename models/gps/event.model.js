const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
    societyId: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
    area: [[Number]], // Coordinates defining the gathering area
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
});

module.exports = mongoose.model("Event", eventSchema);
