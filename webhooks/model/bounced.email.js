import mongoose from 'mongoose';

const bouncedEmailSchema = new mongoose.Schema({
  email: { type: String, required: true },
  bounceType: { type: String, required: true },
  bounceSubType: { type: String },
  timestamp: { type: Date, default: Date.now },
  reason: { type: String },
  messageId: { type: String },
  recipient: { type: String },
  sender: { type: String },
  reportingMTA: { type: String },
  feedbackId: { type: String },
  userAgent: { type: String },
  ip: { type: String },
  originalMessage: { type: mongoose.Schema.Types.Mixed },
  processed: { type: Boolean, default: false },
  processedAt: { type: Date },
  actionTaken: { type: String, enum: ['none', 'marked_inactive', 'deleted', 'notified_admin'], default: 'none' }
});

const Emailed = mongoose.model('BouncedEmail', bouncedEmailSchema);
export default Emailed;
