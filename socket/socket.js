const { Server } = require("socket.io");
const UserLocation=require("../../backend/")

let io;

const initSocketIO = (app, server) => {
  io = new Server(server, {
    transports: ["websocket"],
    cors: {
      origin: [process.env.FRONTEND_URL, process.env.APP_ID, process.env.LOCALHOST],
      methods: ["GET", "POST"],
    },
  });

  const discussionUsers = {};
  const discussionUserCount = {};
  const eventAttendees = {}; // Stores attendee locations by socket ID

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    /** ---------------- DISCUSSION EVENTS ---------------- **/
    socket.on("joinDiscussion", (discussionId) => {
      socket.join(discussionId);

      if (!discussionUsers[discussionId]) {
        discussionUsers[discussionId] = new Set();
      }

      discussionUsers[discussionId].add(socket.id);
      io.to(discussionId).emit("users", discussionUsers);
      io.to(discussionId).emit("usersCount", discussionUsers[discussionId].size);
    });

    socket.on("message", (discussionId, message, user) => {
      const chatMessage = {
        _id: user._id,
        user: user.name,
        username: user.username,
        picture: user.picture,
        socketId: socket.id,
        message: message,
        timestamp: new Date(),
      };

      io.to(discussionId).emit("message", chatMessage);
    });

    /** ---------------- LOCATION UPDATES ---------------- **/

    // Listen for location updates from attendees
    socket.on("updateLocation", async (data) => {
      const { userId, name, latitude, longitude, radius } = data;

      eventAttendees[socket.id] = { userId, name, latitude, longitude, radius };

      // Save or update location in the database
      await UserLocation.findOneAndUpdate(
        { userId },
        { latitude, longitude, timestamp: new Date() },
        { upsert: true }
      );

      // Broadcast updated location to all clients
      io.emit("attendeeLocationUpdate", {
        id: userId,
        name,
        latitude,
        longitude,
      });

      console.log(`Location update from ${name} (${userId}): ${latitude}, ${longitude}`);
    });

    // Send all attendee locations to a newly connected client
    socket.on("requestAttendees", () => {
      socket.emit("attendeesList", Object.values(eventAttendees));
    });

    /** ---------------- DISCONNECT HANDLING ---------------- **/
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);

      // Remove user from discussion rooms
      Object.keys(discussionUsers).forEach((discussionId) => {
        if (discussionUsers[discussionId].has(socket.id)) {
          discussionUsers[discussionId].delete(socket.id);
          discussionUserCount[discussionId] = discussionUsers[discussionId].size;

          io.to(discussionId).emit("users", discussionUsers);
          io.to(discussionId).emit("usersCount", discussionUsers[discussionId].size);
        }
      });

      // Remove attendee from the location tracking
      if (eventAttendees[socket.id]) {
        io.emit("attendeeDisconnected", { userId: eventAttendees[socket.id].userId });
        delete eventAttendees[socket.id];
      }
    });
  });
};

// Attach io to the app object for global access
const attachSocketToApp = (app, server) => {
  initSocketIO(app, server);
  app.set("io", io); // Store io instance in app
};

module.exports = { initSocketIO, attachSocketToApp };