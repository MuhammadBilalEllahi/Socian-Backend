// const { Server } = require("socket.io");
// const valkeyClient = require("../db/valkey.pubsub");
// const DiscussionChatMessage = require("../models/university/papers/discussion/chat/discussion.chat.message");
// const DiscussionChat = require("../models/university/papers/discussion/chat/discussion.chat");
// const Gathering = require("../models/gps/user.gathering.model");
// class SocketServer {
//   constructor() {
//     this.io = null;
//     this.discussionUsers = new Map();
//     this.discussionUserCount = {};
//     this.eventAttendees = {};
//     this.gatheringRooms = new Map();
//     this.gatheringAttendees = new Map();
//     this.subscriber = new valkeyClient('subscriber');
//     this.publisher = new valkeyClient('publisher');
//     this.streamConsumers = {};

//     this.initializeRedisConnections();
//   }


//   setupNotificationEvents(socket) {
//     // Client joins their personal notification room
//     socket.on("joinNotifications", (userId) => {
//       socket.join(`user:${userId}`);
//       console.log(`User ${userId} joined their notification room.`);
//     });

//     // Send a notification to a specific user
//     socket.on("sendNotification", async ({ toUserId, notification }) => {
//       if (!toUserId || !notification) return;
//       console.log("SEDNING NOTIFICATION", toUserId, notification);

//       try {
//         console.log("BEFORE EMITNIG")
//         this.io.to(`user:${toUserId}`).emit("newNotification", notification);
//         console.log("AFTER EMITNIG")

//         console.log(`Notification sent to user:${toUserId}`);
//       } catch (error) {
//         console.error("Failed to send notification:", error.message);
//       }
//     });
//   }



//   async startDiscussionStreamConsumer(discussionId, blockTime = 1000) {
//     if (this.streamConsumers[discussionId]) return;

//     const streamKey = `stream:${discussionId}`;
//     const group = `discussion-group-${discussionId}`;
//     const consumer = `consumer-${discussionId}`;

//     try {
//       await this.publisher.xGroupCreate(streamKey, group, '0', { MKSTREAM: true });

//       const loop = async () => {
//         try {
//           const response = await this.subscriber.xReadGroup(
//             'GROUP',
//             group,
//             consumer,
//             { key: streamKey, id: '>' },
//             { COUNT: 10, BLOCK: blockTime }
//           );

//           if (response && response.length > 0) {
//             const [streamData] = response;
//             const [streamName, messages] = streamData;

//             if (messages && messages.length > 0) {
//               for (const [messageId, fields] of messages) {
//                 const messageData = {};
//                 for (let i = 0; i < fields.length; i += 2) {
//                   const key = fields[i];
//                   const value = fields[i + 1];
//                   try {
//                     messageData[key] = JSON.parse(value);
//                   } catch {
//                     messageData[key] = value;
//                   }
//                 }

//                 await this.subscriber.xAck(streamKey, group, messageId);
//               }
//             }
//           }
//         } catch (err) {
//           if (err.message.includes('NOGROUP')) {
//             await this.publisher.xGroupCreate(streamKey, group, '0', { MKSTREAM: true });
//           } else {
//             console.error(`Stream read error for ${streamKey}:`, err.message);
//           }
//         } finally {
//           setTimeout(loop, 100);
//         }
//       };

//       this.streamConsumers[discussionId] = true;
//       loop();
//     } catch (error) {
//       console.error(`Error setting up stream consumer for ${discussionId}:`, error.message);
//       delete this.streamConsumers[discussionId];
//     }
//   }

//   async createStreamGroupIfNotExists(streamName, groupName) {
//     try {
//       await this.publisher.xGroupCreate(streamName, groupName, '0', { MKSTREAM: true });
//     } catch (err) {
//       if (!err.message.includes("BUSYGROUP")) {
//         console.error("Error creating group:", err.message);
//       }
//     }
//   }

