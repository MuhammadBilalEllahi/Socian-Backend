const  AWS = require("aws-sdk") ;

class AwsQueueService {
  constructor() {
    this.sqs = new AWS.SQS({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    this.queueUrl = process.env.NSFW_QUEUE_URL;
  }

  async sendNSFWScanMessage(postId, mediaUrl,mediaType) {
    if (!postId || !mediaUrl || !mediaType) {
      throw new Error('postId and mediaUrl are required for SQS message');
    }

    const messageBody = JSON.stringify({
      postId,
      mediaUrl,
      mediaType,
    });

    const params = {
      QueueUrl: this.queueUrl,
      MessageBody: messageBody,
    };

    try {
      const result = await this.sqs.sendMessage(params).promise();
      console.log(`[SQS] NSFW scan message sent: ${result.MessageId}`);
    } catch (error) {
      console.error('[SQS] Failed to send NSFW scan message:', error);
      throw error;
    }
  }
}
module.exports=AwsQueueService;