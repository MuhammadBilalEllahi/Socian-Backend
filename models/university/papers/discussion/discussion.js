import mongoose from "mongoose";
const Schema = mongoose.Schema;

const discussionSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'PastPaperItem' },
    discussioncomments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DiscussionComment' }],
    discussion_of: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true, ref: 'PastPaperItem' },
}, { timestamps: true , _id: false});

const Discussion = mongoose.model('Discussion', discussionSchema);
export default Discussion;