import mongoose from "mongoose";
const Schema = mongoose.Schema;

const DiscussionChatMessageSchema = new Schema({
  discussionId: { type: String, required: true },
  userId: { type: String, required: true },
  socketId: { type: String },
  username: { type: String, required: true },
  picture: { type: String, default: '' },
  message: { type: String, required: true },
  timestamp: { type: Date, required: true },
});

export default mongoose.model("DiscussionChatMessage", DiscussionChatMessageSchema);
