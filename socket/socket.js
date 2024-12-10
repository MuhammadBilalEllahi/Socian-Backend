const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ["http://localhost:3000", "https://comsian.vercel.app", "https://comsian.bilalellahi.com"],
        methods: ["GET", "POST"]
    }
});

const discussionUsers = {}
const discussionUserCount = {}

io.on('connection', (socket) => {
    console.log('A user connected', socket.id);


    const userId = socket.handshake.query.userId
    // console.log("USer id", userId)

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

        console.log(`User joined discussion: ${discussionId}`);
    });

    socket.on('message', (discussionId, message) => {
        const chatMessage = { user: socket.id, message, timestamp: new Date() };
        io.to(discussionId).emit('message', chatMessage);
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