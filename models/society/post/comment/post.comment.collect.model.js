import mongoose from "mongoose";
const Schema = mongoose.Schema;

const postCommentCollectionSchema = new Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "PostComment" }],
  isDeleted: { type: Boolean, default: false },
});

const PostCommentCollection = mongoose.model(
  "PostCommentCollection",
  postCommentCollectionSchema
);
export default PostCommentCollection;
