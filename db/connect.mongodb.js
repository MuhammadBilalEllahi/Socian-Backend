import mongoose from 'mongoose';

const connectToMongoDB = async (app) => {
    try {
        await mongoose.connect(process.env.MONGO_DB_URI, {
            maxPoolSize: 50,
        })
        app.locals.db = mongoose.connection;
        console.log('\x1b[36m║\x1b[0m \x1b[33mMongo Database\x1b[0m: \x1b[32mConnected\x1b[0m                     ║');
        console.log('\x1b[36m╚═══════════════════════════════════════════════╝\x1b[0m');
    } catch (error) {
        console.error('\x1b[31m║\x1b[0m \x1b[33mMongo Database Error Catch Messgae: \x1b[0m\x1b[36m%s\x1b[0m', error.message)
    }
}

export default connectToMongoDB;