//   async initializeRedisConnections() {
//     try {
//       await this.subscriber.connect();
//       await this.publisher.connect();
//       console.log("║ \x1b[33mRedis connections\x1b[0m: \x1b[32minitialized\x1b[0m                ║");
//     } catch (error) {
//       console.error("║ \x1b[31mRedis connection error\x1b[0m:", error.message, "║");
//     }
//   }

//   initSocketIO(app, server) {
//     this.io = new Server(server, {
//       transports: ["websocket"],
//       cors: {
//         origin: [process.env.FRONTEND_URL, process.env.APP_ID, process.env.LOCALHOST],
//         methods: ["GET", "POST"],
//       },
//     });


//     if (this.io) {
//       console.log("║ \x1b[33mSocket server\x1b[0m: \x1b[32minitialized\x1b[0m                    ║");
//     }
//     this.setupEventHandlers();
//   }

//   setupEventHandlers() {
//     this.io.on("connection", (socket) => {
//       console.log(`\x1b[31m║\x1b[0m  \x1b[36m•\x1b[0m \x1b[33mUser connected\x1b[0m: \x1b[4m\x1b[32m${socket.id}\x1b[0m       \x1b[31m║\x1b[0m`);

//       this.setupDiscussionEvents(socket);
//       this.setupLocationEvents(socket);
//       this.setupGatheringEvents(socket);
//       this.setupNotificationEvents(socket);
//       this.handleDisconnect(socket);
//     });

//     this.subscriber.client.on('error', (error) => {
//       console.error('║ \x1b[31mSubscriber error\x1b[0m:', error.message);
//     });
//   }

//   setupDiscussionEvents(socket) {
//     socket.on("joinDiscussion", async (discussionId) => {
//       this.startDiscussionStreamConsumer(discussionId, 1000);
//       console.log(`User joined discussion: ${discussionId}`);
//       socket.join(discussionId);

//       const recentMessages = await this.publisher.xRevRange(
//         `stream:${discussionId}`,
//         '+',
//         '-',
//         { COUNT: 50 }
//       );

//       if (recentMessages && recentMessages.length > 0) {
//         const parsedMessages = recentMessages.reverse().map(([id, fields]) => {
//           const messageData = {};
//           for (let i = 0; i < fields.length; i += 2) {
//             const key = fields[i];
//             const value = fields[i + 1];
//             try {
//               messageData[key] = JSON.parse(value);
//             } catch {
//               messageData[key] = value;
//             }
//           }
//           return messageData;
//         });

//         socket.emit("prevMessages", parsedMessages);
//       }

//       if (!this.discussionUsers.has(discussionId)) {
//         this.discussionUsers.set(discussionId, new Set());
//       }

//       this.discussionUsers.get(discussionId).add(socket.id);
//       this.io.to(discussionId).emit("usersCount", this.discussionUsers.get(discussionId)?.size ?? 0);
//     });

//     socket.on("removeUserFromDiscussion", (discussionId) => {
//       console.log(`User removed from discussion: ${discussionId}`);
//       socket.leave(discussionId);
//       this.discussionUsers.get(discussionId)?.delete(socket.id);
//       this.io.to(discussionId).emit("usersCount", this.discussionUsers.get(discussionId)?.size ?? 0);
//       this.io.to(discussionId).emit("users", this.discussionUsers);
//     });

//     socket.on("message", async (data) => {
//       try {
//         const { discussionId, message, user, timestamp = new Date() } = data;

//         if (!discussionId || !message || !user) {
//           console.error('Invalid message data:', { discussionId, message, user });
//           return;
//         }

//         const streamMessage = {
//           discussionId,
//           type: 'message',
//           message,
//           socketId: socket.id,
//           _id: user._id,
//           name: user.name,
//           username: user.username,
//           picture: user.picture,
//           timestamp: timestamp.toISOString(),
//         };

//         const messageId = await this.publisher.xAdd(`stream:${discussionId}`, '*', streamMessage);
//         this.io.to(discussionId).emit("message", {
//           ...streamMessage,
//           id: messageId
//         });

