const { Server } = require("socket.io");
const valkeyClient = require("../db/valkey.pubsub");
const DiscussionChatMessage = require("../models/university/papers/discussion/chat/discussion.chat.message");
const DiscussionChat = require("../models/university/papers/discussion/chat/discussion.chat");
// const {produceMessage, startConsumer} = require("../db/kafka/kafka");
class SocketServer {
  constructor() {
    this.io = null;
    this.discussionUsers = new Map();
    this.discussionUserCount = {};
    this.eventAttendees = {};
    this.subscriber = new valkeyClient('subscriber');
    this.publisher = new valkeyClient('publisher');
    this.streamConsumers = {};
    
    // Initialize Redis connections
    this.initializeRedisConnections();
    // startConsumer('discussion-chat');
  }

  async startDiscussionStreamConsumer(discussionId) {
    if (this.streamConsumers[discussionId]) return;

    const streamKey = `stream:${discussionId}`;
    const group = `discussion-group-${discussionId}`;
    const consumer = `consumer-${discussionId}`;

    try {
      // Create stream group if it doesn't exist
      await this.publisher.xGroupCreate(streamKey, group, '0', { MKSTREAM: true });
      
      const loop = async () => {
        try {
          const response = await this.subscriber.xReadGroup(
            'GROUP',
            group,
            consumer,
            { key: streamKey, id: '>' },
            { COUNT: 10, BLOCK: 5000 }
          );

          console.log("RESPONSE", JSON.stringify(response, null, 2))
          const [streamData2] = response;
          const [streamName2, messages2] = streamData2;

          console.log("DATA RESPONSE",streamData2, streamName2, messages2 )

          if (response && response != null && response.length > 0) {
            const [streamData] = response;
            const [streamName, messages] = streamData;

            console.log("DATA RESPONSE", streamData, streamName, messages)

            if (messages && messages.length > 0) {
              console.log("LENGHT", messages.length)
              for (const [messageId, fields] of messages) {
                // Convert array of fields to object
                const messageData = {};
                for (let i = 0; i < fields.length; i += 2) {
                  const key = fields[i];
                  const value = fields[i + 1];
                  try {
                    messageData[key] = JSON.parse(value);
                    console.log("KEY", key, messageData[key], value)
                  } catch {
                    messageData[key] = value;
                    console.log("KEY else", key, messageData[key], value)
                  }
                }
                console.log("MESSAGE DATa", messageData)

                const {type,message,user,timestamp,discussionId, socketId} = messageData;
                const {name,username,picture,_id} = user;
                // Emit the parsed message
                this.io.to(discussionId).emit("message", {
                  type: type,
                  message: message,
                  socketId: socketId,
                  // user: user,
                  name: name,
                  username: username,
                  picture: picture,
                  _id: _id,

                  timestamp: timestamp,
                  discussionId: discussionId,
                  id: messageId
                });

                console.log("\n\n\n SENDING THIS", {
                  type: type,
                  message: message,
                  user: user,
                  name: name,
                  username: username,
                  picture: picture,
                  _id: _id,

                  timestamp: timestamp,
                  discussionId: discussionId,
                  id: messageId
                })

                // Acknowledge message
                await this.subscriber.xAck(streamKey, group, messageId);
              }
            }
          }
        } catch (err) {
          if (err.message.includes('NOGROUP')) {
            await this.publisher.xGroupCreate(streamKey, group, '0', { MKSTREAM: true });
          } else {
            console.error(`Stream read error for ${streamKey}:`, err.message);
          }
        } finally {
          setTimeout(loop, 1000);
        }
      };

      this.streamConsumers[discussionId] = true;
      loop();
    } catch (error) {
      console.error(`Error setting up stream consumer for ${discussionId}:`, error.message);
      delete this.streamConsumers[discussionId];
    }
  }

  async createStreamGroupIfNotExists(streamName, groupName) {
    try {
      await this.publisher.xGroupCreate(streamName, groupName, '0', { MKSTREAM: true });
    } catch (err) {
      if (!err.message.includes("BUSYGROUP")) {
        console.error("Error creating group:", err.message);
      }
    }
  }

  async initializeRedisConnections() {
    try {
      await this.subscriber.connect();
      await this.publisher.connect();
      console.log("║ \x1b[33mRedis connections\x1b[0m: \x1b[32minitialized\x1b[0m                ║");
    } catch (error) {
      console.error("║ \x1b[31mRedis connection error\x1b[0m:", error.message, "║");
    }
  }

