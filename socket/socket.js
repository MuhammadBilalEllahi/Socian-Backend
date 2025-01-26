
const { Server } = require("socket.io");

let io;

const initSocketIO = (app, server) => {
    io = new Server(server, {
        transports: ['websocket'],
        cors: {
            origin: [process.env.FRONTEND_URL, process.env.APP_ID, process.env.LOCALHOST],
            methods: ["GET", "POST"]
        }
    })




    const discussionUsers = {}
    const discussionUserCount = {}

    // const { user, userId, role, universityOrigin, campusOrigin } = getUserDetails(app.request)

    io.on('connection', (socket) => {
        // console.log('A user connected', socket.id);
        // const user = socket.handshake.query.user
        // console.log("USer id", user)

        socket.on('joinDiscussion', (discussionId) => {
            socket.join(discussionId);

            if (!discussionUsers[discussionId]) {
                discussionUsers[discussionId] = new Set()
            }


            discussionUsers[discussionId].add(socket.id)
            // console.log(discussionUsers)
            // console.log(discussionUsers[discussionId].size)

            io.to(discussionId).emit('users', discussionUsers)
            io.to(discussionId).emit('usersCount', discussionUsers[discussionId].size)

            // console.log(`User joined discussion: ${discussionId}`);
        });

        socket.on('message', (discussionId, message, user) => {
            // const chatMessage = { user: user, socketId: socket.id, message, timestamp: new Date() };

            const chatMessage = {
                _id: user._id,
                user: user.name,
                username: user.username,
                picture: user.picture,
                socketId: socket.id,
                message: message,
                timestamp: new Date()
            };


            io.to(discussionId).emit('message', chatMessage);
            // console.log("message", message, user)
        });

        socket.on('disconnect', () => {
            Object.keys(discussionUsers).forEach(discussionId => {
                if (discussionUsers[discussionId].has(socket.id)) {
                    discussionUsers[discussionId].delete(socket.id);
                    discussionUserCount[discussionId] = discussionUsers[discussionId].size;


                    io.to(discussionId).emit('users', discussionUsers)
                    io.to(discussionId).emit('usersCount', discussionUsers[discussionId].size)
                }
            })
            console.log('A user disconnected');
        });
    });

}

// Attach io to the app object for global access
const attachSocketToApp = (app, server) => {
    initSocketIO(app, server);
    app.set('io', io); // Store io instance in app
};


module.exports = { initSocketIO, attachSocketToApp }