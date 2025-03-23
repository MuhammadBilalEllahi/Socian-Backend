const { default: mongoose } = require("mongoose");

const discussionSchema = new mongoose.Schema({
    discussioncomments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DiscussionComment' }],
    discussion_of: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true, ref: 'PastPaperItem' },
}, { timestamps: true });

const Discussion = mongoose.model('Discussion', discussionSchema);
module.exports = Discussion;