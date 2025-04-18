const Redis = require("ioredis");

class Valkey {
    constructor(type) {
        this.type = type;
        this.client = new Redis({
            host: process.env.VALKEY_HOST,
            port: process.env.VALKEY_PORT,
            username: process.env.VALKEY_USERNAME,
            password: process.env.VALKEY_PASSWORD,
            tls: {},
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });

        this.client.on('error', (error) => {
            console.error(`║ \x1b[31mValkey ${this.type} error\x1b[0m:`, error.message);
        });

        this.client.on('connect', () => {
            console.log(`║ \x1b[33mValkey client\x1b[0m: \x1b[32m${type}\x1b[0m connected\x1b[0m           ║`);
        });
    }

    async connect() {
        try {
            await this.client.connect();
            return true;
        } catch (error) {
            console.error(`║ \x1b[31mValkey ${this.type} connection error\x1b[0m:`, error.message);
            return false;
        }
    }

    async disconnect() {
        await this.client.disconnect();
    }

    async subscribe(channel) {
        console.log('║ \x1b[33m%s\x1b[0m: \x1b[36m%s\x1b[0m', 'Subscribing to', channel);
        await this.client.subscribe(channel);
    }


    async publish(channel, message) {
        console.log('║ \x1b[33m%s\x1b[0m: \x1b[36m%s\x1b[0m', 'Publishing to', channel);
        const data = await this.client.publish(channel, message);
        console.log(data === 1? "\x1b[32m + Message published successfully\x1b[0m" : "\x1b[31m - Message not published\x1b[0m");
        return data;
    }

    // async onMessage(ch, msg) {
    //     console.log("This is the message to send\n", ch, ":", msg);
    // }
    
    on(emitter, callback) {
        this.client.on(emitter, (channel, message) => {
            callback(channel, message);
        });
    }
    
    async get(key) {
        return await this.client.get(key);
    }

    async set(key, value) {
        await this.client.set(key, value);
    }

    async del(key) {
        await this.client.del(key);
    }

    async close() {
        await this.client.quit();
    }
}

module.exports = Valkey;
