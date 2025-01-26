const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const postCommentCollectionSchema = new Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "PostComment" }],
});

const PostCommentCollection = mongoose.model(
  "PostCommentCollection",
  postCommentCollectionSchema
);
module.exports = PostCommentCollection;