//       } catch (error) {
//         console.error('Error processing message:', error.message);
//       }
//     });
//   }

//   setupLocationEvents(socket) {
//     socket.on("updateLocation", async (data) => {
//       const { userId, name, latitude, longitude, radius, campusId, gatheringId } = data;
//       this.eventAttendees[socket.id] = { userId, name, latitude, longitude, radius };

//       if (gatheringId && this.gatheringAttendees.has(gatheringId)) {
//         const attendees = this.gatheringAttendees.get(gatheringId);
//         if (attendees && attendees.has(userId)) {
//           attendees.get(userId).latitude = latitude;
//           attendees.get(userId).longitude = longitude;
//           this.io.to(gatheringId).emit("gatheringLocationUpdate", {
//             userId,
//             latitude,
//             longitude
//           });
//         }
//       }

//       this.io.emit("attendeeLocationUpdate", {
//         id: userId,
//         name,
//         latitude,
//         longitude,
//       });
//     });

//     socket.on("requestAttendees", () => {
//       socket.emit("attendeesList", Object.values(this.eventAttendees));
//     });
//   }

//   setupGatheringEvents(socket) {
//     socket.on("joinGathering", ({ gatheringId, userId }) => {
//       try {
//         socket.join(gatheringId);

//         if (!this.gatheringRooms.has(gatheringId)) {
//           this.gatheringRooms.set(gatheringId, new Set());
//           this.gatheringAttendees.set(gatheringId, new Map());
//         }

//         this.gatheringRooms.get(gatheringId).add(socket.id);

//         // Store userId and socketId for disconnection handling
//         const attendees = this.gatheringAttendees.get(gatheringId);
//         if (!attendees.has(userId)) {
//           attendees.set(userId, { userId, socketId: socket.id });
//         } else {
//           attendees.get(userId).socketId = socket.id;
//         }

//         socket.emit("gatheringAttendees", Array.from(attendees.values()));
//         console.log(`User ${userId} joined gathering ${gatheringId}`);
//       } catch (error) {
//         console.error(`Error joining gathering ${gatheringId}:`, error);
//       }
//     });

//     socket.on("markGatheringAttendance", (data) => {
//       const { gatheringId, userId, name, latitude, longitude } = data;

//       try {
//         if (!this.isValidCoordinate(latitude) || !this.isValidCoordinate(longitude)) {
//           socket.emit("attendanceError", { message: "Invalid coordinates" });
//           return;
//         }

//         const attendees = this.gatheringAttendees.get(gatheringId) || new Map();
//         attendees.set(userId, {
//           userId,
//           name,
//           latitude,
//           longitude,
//           socketId: socket.id,
//           timestamp: new Date()
//         });

//         this.gatheringAttendees.set(gatheringId, attendees);

//         this.io.to(gatheringId).emit("gatheringAttendanceUpdate", {
//           userId,
//           name,
//           latitude,
//           longitude,
//           timestamp: new Date()
//         });
//       } catch (error) {
//         console.error(`Error marking attendance for gathering ${gatheringId}:`, error);
//         socket.emit("attendanceError", { message: "Failed to mark attendance" });
//       }
//     });

//     socket.on("requestGatheringAttendees", (gatheringId) => {
//       try {
//         const attendees = this.gatheringAttendees.get(gatheringId) || new Map();
//         socket.emit("gatheringAttendeesList", Array.from(attendees.values()));
//       } catch (error) {
//         console.error(`Error fetching attendees for gathering ${gatheringId}:`, error);
//       }
//     });
//   }

//   isValidCoordinate(coord) {
//     return typeof coord === 'number' && !isNaN(coord) && Math.abs(coord) <= 180;
//   }

//   handleDisconnect(socket) {
//     socket.on("disconnect", async () => {
//       console.log(`User disconnected: ${socket.id}`);

