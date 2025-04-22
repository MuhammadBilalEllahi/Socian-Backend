const valkeyClient = require("../db/valkey.pubsub");
const DiscussionChatMessage = require("../models/university/papers/discussion/chat/discussion.chat.message");
const DiscussionChat = require("../models/university/papers/discussion/chat/discussion.chat");

class ChatBackupService {
  constructor() {
    this.redis = new valkeyClient('backup');
    this.backupInterval = 5 * 60 * 1000; // 5 minutes
    console.log('║ \x1b[33mBackup interval set to\x1b[0m:', this.backupInterval, 'ms');
    // this.lastBackupTime = new Map(); // Track last backup time per discussion
  }

  async start() {
    console.log('║ \x1b[33mStarting chat backup service\x1b[0m');
    await this.redis.connect();
    this.runBackupProcess();
  }

  async runBackupProcess() {
    console.log('║ \x1b[33mInitiating backup process\x1b[0m');
    setInterval(async () => {
      try {
        console.log('║ \x1b[33mRunning scheduled backup\x1b[0m:', new Date().toISOString());
        // Get all discussion streams
        const streams = await this.redis.client.keys('stream:*');
        console.log('║ \x1b[33mFound streams to backup\x1b[0m:', streams.length);
        
        for (const streamKey of streams) {
          const discussionId = streamKey.replace('stream:', '');
          console.log('║ \x1b[33mProcessing backup for discussion\x1b[0m:', discussionId);
          await this.backupDiscussionMessages(discussionId);
        }
      } catch (error) {
        console.error('║ \x1b[31mError in backup process\x1b[0m:', error.message);
      }
    }, this.backupInterval);
  }

  async getLastBackupTime(discussionId) {
    const lastBackupKey = `last_backup:${discussionId}`;
    console.log('║ \x1b[33mGetting last backup time for discussion\x1b[0m:', discussionId);
    const lastBackupId = await this.redis.get(lastBackupKey);
    console.log('║ \x1b[33mLast backup time\x1b[0m:', lastBackupId || '0-0');
    return lastBackupId || '0-0';
  }

  async setLastBackupTime(discussionId, timestamp) {
    const lastBackupKey = `last_backup:${discussionId}`;
    console.log('║ \x1b[33mSetting last backup time for discussion\x1b[0m:', discussionId, 'to', timestamp);
    await this.redis.set(lastBackupKey, timestamp);
  }

  async backupDiscussionMessages(discussionId) {
    try {
      console.log('║ \x1b[33mStarting backup for discussion\x1b[0m:', discussionId);
      const streamKey = `stream:${discussionId}`;
      const lastBackup = await this.getLastBackupTime(discussionId);
      console.log('║ \x1b[33mReading messages since\x1b[0m:', lastBackup);
      
      // Read messages since last backup, excluding the backup message itself
      const messages = await this.redis.client.xrange(
        streamKey,
        `(${lastBackup}`, // Exclusive range starting after lastBackup
        '+',
        'COUNT',
        1000
      );

      console.log('║ \x1b[33mFound messages to backup\x1b[0m:', messages.length);
      if (messages.length === 0) return;

      // Prepare messages for MongoDB
      const formattedMessages = messages.map(([id, fields]) => {
        console.log('║ \x1b[33mProcessing message\x1b[0m:', id);
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

        console.log("║ \x1b[33mMessage data\x1b[0m:", messageData);
        // Extract user data
        const user = messageData.user;
        console.log("║ \x1b[33mUser data\x1b[0m:", user);

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

      console.log('║ \x1b[33mInserting messages into MongoDB\x1b[0m');
      // Insert into MongoDB
      const insertedMessages = await DiscussionChatMessage.insertMany(formattedMessages);
      const messageIds = insertedMessages.map(doc => doc._id);
      console.log('║ \x1b[33mInserted message IDs\x1b[0m:', messageIds);

      // Update discussion chat document
      console.log('║ \x1b[33mUpdating discussion chat document\x1b[0m');
      await DiscussionChat.findOneAndUpdate(
        { _id: discussionId },
        { $push: { messages: { $each: messageIds } } },
        { upsert: true }
      );

      // Update last backup time in Redis
      const lastMessageId = messages[messages.length - 1][0];
      console.log('║ \x1b[33mUpdating last backup time to\x1b[0m:', lastMessageId);
      await this.setLastBackupTime(discussionId, lastMessageId);
      
      console.log(`║ \x1b[32mBacked up ${messages.length} messages for discussion ${discussionId}\x1b[0m`);
    } catch (error) {
      console.error(`║ \x1b[31mError backing up messages for discussion ${discussionId}\x1b[0m:`, error.message);
    }
  }
}

module.exports = new ChatBackupService();