const Redis = require('ioredis');

const redis = new Redis({
    port: process.env.REDISPORT,
    host: process.env.REDISHOST,
    password: process.env.REDISPASSWORD,
    db: 0
});

redis.on('error', (err) => {
    console.error('Redis error:', err);
});

module.exports = redis;
