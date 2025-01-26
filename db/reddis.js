const Redis = require('ioredis');

// const redis = new Redis({
//     port: process.env.REDISPORT,
//     host: process.env.REDISHOST,
//     password: process.env.REDISPASSWORD,
//     db: 0
// });

console.log("REDIS URL", process.env.REDIS_URL + '?family=0')

const redis = new Redis(process.env.REDIS_URL + '?family=0');

redis.on('connect', () => {
    console.log("Redis:- Connected")
})
redis.on('error', (err) => {
    console.error('Redis error:', err);
});

module.exports = redis;
