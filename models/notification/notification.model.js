
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['comment', 'like', 'follow'], required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' }, //Optional, For Posts notifications
//   reviewId: { type: mongoose.Schema.Types.ObjectId, ref: '' }, // Optional, For Reviews notifications
//   answersId: { type: mongoose.Schema.Types.ObjectId, ref: '' }, // Optional, For Answers notifications
  message: { type: String },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});


// notificationSchema.pre('save', function (next) {
//   if (this.isNew) {
//     // this.createdAt = Date.now();
// socket.emit('notification', {
//       type: this.type,
//       recipient: this.recipient,
//       sender: this.sender,
//       post: this.post,
//       message: this.message,
//       read: this.read,
//       createdAt: this.createdAt,
//     });
//   }
//   next();
// });

module.exports = mongoose.model('Notification', notificationSchema);

