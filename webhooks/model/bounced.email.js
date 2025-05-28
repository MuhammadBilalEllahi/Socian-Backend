const mongoose = require('mongoose');

const EmailSchema = new mongoose.Schema({
  email: { type: String, required: true },
  reason: { type: String },
  type: { type: String }, // Permanent, Transient, etc.
  subType: { type: String },
  subject: { type: String },
  emailId: { type: String },
  receivedAt: { type: Date, default: Date.now },
});

const Emailed = mongoose.model('Emailed', EmailSchema);
module.exports = Emailed;