//       // Handle discussion users
//       for (const [discussionId, userSet] of this.discussionUsers.entries()) {
//         if (userSet.has(socket.id)) {
//           userSet.delete(socket.id);
//           this.discussionUserCount[discussionId] = userSet.size;
//           this.io.to(discussionId).emit("usersCount", userSet.size);
//         }
//       }

//       // Handle event attendees
//       if (this.eventAttendees[socket.id]) {
//         const { userId } = this.eventAttendees[socket.id];
//         this.io.emit("attendeeDisconnected", { userId });
//         delete this.eventAttendees[socket.id];
//       }

//       // Handle gathering attendees
//       for (const [gatheringId, socketSet] of this.gatheringRooms.entries()) {
//         if (socketSet.has(socket.id)) {
//           socketSet.delete(socket.id);

//           const attendees = this.gatheringAttendees.get(gatheringId);
//           let removedUserId = null;
//           if (attendees) {
//             for (const [userId, data] of attendees.entries()) {
//               if (data.socketId === socket.id) {
//                 removedUserId = userId;
//                 attendees.delete(userId);
//                 break;
//               }
//             }
//           }

//           if (removedUserId) {
//             try {
//               // Update MongoDB Gathering model
//               const gathering = await Gathering.findById(gatheringId);
//               if (gathering) {
//                 gathering.attendees = gathering.attendees.filter(
//                   a => a.userId.toString() !== removedUserId
//                 );
//                 await gathering.save();
//                 console.log(`User ${removedUserId} removed from gathering ${gatheringId} attendees`);

//                 // Emit attendanceUpdate to sync frontend
//                 this.io.to(gatheringId).emit("attendanceUpdate", {
//                   gatheringId,
//                   attendees: gathering.attendees,
//                 });
//               }
//             } catch (error) {
//               console.error(`Error updating gathering ${gatheringId} on disconnect:`, error.message);
//             }
//           }
//         }
//       }
//     });
//   }


//   attachToApp(app, server) {
//     this.initSocketIO(app, server);
//     app.set("io", this.io);
//     sendNotification('676106e6923674f90259c650', {
//   type: 'comment',
//   recipient: '676106e6923674f90259c650',
//   sender: '676106e6923674f90259c650',
//   post: '676106e6923674f90259c650',
//   message: 'This is a test notification',
// });
//     return this.io;
//   }
// }

// /**
//  * Send a socket.io notification to a user
//  * @param {string} toUserId - User ID to send notification to
//  * @param {Object} notification - Notification payload
//  */
// function sendNotification(toUserId, notification) {
//   if (!toUserId || !notification) return;
//   socketServer.io.to('sendNotification', toUserId, notification);
//   socketServer.io.to(`user:${toUserId}`).emit("newNotification", notification);
//   console.log(`Notification sent to user:${toUserId}`);
// }


// const socketServer = new SocketServer();




// module.exports = {
//   initSocketIO: (app, server) => socketServer.initSocketIO(app, server),
//   attachSocketToApp: (app, server) => socketServer.attachToApp(app, server),
//   sendNotification
// };

















/////////////////////////////////////////////////////////////

const { Server } = require("socket.io");
const valkeyClient = require("../db/valkey.pubsub");
const DiscussionChatMessage = require("../models/university/papers/discussion/chat/discussion.chat.message");
const DiscussionChat = require("../models/university/papers/discussion/chat/discussion.chat");
const Gathering = require("../models/gps/user.gathering.model");
const Message = require("../models/1to1messages/messages.model");

