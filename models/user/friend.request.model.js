import mongoose from "mongoose";
const Schema = mongoose.Schema;

const friendRequestSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User" }, // The friend user ID
    status: { type: String, enum: ['requested', 'accepted'], default: 'requested' }, // Status of the request
    requestedBy: { type: Schema.Types.ObjectId, ref: "User" }, // The user who initiated the request
    createdAt: { type: Date, default: Date.now }, // Timestamp for when the request was made
});


const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);
export default FriendRequest;



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
