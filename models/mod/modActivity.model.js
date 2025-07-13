const mongoose = require("mongoose");

const modActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  method: String,
  endpoint: String,
  role: String,
  body: mongoose.Schema.Types.Mixed,
  query: mongoose.Schema.Types.Mixed,
  ip: String,
  timestamp: { type: Date, default: Date.now },
  campusId: { type: mongoose.Schema.Types.ObjectId, ref: "Campus" },
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: "University" },
  // Undo tracking fields
  isUndone: { type: Boolean, default: false },
  undoneAt: { type: Date },
  undoneBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  undoReason: String,
  canBeUndone: { type: Boolean, default: true }, // Some actions might not be reversible
  undoAttempts: { type: Number, default: 0 },
});

module.exports = mongoose.model("ModActionLog", modActivitySchema);
