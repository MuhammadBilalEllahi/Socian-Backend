const mongoose = require("mongoose");

const eventAttendanceSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isPresent: { type: Boolean, default: false },
    timeSpent: { type: Number, default: 0 }, // in minutes
});

module.exports = mongoose.model("EventAttendance", eventAttendanceSchema);
