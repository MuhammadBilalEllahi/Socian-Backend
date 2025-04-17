const { Server } = require("socket.io");
const UserLocation = require("../../backend/models/gps/user.location.model");
const valkeyClient = require("../db/valkey");

class SocketServer {
  constructor() {
    this.io = null;
    this.discussionUsers = {};
    this.discussionUserCount = {};
    this.eventAttendees = {};
    this.subscriber = new valkeyClient('subscriber');
    this.publisher = new valkeyClient('publisher ');
  }

  initSocketIO(app, server) {
    this.io = new Server(server, {
      transports: ["websocket"],
      cors: {
        origin: [process.env.FRONTEND_URL, process.env.APP_ID, process.env.LOCALHOST],
        methods: ["GET", "POST"],
      },
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`User connected: ${socket.id}`);

      this.setupDiscussionEvents(socket);
      this.setupLocationEvents(socket);
      this.handleDisconnect(socket);
    });
  }

  setupDiscussionEvents(socket) {
    socket.on("joinDiscussion", (discussionId) => {
      console.log(`User joined discussion: ${discussionId}`);
      socket.join(discussionId);

      if (!this.discussionUsers[discussionId]) {
        this.discussionUsers[discussionId] = new Set();
      }

      this.discussionUsers[discussionId].add(socket.id);
      console.log("discussionUsers", this.discussionUsers);
      this.io.to(discussionId).emit("users", this.discussionUsers);
      this.io.to(discussionId).emit("usersCount", this.discussionUsers[discussionId].size);
    });

    socket.on("removeUserFromDiscussion", (discussionId) => {
      console.log(`User removed from discussion: ${discussionId}`);
      socket.leave(discussionId);
      this.discussionUsers[discussionId]?.delete(socket.id);
      this.io.to(discussionId).emit("users", this.discussionUsers);
      this.io.to(discussionId).emit("usersCount", this.discussionUsers[discussionId]?.size ?? 0);
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

      this.io.to(discussionId).emit("message", chatMessage);
    });
  }

  setupLocationEvents(socket) {
    socket.on("updateLocation", async (data) => {
      const { userId, name, latitude, longitude, radius } = data;

      this.eventAttendees[socket.id] = { userId, name, latitude, longitude, radius };

      // Save or update location in the database
      // await UserLocation.findOneAndUpdate(
      //   { userId },
      //   { latitude, longitude, timestamp: new Date() },
      //   { upsert: true }
      // );

      this.io.emit("attendeeLocationUpdate", {
        id: userId,
        name,
        latitude,
        longitude,
      });

      console.log(`Location update from ${name} (${userId}): ${latitude}, ${longitude}`);
    });

    socket.on("requestAttendees", () => {
      socket.emit("attendeesList", Object.values(this.eventAttendees));
    });
  }

  handleDisconnect(socket) {
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);

      Object.keys(this.discussionUsers).forEach((discussionId) => {
        if (this.discussionUsers[discussionId].has(socket.id)) {
          this.discussionUsers[discussionId].delete(socket.id);
          this.discussionUserCount[discussionId] = this.discussionUsers[discussionId].size;

          this.io.to(discussionId).emit("users", this.discussionUsers);
          this.io.to(discussionId).emit("usersCount", this.discussionUsers[discussionId].size);
        }
      });

      if (this.eventAttendees[socket.id]) {
        this.io.emit("attendeeDisconnected", { userId: this.eventAttendees[socket.id].userId });
        delete this.eventAttendees[socket.id];
      }
    });
  }

  attachToApp(app, server) {
    this.initSocketIO(app, server);
    app.set("io", this.io);
    return this.io;
  }
}

const socketServer = new SocketServer();
module.exports = {
  initSocketIO: (app, server) => socketServer.initSocketIO(app, server),
  attachSocketToApp: (app, server) => socketServer.attachToApp(app, server)
};