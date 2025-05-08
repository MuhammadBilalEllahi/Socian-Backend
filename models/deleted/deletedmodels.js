const mongoose = require('mongoose');

const deletedDataSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  removedAt: { type: Date, default: Date.now },
  removedMedia: [],
  deletedPosts:[{
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    deletedAt: { type: Date, default: Date.now },
  }]
});

module.exports = mongoose.model('DeletedDataCollection', deletedDataSchema);
