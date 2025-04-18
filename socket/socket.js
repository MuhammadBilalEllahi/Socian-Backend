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
    
    // Initialize Redis connections
    // this.initializeRedisConnections();
  }

  // async initializeRedisConnections() {
  //   try {
  //     await this.subscriber.connect();
  //     await this.publisher.connect();
  //     console.log("║ \x1b[33mRedis connections\x1b[0m: \x1b[32minitialized\x1b[0m                ║");
  //   } catch (error) {
  //     console.error("║ \x1b[31mRedis connection error\x1b[0m:", error.message, "║");
  //   }
  // }

  initSocketIO(app, server) {
    this.io = new Server(server, {
      transports: ["websocket"],
      cors: {
        origin: [process.env.FRONTEND_URL, process.env.APP_ID, process.env.LOCALHOST],
        methods: ["GET", "POST"],
      },
    });

    if(this.io) {
      console.log("║ \x1b[33mSocket server\x1b[0m: \x1b[32minitialized\x1b[0m                    ║");
    }
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`User connected: ${socket.id}`);

      this.setupDiscussionEvents(socket);
      this.setupLocationEvents(socket);
      this.handleDisconnect(socket);
    });

    // Enhanced subscriber event handling
    this.subscriber.on("message", (channel, message) => {
      try {
        console.log('║ \x1b[33mReceived message\x1b[0m:');
        console.log('║ Channel:', channel);
        console.log('║ Message:', message);
        
        // Parse the message if it's a string
        const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
        
        // Emit to the specific channel
        this.io.to(channel).emit("message", parsedMessage);
        console.log('║ \x1b[32mMessage emitted successfully to channel\x1b[0m:', channel);
      } catch (error) {
        console.error('║ \x1b[31mError processing message\x1b[0m:', error.message);
      }
    });

    // Add error handling for subscriber
    this.subscriber.client.on('error', (error) => {
      console.error('║ \x1b[31mSubscriber error\x1b[0m:', error.message);
    });
  }

  setupDiscussionEvents(socket) {
    socket.on("joinDiscussion", (discussionId) => {
      this.subscriber.subscribe(discussionId);
      
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

    socket.on("message", async (data) => {
      try {
        console.log('║ \x1b[33mReceived message event\x1b[0m:', data);
        
        const { discussionId, message, user } = data;
        
        if (!discussionId || !message || !user) {
          console.error('║ \x1b[31mInvalid message data\x1b[0m:', { discussionId, message, user });
          return;
        }

        const chatMessage = {
          _id: user._id,
          user: user.name,
          username: user.username,
          picture: user.picture,
          socketId: socket.id,
          message: message,
          timestamp: new Date(),
        };
        
        console.log('║ \x1b[33mPublishing message to discussion\x1b[0m:', discussionId);
        console.log('║ Message content:', chatMessage);
        
        const result = await this.publisher.publish(discussionId, JSON.stringify(chatMessage));
        console.log('║ \x1b[32mPublish result\x1b[0m:', result);
      } catch (error) {
        console.error('║ \x1b[31mError processing message\x1b[0m:', error.message);
      }
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