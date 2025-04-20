const mongoose = require("mongoose");

const DiscussionChatMessageSchema = new mongoose.Schema({
  discussionId: { type: String, required: true },
  userId: { type: String, required: true },
  socketId: { type: String },
  username: { type: String, required: true },
  picture: { type: String, default: '' },
  message: { type: String, required: true },
  timestamp: { type: Date, required: true },
});

module.exports = mongoose.model("DiscussionChatMessage", DiscussionChatMessageSchema);
