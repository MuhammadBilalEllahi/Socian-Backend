const mongoose = require("mongoose");

const DiscussionChatSchema = new mongoose.Schema({
  _id: { type: String },
  messages: [
    {type: mongoose.Schema.Types.ObjectId, ref: 'DiscussionChatMessage'}
  ]
}, { _id: false });

module.exports = mongoose.model("DiscussionChat", DiscussionChatSchema);
