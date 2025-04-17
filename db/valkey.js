const Redis = require("ioredis");

class Valkey {
    constructor() {
        this.client = new Redis({
            url: process.env.VALKEY,
        });
        console.log('║ \x1b[33mValkey client\x1b[0m: \x1b[32mconnected\x1b[0m                      ║');
    }

    // async connect() {
    //     await this.client.connect()
    // }

    async disconnect() {
        await this.client.disconnect();
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
