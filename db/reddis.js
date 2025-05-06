const Redis = require('ioredis');

class RedisClient {
    static instance = null;

    constructor(multiInstance = false) {
        if (!multiInstance && RedisClient.instance) {
            return RedisClient.instance;
        }

        console.log('║ \x1b[33m%s\x1b[0m: \x1b[36m%s\x1b[0m', 'Environment', process.env.NODE_ENV, '                         ║');
        this.client = this.initializeRedis();
        this.attachEventListeners();

        if (!multiInstance) {
            RedisClient.instance = this;
        }
        this.client.on('connect', () => {
            console.log(`║ \x1b[33mREDIS client\x1b[0m: \x1b[32m\x1b[0m connected  ║`);
        });
    }

    get(key) {
        console.log('║ \x1b[33m%s\x1b[0m: \x1b[36m%s\x1b[0m', 'Getting Redis', key);
        return this.client.get(key);
    }

    set(key, value) {
        // console.log('║ \x1b[33m%s\x1b[0m: \x1b[36m%s\x1b[0m', 'Setting Redis', key);
        return this.client.set(key, value);
    }

    setex(key, seconds, value) {
        // console.log('║ \x1b[33m%s\x1b[0m: \x1b[36m%s\x1b[0m', 'Setting Redis', key);
        return this.client.setex(key, seconds, value);
    }

    del(key) {
        // console.log('║ \x1b[33m%s\x1b[0m: \x1b[36m%s\x1b[0m', 'Deleting Redis', key);
        return this.client.del(key);
    }

    expire(key, seconds) {
        // console.log('║ \x1b[33m%s\x1b[0m: \x1b[36m%s\x1b[0m', 'Expiring Redis', key);
        return this.client.expire(key, seconds);
    }

    close() {
        // console.log('║ \x1b[33m%s\x1b[0m: \x1b[36m%s\x1b[0m', 'Closing Redis');
        return this.client.quit();
    }

    getClient() {
        return this.client;
    }

    initializeRedis() {
        if (process.env.NODE_ENV === 'development') {
                console.log('║ \x1b[33m%s\x1b[0m: \x1b[36m%s\x1b[0m', 'Initializing Redis', 'in development mode...');
            return new Redis(
                // process.env.NEW_AZURE_CONECTION_STRING // wont work
                {
                port: process.env.NEW_AZURE_REDISPORT || 6379,
                host: process.env.NEW_AZURE_REDISHOST || '127.0.0.1',
                password: process.env.NEW_AZURE_REDISPASSWORD || '',
                tls: {}
            }
        );
        } 
        else if(process.env.NODE_ENV === 'testing') {
            console.log('\x1b[36m║\x1b[0m \x1b[33m%s\x1b[0m: \x1b[36m%s\x1b[0m', 'Initializing Redis', 'in testing mode...\x1b[0m        ║');
            return new Redis({
                port: process.env.REDISPORT || 6379,
                host: process.env.REDISHOST || '127.0.0.1',
                password: process.env.REDISPASSWORD || '',
                db: 0,
            });
        }
        else {
            console.log('║ \x1b[33m%s\x1b[0m: \x1b[36m%s\x1b[0m', 'Initializing Redis', 'in production mode...');
            if (!process.env.VALKEY) {
                throw new Error('REDIS_URL is not defined in the production environment.');
            }
            return new Redis(process.env.VALKEY);
        }
    }

    attachEventListeners() {
        this.client.on('connect', () => {
            console.log('║ \x1b[33m%s\x1b[0m: \x1b[36m%s\x1b[0m', 'Redis', 'Connected successfully                 ║');
        });

        this.client.on('error', (err) => {
            console.error('║ \x1b[33m%s\x1b[0m: \x1b[36m%s\x1b[0m', 'Redis', 'Error:', err);
        });
    }
}

// Create singleton instance
const redisClient = new RedisClient();

module.exports = redisClient;
