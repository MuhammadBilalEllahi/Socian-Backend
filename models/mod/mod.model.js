// models/ModUser.js
const mongoose = require("mongoose");
const ModActions = require("./modActions");

const modUserSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  timePeriod: {
    type: String,
    enum: ['year', 'six_month'],
    required: true,
  },
  isNotModAnymore:{
    type: Boolean,
    default: false
  },
  reason: {
    type: String,
    required: true,
  },
  notModAnymoreReason: {
    type: String,
    // required: true,
  },
  universityOrigin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'University',
    required: true,
  },
  campusOrigin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: true,
  },
  actionsDone: {
    type: [String],
    enum: Object.values(ModActions),
    default: [],
  },
  actionsDoneCount: {
    type: Number,
    default: 0,
  },
});



module.exports = mongoose.model("ModUser", modUserSchema);