class SocketServer {
  constructor() {
    this.io = null;
    this.discussionUsers = new Map();
    this.discussionUserCount = {};
    this.eventAttendees = {};
    this.gatheringRooms = new Map();
    this.gatheringAttendees = new Map();
    this.conversationUsers = new Map();
    this.subscriber = new valkeyClient('subscriber');
    this.publisher = new valkeyClient('publisher');
    this.streamConsumers = {};

    this.initializeRedisConnections();
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
      this.setupGatheringEvents(socket);
      this.setupNotificationEvents(socket);
      this.setupMessagingEvents(socket);
      this.handleDisconnect(socket);
    });

    this.subscriber.client.on('error', (error) => {
      console.error('║ \x1b[31mSubscriber error\x1b[0m:', error.message);
    });
  }

  async startDiscussionStreamConsumer(discussionId, blockTime = 1000) {
    if (this.streamConsumers[discussionId]) return;

    const streamKey = `stream:${discussionId}`;
    const group = `discussion-group-${discussionId}`;
    const consumer = `consumer-${discussionId}`;

    try {
      await this.publisher.xGroupCreate(streamKey, group, '0', { MKSTREAM: true });

      const loop = async () => {
        try {
          const response = await this.subscriber.xReadGroup(
            'GROUP',
            group,
            consumer,
            { key: streamKey, id: '>' },
            { COUNT: 10, BLOCK: blockTime }
          );

          if (response && response.length > 0) {
            const [streamData] = response;
            const [streamName, messages] = streamData;

            if (messages && messages.length > 0) {
              for (const [messageId, fields] of messages) {
                const messageData = {};
                for (let i = 0; i < fields.length; i += 2) {
                  const key = fields[i];
                  const value = fields[i + 1];
                  try {
                    messageData[key] = JSON.parse(value);
                  } catch {
                    messageData[key] = value;
                  }
                }

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
          setTimeout(loop, 100);
        }
      };

      this.streamConsumers[discussionId] = true;
      loop();
    } catch (error) {
      console.error(`Error setting up stream consumer for ${discussionId}:`, error.message);
      delete this.streamConsumers[discussionId];
    }
  }

  async startConversationStreamConsumer(conversationId, blockTime = 1000) {
    if (this.streamConsumers[conversationId]) return;

    const streamKey = `conversation:${conversationId}`;
    const group = `conversation-group-${conversationId}`;
    const consumer = `consumer-${conversationId}`;

    try {
      await this.publisher.xGroupCreate(streamKey, group, '0', { MKSTREAM: true });

      const loop = async () => {
        try {
          const response = await this.subscriber.xReadGroup(
            'GROUP',
            group,
            consumer,
            { key: streamKey, id: '>' },
            { COUNT: 10, BLOCK: blockTime }
          );

          if (response && response.length > 0) {
            const [streamData] = response;
            const [streamName, messages] = streamData;

            if (messages && messages.length > 0) {
              for (const [messageId, fields] of messages) {
                const messageData = {};
                for (let i = 0; i < fields.length; i += 2) {
                  const key = fields[i];
                  const value = fields[i + 1];
                  try {
                    messageData[key] = JSON.parse(value);
                  } catch {
                    messageData[key] = value;
                  }
                }

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
          setTimeout(loop, 100);
        }
      };

      this.streamConsumers[conversationId] = true;
      loop();
    } catch (error) {
      console.error(`Error setting up stream consumer for ${conversationId}:`, error.message);
      delete this.streamConsumers[conversationId];
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

  setupNotificationEvents(socket) {
    socket.on("joinNotifications", (userId) => {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined their notification room.`);
    });

    socket.on("sendNotification", async ({ toUserId, notification }) => {
      if (!toUserId || !notification) return;
      console.log("SENDING NOTIFICATION", toUserId, notification);

      try {
        this.io.to(`user:${toUserId}`).emit("newNotification", notification);
        console.log(`Notification sent to user:${toUserId}`);
      } catch (error) {
        console.error("Failed to send notification:", error.message);
      }
    });
  }

  setupMessagingEvents(socket) {
    socket.on("joinConversation", async ({ userId, recipientId }) => {
      const conversationId = [userId, recipientId].sort().join(':');
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${userId} joined conversation with ${recipientId} (ID: ${conversationId})`);

      await this.startConversationStreamConsumer(conversationId);

      try {
        const messages = await Message.find({
          $or: [
            { senderId: userId, recipientId: recipientId },
            { senderId: recipientId, recipientId: userId },
          ],
        })
          .sort({ createdAt: 1 })
          .limit(50);

        const recentMessages = await this.publisher.xRevRange(
          `conversation:${conversationId}`,
          '+',
          '-',
          { COUNT: 50 }
        );

        const parsedMessages = recentMessages.reverse().map(([id, fields]) => {
          const messageData = { id };
          for (let i = 0; i < fields.length; i += 2) {
            const key = fields[i];
            const value = fields[i + 1];
            try {
              messageData[key] = JSON.parse(value);
            } catch {
              messageData[key] = value;
            }
          }
          return messageData;
        });

        const allMessages = [
          ...messages.map(m => ({
            _id: m._id.toString(),
            senderId: m.senderId.toString(),
            recipientId: m.recipientId.toString(),
            content: m.content,
            status: m.status,
            timestamp: m.createdAt.toISOString(),
          })),
          ...parsedMessages,
        ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        socket.emit("prevMessages", allMessages);

        if (!this.conversationUsers.has(conversationId)) {
          this.conversationUsers.set(conversationId, new Set());
        }
        this.conversationUsers.get(conversationId).add(socket.id);

        await Message.updateMany(
          { recipientId: userId, status: 'sent' },
          { status: 'delivered' }
        );
        this.io.to(`conversation:${conversationId}`).emit("messageStatusUpdate", { status: 'delivered' });
      } catch (error) {
        console.error(`Error joining conversation ${conversationId}:`, error.message);
        socket.emit('error', `Failed to join conversation: ${error.message}`);
      }
    });

    socket.on("sendMessage", async (data) => {
      try {
        console.log('Received sendMessage:', data);
        const { recipientId, content, user } = data;
        const senderId = user?._id;
        const conversationId = [senderId, recipientId].sort().join(':');

        if (!recipientId || !content || !user || !senderId) {
          const errorMsg = `Invalid message data`;
          console.error(errorMsg);
          socket.emit('error', errorMsg);
          return;
        }

        const createdAt = new Date().toISOString();
        console.log(`Saving message with createdAt: ${createdAt}`);

        const message = new Message({
          senderId,
          recipientId,
          content,
          status: 'sent',
          createdAt: new Date(createdAt),
        });
        await message.save();
        console.log(`Message saved to MongoDB: ${message._id}, createdAt: ${message.createdAt}`);

        const streamMessage = {
          _id: message._id.toString(),
          senderId: senderId.toString(),
          recipientId: recipientId.toString(),
          content,
          status: 'sent',
          socketId: socket.id,
          name: user.name || '',
          username: user.username || '',
          picture: user.picture || '',
          timestamp: message.createdAt.toISOString(),
        };

        const messageId = await this.publisher.xAdd(`conversation:${conversationId}`, '*', {
          ...streamMessage,
          senderId: JSON.stringify(streamMessage.senderId),
          recipientId: JSON.stringify(streamMessage.recipientId),
          content: JSON.stringify(streamMessage.content),
          status: JSON.stringify(streamMessage.status),
          name: JSON.stringify(streamMessage.name),
          username: JSON.stringify(streamMessage.username),
          picture: JSON.stringify(streamMessage.picture),
          timestamp: JSON.stringify(streamMessage.timestamp),
        });

        this.io.to(`conversation:${conversationId}`).emit("newMessage", streamMessage);

        this.io.to(`user:${recipientId}`).emit("newNotification", {
          type: "message",
          sender: senderId,
          message: content,
          timestamp: message.createdAt.toISOString(),
        });
      } catch (error) {
        console.error('Error processing message:', error);
        socket.emit('error', `Failed to send message: ${error.message}`);
      }
    });

    socket.on("markAsRead", async ({ conversationId, messageIds }) => {
      try {
        await Message.updateMany(
          { _id: { $in: messageIds }, status: { $in: ['sent', 'delivered'] } },
          { status: 'read' }
        );
        this.io.to(`conversation:${conversationId}`).emit("messageStatusUpdate", {
          messageIds,
          status: 'read',
        });
      } catch (error) {
        console.error('Error marking messages as read:', error.message);
        socket.emit('error', `Failed to mark as read: ${error.message}`);
      }
    });
  }

  setupDiscussionEvents(socket) {
    socket.on("joinDiscussion", async (discussionId) => {
      this.startDiscussionStreamConsumer(discussionId, 1000);
      console.log(`User joined discussion: ${discussionId}`);
      socket.join(discussionId);

      const recentMessages = await this.publisher.xRevRange(
        `stream:${discussionId}`,
        '+',
        '-',
        { COUNT: 50 }
      );

      if (recentMessages && recentMessages.length > 0) {
        const parsedMessages = recentMessages.reverse().map(([id, fields]) => {
          const messageData = {};
          for (let i = 0; i < fields.length; i += 2) {
            const key = fields[i];
            const value = fields[i + 1];
            try {
              messageData[key] = JSON.parse(value);
            } catch {
              messageData[key] = value;
            }
          }
          return messageData;
        });

        socket.emit("prevMessages", parsedMessages);
      }

      if (!this.discussionUsers.has(discussionId)) {
        this.discussionUsers.set(discussionId, new Set());
      }

      this.discussionUsers.get(discussionId).add(socket.id);
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
        const { discussionId, message, user, timestamp = new Date() } = data;

        if (!discussionId || !message || !user) {
          console.error('Invalid message data:', { discussionId, message, user });
          return;
        }

        const streamMessage = {
          discussionId,
          type: 'message',
          message,
          socketId: socket.id,
          _id: user._id,
          name: user.name,
          username: user.username,
          picture: user.picture,
          timestamp: new Date(timestamp).toISOString(),
        };

        const messageId = await this.publisher.xAdd(`stream:${discussionId}`, '*', streamMessage);
        this.io.to(discussionId).emit("message", {
          ...streamMessage,
          id: messageId
        });
      } catch (error) {
        console.error('Error processing message:', error.message);
      }
    });
  }

  setupLocationEvents(socket) {
    socket.on("updateLocation", async (data) => {
      const { userId, name, latitude, longitude, radius, campusId, gatheringId } = data;
      this.eventAttendees[socket.id] = { userId, name, latitude, longitude, radius };

      if (gatheringId && this.gatheringAttendees.has(gatheringId)) {
        const attendees = this.gatheringAttendees.get(gatheringId);
        if (attendees && attendees.has(userId)) {
          attendees.get(userId).latitude = latitude;
          attendees.get(userId).longitude = longitude;
          this.io.to(gatheringId).emit("gatheringLocationUpdate", {
            userId,
            latitude,
            longitude
          });
        }
      }

      this.io.emit("attendeeLocationUpdate", {
        id: userId,
        name,
        latitude,
        longitude,
      });
    });

    socket.on("requestAttendees", () => {
      socket.emit("attendeesList", Object.values(this.eventAttendees));
    });
  }

  setupGatheringEvents(socket) {
    socket.on("joinGathering", ({ gatheringId, userId }) => {
      try {
        socket.join(gatheringId);

        if (!this.gatheringRooms.has(gatheringId)) {
          this.gatheringRooms.set(gatheringId, new Set());
          this.gatheringAttendees.set(gatheringId, new Map());
        }

        this.gatheringRooms.get(gatheringId).add(socket.id);

        const attendees = this.gatheringAttendees.get(gatheringId);
        if (!attendees.has(userId)) {
          attendees.set(userId, { userId, socketId: socket.id });
        } else {
          attendees.get(userId).socketId = socket.id;
        }

        socket.emit("gatheringAttendees", Array.from(attendees.values()));
        console.log(`User ${userId} joined gathering ${gatheringId}`);
      } catch (error) {
        console.error(`Error joining gathering ${gatheringId}:`, error);
      }
    });

    socket.on("markGatheringAttendance", (data) => {
      const { gatheringId, userId, name, latitude, longitude } = data;

      try {
        if (!this.isValidCoordinate(latitude) || !this.isValidCoordinate(longitude)) {
          socket.emit("attendanceError", { message: "Invalid coordinates" });
          return;
        }

        const attendees = this.gatheringAttendees.get(gatheringId) || new Map();
        attendees.set(userId, {
          userId,
          name,
          latitude,
          longitude,
          socketId: socket.id,
          timestamp: new Date()
        });

        this.gatheringAttendees.set(gatheringId, attendees);

        this.io.to(gatheringId).emit("gatheringAttendanceUpdate", {
          userId,
          name,
          latitude,
          longitude,
          timestamp: new Date()
        });
      } catch (error) {
        console.error(`Error marking attendance for gathering ${gatheringId}:`, error);
        socket.emit("attendanceError", { message: "Failed to mark attendance" });
      }
    });

    socket.on("requestGatheringAttendees", (gatheringId) => {
      try {
        const attendees = this.gatheringAttendees.get(gatheringId) || new Map();
        socket.emit("gatheringAttendeesList", Array.from(attendees.values()));
      } catch (error) {
        console.error(`Error fetching attendees for gathering ${gatheringId}:`, error);
      }
    });
  }

  isValidCoordinate(coord) {
    return typeof coord === 'number' && !isNaN(coord) && Math.abs(coord) <= 180;
  }

  handleDisconnect(socket) {
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.id}`);

      for (const [discussionId, userSet] of this.discussionUsers.entries()) {
        if (userSet.has(socket.id)) {
          userSet.delete(socket.id);
          this.discussionUserCount[discussionId] = userSet.size;
          this.io.to(discussionId).emit("usersCount", userSet.size);
        }
      }

      for (const [conversationId, userSet] of this.conversationUsers.entries()) {
        if (userSet.has(socket.id)) {
          userSet.delete(socket.id);
          this.io.to(`conversation:${conversationId}`).emit("usersCount", userSet.size);
        }
      }

      if (this.eventAttendees[socket.id]) {
        const { userId } = this.eventAttendees[socket.id];
        this.io.emit("attendeeDisconnected", { userId });
        delete this.eventAttendees[socket.id];
      }

      for (const [gatheringId, socketSet] of this.gatheringRooms.entries()) {
        if (socketSet.has(socket.id)) {
          socketSet.delete(socket.id);

          const attendees = this.gatheringAttendees.get(gatheringId);
          let removedUserId = null;
          if (attendees) {
            for (const [userId, data] of attendees.entries()) {
              if (data.socketId === socket.id) {
                removedUserId = userId;
                attendees.delete(userId);
                break;
              }
            }
          }

          if (removedUserId) {
            try {
              const gathering = await Gathering.findById(gatheringId);
              if (gathering) {
                gathering.attendees = gathering.attendees.filter(
                  a => a.userId.toString() !== removedUserId
                );
                await gathering.save();
                console.log(`User ${removedUserId} removed from gathering ${gatheringId} attendees`);

                this.io.to(gatheringId).emit("attendanceUpdate", {
                  gatheringId,
                  attendees: gathering.attendees,
                });
              }
            } catch (error) {
              console.error(`Error updating gathering ${gatheringId} on disconnect:`, error.message);
            }
          }
        }
      }
    });
  }

  attachToApp(app, server) {
    this.initSocketIO(app, server);
    app.set("io", this.io);
    return this.io;
  }
}

function sendNotification(toUserId, notification) {
  if (!toUserId || !notification) return;
  socketServer.io.to(`user:${toUserId}`).emit("newNotification", notification);
  console.log(`Notification sent to user:${toUserId}`);
}

const socketServer = new SocketServer();

module.exports = {
  initSocketIO: (app, server) => socketServer.initSocketIO(app, server),
  attachSocketToApp: (app, server) => socketServer.attachToApp(app, server),
  sendNotification
};