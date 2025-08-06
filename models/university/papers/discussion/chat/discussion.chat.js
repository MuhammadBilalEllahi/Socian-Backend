import mongoose from "mongoose";
const Schema = mongoose.Schema;

const DiscussionChatSchema = new Schema({
  _id: { type: String },
  messages: [
    {type: mongoose.Schema.Types.ObjectId, ref: 'DiscussionChatMessage'}
  ]
}, { _id: false });

export default mongoose.model("DiscussionChat", DiscussionChatSchema);
