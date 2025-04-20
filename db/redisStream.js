// await this.createStreamGroupIfNotExists('discussion-stream', 'discussion-group');


// async function publishToStream(streamName, message) {
//     return await global.redisClient.xAdd(streamName, "*", message);
//   }


// async function createStreamGroupIfNotExists(streamName, groupName) {
//     try {
//       await this.publisher.xGroupCreate(streamName, groupName, '0', { MKSTREAM: true });
//     } catch (err) {
//       if (!err.message.includes("BUSYGROUP")) {
//         console.error("Error creating group:", err.message);
//       }
//     }
//   }
  


//   socket.on("message", async (data) => {
//     try {
//       const { discussionId, message, user } = data;
//       const chatMessage = {
//         userId: user._id,
//         user: user.name,
//         username: user.username,
//         picture: user.picture,
//         socketId: socket.id,
//         message,
//         timestamp: new Date().toISOString(),
//       };
  
//       // Push to Redis stream
//       await this.publisher.xAdd(`stream:${discussionId}`, '*', chatMessage);
//     } catch (err) {
//       console.error("Error publishing to stream:", err.message);
//     }
//   });









//   async function startDiscussionStreamConsumer(discussionId) {
//     const streamKey = `stream:${discussionId}`;
//     const group = 'discussion-group';
//     const consumer = `consumer-${discussionId}`;
  
//     await this.createStreamGroupIfNotExists(streamKey, group);
  
//     const loop = async () => {
//       try {
//         const response = await this.subscriber.xReadGroup(
//           'GROUP',
//           group,
//           consumer,
//           { key: streamKey, id: '>' },
//           { COUNT: 10, BLOCK: 5000 }
//         );
  
//         if (response) {
//           for (const stream of response) {
//             for (const [id, fields] of stream.messages) {
//               this.io.to(discussionId).emit("message", fields);
  
//               // Optionally acknowledge message
//               await this.subscriber.xAck(streamKey, group, id);
//             }
//           }
//         }
//       } catch (err) {
//         console.error(`Stream read error for ${streamKey}:`, err.message);
//       } finally {
//         setTimeout(loop, 1000);
//       }
//     };
  
//     loop();
//   }
  
  