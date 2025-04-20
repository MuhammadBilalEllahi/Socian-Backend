const Redis = require("ioredis");

class Valkey {
    constructor(type) {
        console.log("║ \x1bValkey is Present->",process.env.VALKEY.toString().includes('beyondtheclass'));
        this.type = type;
        const isDevelopment = process.env.NODE_ENV === 'development';
        this.client = new Redis(
            isDevelopment ? 
             process.env.VALKEY
            
            :
            {
            host: process.env.VALKEY_HOST,
            port: process.env.VALKEY_PORT,
            username: process.env.VALKEY_USERNAME,
            password: process.env.VALKEY_PASSWORD,
            tls: {},
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        }
    );

        this.client.on('error', (error) => {
            console.error(`║ \x1b[31mValkey ${this.type} error\x1b[0m:`, error.message);
        });

        this.client.on('connect', () => {
            console.log(`║ \x1b[33mValkey client\x1b[0m: \x1b[32m${type}\x1b[0m connected\x1b[0m ${isDevelopment ? 'Development' : 'Testing'}   ║`);
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

    async xAdd(streamKey, id, fields) {
        try {
            // Convert fields object to array of key-value pairs
            const fieldArray = [];
            for (const [key, value] of Object.entries(fields)) {
                fieldArray.push(key, JSON.stringify(value));
            }
            
            const result = await this.client.xadd(streamKey, id, ...fieldArray);
            console.log('║ \x1b[32mStream message added\x1b[0m:', result);
            return result;
        } catch (error) {
            console.error('║ \x1b[31mError adding to stream\x1b[0m:', error.message);
            throw error;
        }
    }

    async xGroupCreate(streamKey, groupName, id, options = {}) {
        try {
            const args = ['CREATE', streamKey, groupName, id];
            if (options.MKSTREAM) {
                args.push('MKSTREAM');
            }
            await this.client.xgroup(...args);
            console.log('║ \x1b[32mStream group created\x1b[0m:', groupName);
        } catch (error) {
            if (!error.message.includes('BUSYGROUP')) {
                console.error('║ \x1b[31mError creating stream group\x1b[0m:', error.message);
                throw error;
            }
        }
    }

    async xReadGroup(group, groupName, consumer, streams, options = {}) {
        try {
            const args = ['GROUP', groupName, consumer];
            
            if (options.COUNT) {
                args.push('COUNT', options.COUNT);
            }
            if (options.BLOCK) {
                args.push('BLOCK', options.BLOCK);
            }
            
            args.push('STREAMS', streams.key);
            args.push(streams.id);
            
            const result = await this.client.xreadgroup(...args);
            console.log('║ \x1b[32mStream read successful\x1b[0m:', streams.key);
            return result;
        } catch (error) {
            console.error('║ \x1b[31mError reading from stream\x1b[0m:', error.message);
            throw error;
        }
    }

    async xAck(streamKey, groupName, id) {
        try {
            await this.client.xack(streamKey, groupName, id);
            console.log('║ \x1b[32mMessage acknowledged\x1b[0m:', id);
        } catch (error) {
            console.error('║ \x1b[31mError acknowledging message\x1b[0m:', error.message);
            throw error;
        }
    }
}

module.exports = Valkey;
