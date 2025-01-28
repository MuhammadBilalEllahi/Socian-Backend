const { default: mongoose } = require("mongoose");

const friendSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // The friend user ID
    status: { type: String, enum: ['requested', 'accepted'], default: 'requested' }, // Status of the request
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // The user who initiated the request
    createdAt: { type: Date, default: Date.now }, // Timestamp for when the request was made
});


const FriendRequest = mongoose.model("FriendRequest", friendSchema);

module.exports = FriendRequest;



// const FriendSchema = new mongoose.Schema({
//     user1: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User',
//         required: true,
//     },
//     user2: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User',
//         required: true,
//     },
//     status: {
//         type: String,
//         enum: ['pending', 'accepted', 'rejected', 'blocked'],
//         default: 'pending',
//     },
//     createdAt: {
//         type: Date,
//         default: Date.now,
//     },
//     updatedAt: {
//         type: Date,
//         default: Date.now,
//     },
// });

// module.exports = mongoose.model('Friend', FriendSchema);
