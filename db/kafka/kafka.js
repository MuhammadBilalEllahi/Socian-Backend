// NOT USING KAFKA FOR NOW. Will use for chats not discussions.

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'beyond-the-class-node-app',
  brokers: [process.env.KAFKA_BROKER],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.SAS_USERNAME,
    password: process.env.SAS_PASSWORD,
    
  },
});

let producer = null;

async function createProducer() {
    
    if(producer) return producer; 

  const _producer = kafka.producer();
  await _producer.connect();
  producer = _producer;
  return producer;
}

async function produceMessage(topic, key, message) {
    console.log("\n ║ Producing message to Kafka\nTopic:", topic, "\nKey:", key, "\nMessage:", message, "\n");
const producer = await createProducer();
console.log("Producer Connected");
const stringifiedMessage = typeof message === 'string' ? message : JSON.stringify(message);

await producer.send({
    topic,
    messages: [{key: key, value: stringifiedMessage}],
});
return true;
}

async function startConsumer(topic) {
    const consumer = kafka.consumer({groupId: 'beyond-the-class-node-app'});
    await consumer.connect();
    console.log("Consumer connected");
    await consumer.subscribe({topic, fromBeginning: true});
    console.log("Consumer subscribed to topic", topic);

    await consumer.run({
        autoCommit: true,

        eachMessage: async ({message, pause}) => {
            if(!message.value) return;
            const parsedMessage = JSON.parse(message.value);
            console.log("Message", parsedMessage);

            try {
                // await DiscussionChat.findByIdAndUpdate(parsedMessage.chatId, {
            //     $push: {
            //         messages: parsedMessage
            //     }
            // });
            } catch (error) {

               console.log("Error", error);
               pause();
               setTimeout(() => {
                consumer.resume([{topic: topic}]);
               }, 60* 1000);
            }
        }
    });
}



module.exports = {produceMessage, startConsumer};