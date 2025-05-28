const express = require("express");
const router = express.Router();
const Message = require("../../models/1to1messages/messages.model");
const { sendNotification } = require("../../socket/socket");

// Fetch messages between two users
router.get("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const currentUserId = req.user._id;
    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, recipientId: userId },
        { senderId: userId, recipientId: currentUserId },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(50);
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages", error: error.message });
  }
});

// Send a message
router.post("/", async (req, res) => {
  try {
    const { recipientId, content, status } = req.body;
    const senderId = req.user._id;
    
    const message = new Message({
      senderId,
      recipientId,
      content,
      status: status || "sent",
      createdAt: new Date(),
    });
    await message.save();

    // Emit Socket.IO event for real-time delivery
    req.io.to(`conversation:${[senderId.toString(), recipientId.toString()].sort().join(':')}`).emit("newMessage", message);

    // Send notification to recipient
    sendNotification(recipientId, {
      type: "message",
      sender: senderId,
      message: content,
      timestamp: message.createdAt,
    });

    res.status(201).json({ message: "Message sent", data: message });
  } catch (error) {
    res.status(500).json({ message: "Failed to send message", error: error.message });
  }
});













module.exports = router;