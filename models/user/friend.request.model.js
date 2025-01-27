const { default: mongoose } = require("mongoose");

const friendSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // The friend user ID
    status: { type: String, enum: ['requested', 'accepted'], default: 'requested' }, // Status of the request
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // The user who initiated the request
    createdAt: { type: Date, default: Date.now }, // Timestamp for when the request was made
});


const FriendRequest = mongoose.model("FriendRequest", friendSchema);

module.exports = FriendRequest;
