import AWS from "aws-sdk";

class AwsQueueService {
  constructor() {
    this.sqs = new AWS.SQS({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
  }

  async sendNSFWScanMessage(postId, mediaUrl, mediaType) {
    const params = {
      MessageBody: JSON.stringify({
        postId,
        mediaUrl,
        mediaType,
      }),
      QueueUrl: process.env.AWS_SQS_QUEUE_URL,
    };

    try {
      const result = await this.sqs.sendMessage(params).promise();
      console.log("Message sent to SQS:", result.MessageId);
      return result;
    } catch (error) {
      console.error("Error sending message to SQS:", error);
      throw error;
    }
  }
}

const AwsQueueServiceInstance = new AwsQueueService();
export default AwsQueueServiceInstance;