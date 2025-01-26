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

        console.log("Mongo Database:- Connected");
    } catch (error) {
        console.error("Mongo Database Error Catch Messgae: ", error.message)
        // throw new Error(error)
    }
}

module.exports = connectToMongoDB

