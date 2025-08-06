import valkeyClient from "../db/valkey.pubsub.js";
import DiscussionChatMessage from "../models/university/papers/discussion/chat/discussion.chat.message.js";
import DiscussionChat from "../models/university/papers/discussion/chat/discussion.chat.js";

class ChatBackupService {
  constructor() {
    this.isRunning = false;
    this.backupInterval = 5 * 60 * 1000; // 5 minutes
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('Chat backup service started');
    this.runBackupProcess();
  }

  async runBackupProcess() {
    while (this.isRunning) {
      try {
        const discussions = await DiscussionChat.find({});
        
        for (const discussion of discussions) {
          const lastBackupTime = await this.getLastBackupTime(discussion._id);
          const cutoffTime = lastBackupTime || new Date(0);
          
          const messages = await DiscussionChatMessage.find({
            discussionId: discussion._id,
            timestamp: { $gt: cutoffTime }
          }).sort({ timestamp: 1 });
          
          if (messages.length > 0) {
            await this.backupDiscussionMessages(discussion._id, messages);
            await this.setLastBackupTime(discussion._id, new Date());
          }
        }
      } catch (error) {
        console.error('Chat backup error:', error);
      }
      
      await new Promise(resolve => setTimeout(resolve, this.backupInterval));
    }
  }

  async getLastBackupTime(discussionId) {
    const key = `chat_backup_${discussionId}`;
    const timestamp = await valkeyClient.get(key);
    return timestamp ? new Date(timestamp) : null;
  }

  async setLastBackupTime(discussionId, timestamp) {
    const key = `chat_backup_${discussionId}`;
    await valkeyClient.set(key, timestamp.toISOString());
  }

  async backupDiscussionMessages(discussionId, messages) {
    const backupKey = `chat_backup_${discussionId}_messages`;
    const backupData = {
      discussionId,
      messages: messages.map(msg => ({
        userId: msg.userId,
        user: msg.user,
        username: msg.username,
        picture: msg.picture,
        message: msg.message,
        timestamp: msg.timestamp
      })),
      backedUpAt: new Date()
    };
    
    await valkeyClient.set(backupKey, JSON.stringify(backupData));
    console.log(`Backed up ${messages.length} messages for discussion ${discussionId}`);
  }

  stop() {
    this.isRunning = false;
    console.log('Chat backup service stopped');
  }
}

export default new ChatBackupService();