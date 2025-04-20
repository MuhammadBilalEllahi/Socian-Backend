const valkeyClient = require("../db/valkey.pubsub");
const DiscussionChatMessage = require("../models/university/papers/discussion/chat/discussion.chat.message");
const DiscussionChat = require("../models/university/papers/discussion/chat/discussion.chat");

class ChatBackupService {
  constructor() {
    this.redis = new valkeyClient('backup');
    this.backupInterval = 5 * 60 * 1000; // 5 minutes
    this.lastBackupTime = new Map(); // Track last backup time per discussion
  }

  async start() {
    await this.redis.connect();
    this.runBackupProcess();
  }

  async runBackupProcess() {
    setInterval(async () => {
      try {
        // Get all discussion streams
        const streams = await this.redis.client.keys('stream:*');
        
        for (const streamKey of streams) {
          const discussionId = streamKey.replace('stream:', '');
          await this.backupDiscussionMessages(discussionId);
        }
      } catch (error) {
        console.error('║ \x1b[31mError in backup process\x1b[0m:', error.message);
      }
    }, this.backupInterval);
  }

  async backupDiscussionMessages(discussionId) {
    try {
      const streamKey = `stream:${discussionId}`;
      const lastBackup = this.lastBackupTime.get(discussionId) || '0-0';
      
      // Read messages since last backup
      const messages = await this.redis.client.xrange(
        streamKey,
        lastBackup,
        '+',
        'COUNT',
        1000
      );

      if (messages.length === 0) return;

      // Prepare messages for MongoDB
      const formattedMessages = messages.map(([id, fields]) => {
        // Parse the fields into key-value pairs
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

        console.log("MESSAGES: ",messageData ,  )
        // Extract user data
        const user = messageData.user;
        console.log("USER =>", user)

        return {
          discussionId: messageData.discussionId,
          userId: user._id,
          socketId: messageData.socketId,
          username: user.username,
          picture: user.picture,
          message: messageData.message,
          timestamp: new Date(messageData.timestamp)
        };
      });

      // Insert into MongoDB
      const insertedMessages = await DiscussionChatMessage.insertMany(formattedMessages);
      const messageIds = insertedMessages.map(doc => doc._id);

      // Update discussion chat document
      await DiscussionChat.findOneAndUpdate(
        { _id: discussionId },
        { $push: { messages: { $each: messageIds } } },
        { upsert: true }
      );

      // Update last backup time
      this.lastBackupTime.set(discussionId, messages[messages.length - 1][0]);
      
      console.log(`║ \x1b[32mBacked up ${messages.length} messages for discussion ${discussionId}\x1b[0m`);
    } catch (error) {
      console.error(`║ \x1b[31mError backing up messages for discussion ${discussionId}\x1b[0m:`, error.message);
    }
  }
}

module.exports = new ChatBackupService();