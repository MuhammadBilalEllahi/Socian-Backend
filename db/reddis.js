const Redis = require('ioredis');

// Determine Redis configuration based on the environment
let redis;

console.log('Environment:', process.env.NODE_ENV);

if (process.env.NODE_ENV === 'development') {
    console.log("Initializing Redis in development mode...");
    redis = new Redis({
        port: process.env.REDISPORT || 6379, // Default port 6379
        host: process.env.REDISHOST || '127.0.0.1', // Default to localhost
        password: process.env.REDISPASSWORD || '', // Default to no password
        db: 0, // Default DB
    });
} else {
    console.log("Initializing Redis in production mode...");
    if (!process.env.REDIS_URL) {
        throw new Error('REDIS_URL is not defined in the production environment.');
    }
    redis = new Redis(`${process.env.REDIS_URL}?family=0`);
}

// Attach event listeners to Redis
redis.on('connect', () => {
    console.log("Redis: Connected successfully");
});

redis.on('error', (err) => {
    console.error("Redis error:", err);
});

// Export the Redis instance
module.exports = redis;