  initSocketIO(app, server) {
    this.io = new Server(server, {
      transports: ["websocket"],
      cors: {
        origin: [process.env.FRONTEND_URL, process.env.APP_ID, process.env.LOCALHOST],
        methods: ["GET", "POST"],
      },
    });

    if (this.io) {
      console.log("║ \x1b[33mSocket server\x1b[0m: \x1b[32minitialized\x1b[0m                    ║");
    }
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`\x1b[31m║\x1b[0m  \x1b[36m•\x1b[0m \x1b[33mUser connected\x1b[0m: \x1b[4m\x1b[32m${socket.id}\x1b[0m       \x1b[31m║\x1b[0m`);

      this.setupDiscussionEvents(socket);
      this.setupLocationEvents(socket);
      this.handleDisconnect(socket);
    });

    // Enhanced subscriber event handling
    // this.subscriber.on("message", async (channel, message) => {
    //   try {
    //     console.log('║ \x1b[33mReceived message\x1b[0m:');
    //     console.log('║ Channel:', channel);
    //     console.log('║ Message:', message);

    //     // Parse the message if it's a string
    //     const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;

    //     // Emit to the specific channel
    //     this.io.to(channel).emit("message", parsedMessage);
    //     // await produceMessage(channel, channel,parsedMessage);
    //     console.log('║ \x1b[32mMessage emitted successfully to channel\x1b[0m:', channel);
    //   } catch (error) {
    //     console.error('║ \x1b[31mError processing message\x1b[0m:', error.message);
    //   }
    // });

    // Add error handling for subscriber
    this.subscriber.client.on('error', (error) => {
      console.error('║ \x1b[31mSubscriber error\x1b[0m:', error.message);
    });
  }

  setupDiscussionEvents(socket) {
    socket.on("joinDiscussion", async (discussionId) => {
      // this.subscriber.subscribe(discussionId);
      this.startDiscussionStreamConsumer(discussionId)

      console.log(`User joined discussion: ${discussionId}`);
      socket.join(discussionId);

      if (!this.discussionUsers.has(discussionId)) {
        this.discussionUsers.set(discussionId, new Set());
      }

      this.discussionUsers.get(discussionId).add(socket.id);
      console.log("discussionUsers", this.discussionUsers);
      this.io.to(discussionId).emit("users", this.discussionUsers);
      this.io.to(discussionId).emit("usersCount", this.discussionUsers.get(discussionId)?.size ?? 0);
    });

    socket.on("removeUserFromDiscussion", (discussionId) => {
      console.log(`User removed from discussion: ${discussionId}`);
      socket.leave(discussionId);

      this.discussionUsers.get(discussionId)?.delete(socket.id);
      this.io.to(discussionId).emit("usersCount", this.discussionUsers.get(discussionId)?.size ?? 0);
      this.io.to(discussionId).emit("users", this.discussionUsers);
    });

    socket.on("message", async (data) => {
      try {
        console.log('║ \x1b[33mReceived message event\x1b[0m:', data);

        const { discussionId, message, user, timestamp = new Date() } = data;

        if (!discussionId || !message || !user) {
          console.error('║ \x1b[31mInvalid message data\x1b[0m:', { discussionId, message, user });
          return;
        }
        

        const streamMessage = {
          discussionId: discussionId,
          type: 'message',
          message: message,
          socketId: socket.id,
          user: {
            _id: user._id,
            name: user.name,
            username: user.username,
            picture: user.picture
          },
          timestamp: timestamp.toISOString(),
        };

        // Add to Redis stream
        try {
          const messageId = await this.publisher.xAdd(`stream:${discussionId}`, '*', streamMessage);
          console.log('║ \x1b[32mMessage added to stream\x1b[0m:', discussionId, 'with ID:', messageId);
        } catch (e) {
          console.error("║ \x1b[31mError writing to stream\x1b[0m:", e.message);
        }
      } catch (error) {
        console.error('║ \x1b[31mError processing message\x1b[0m:', error.message);
      }
    });
  }

  setupLocationEvents(socket) {
    socket.on("updateLocation", async (data) => {
      const { userId, name, latitude, longitude, radius } = data;

      this.eventAttendees[socket.id] = { userId, name, latitude, longitude, radius };

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

      for (const [discussionId, userSet] of this.discussionUsers.entries()) {
        if (userSet.has(socket.id)) {
          userSet.delete(socket.id);
          this.discussionUserCount[discussionId] = userSet.size;

          this.io.to(discussionId).emit("users", this.discussionUsers);
          this.io.to(discussionId).emit("usersCount", userSet.size);
        }
      }

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