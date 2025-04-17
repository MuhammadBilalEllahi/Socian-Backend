const mongoose = require('mongoose');

const connectToMongoDB = async (app) => {
    try {
        await mongoose.connect(process.env.MONGO_DB_URI, {
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
            // useCreateIndex: true,
            // useFindAndModify: false,
            maxPoolSize: 50,
        })
        app.locals.db = mongoose.connection;


        // NOT AVAILABLE IN FREE TIER
        // const db = mongoose.connection.db;

        // await db.command({ enableSharding: "BeyondTheClass" });
        // console.log("Sharding enabled for BeyondTheClass");


        // await db.command({
        //     shardCollection: "BeyondTheClass.SocietyPostAndCommentVote",
        //     key: { "postId": 1 }  // Shard key: postId
        // });

        // Style 6: ASCII box
        
        console.log('\x1b[36m║\x1b[0m \x1b[33mMongo Database\x1b[0m: \x1b[32mConnected\x1b[0m');
        
    } catch (error) {
        console.error('\x1b[31m║\x1b[0m \x1b[33mMongo Database Error Catch Messgae: \x1b[0m\x1b[36m%s\x1b[0m', error.message)
        // throw new Error(error)
    }
}

module.exports = connectToMongoDB

