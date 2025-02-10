// const cluster = require('cluster');
// const os = require('os');
const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;

const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const mongoDB = require("./db/connect.mongodb.js");
const session = require("express-session");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrfProtection = require('@fastify/csrf-protection');
const compression = require('compression');
const http = require("http");
const { attachSocketToApp } = require("./socket/socket.js");

// const sanitizeHtml = require('sanitize-html');
// const cleanHtml = sanitizeHtml(userInput, { allowedTags: [], allowedAttributes: {} });

const MongoStore = require("connect-mongo");
const path = require("path");
// const RedisStore = require('connect-redis').default;

// const Redis = require('ioredis');

dotenv.config();

const redisClient = require("./db/reddis.js")

// const redis = new Redis(process.env.REDIS_URL);
// redis.on('error', (err) => {
//     console.error('Redis error:', err);
// });
console.log("Always remember to pnpm install");
// Will be using session for now
app.set("trust proxy", 1);
const sessionData = session({
  name: "iidxi",
  secret: process.env.SESSION_SECRET || "default_secret",
  resave: process.env.RESAVE === "true",
  saveUninitialized: process.env.SAVE_UNINTIALIZED === "true", // should be false otherwise empty sessions wil be stored in database
  cookie: {
    maxAge: 140 * 24 * 60 * 60 * 1000, // 140 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // true if HTTPS in production
    sameSite: process.env.NODE_ENV === "production" && "lax",
    domain: process.env.COOKIE_DOMAIN || undefined,
  },
  rolling: process.env.ROLLING === "true",
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_DB_URI,
    collectionName: "user-sessions",
    ttl: 14 * 24 * 60 * 60, // 14 days
  }),
});

app.use(sessionData);

app.use(
  cors({
    // origin: ["http://localhost:4352", "https://m.bilalellahi.com"],
    origin: [process.env.FRONTEND_URL, process.env.APP_ID, process.env.LOCALHOST],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);
// app.options("*", cors()); // Allow all preflight requests


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
process.env.RUN_LIMITER === 'true' && app.use(limiter);
app.use(helmet());
// app.use(csrfProtection);

app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(compression());


const server = http.createServer(app)
attachSocketToApp(app, server)

app.use((req, res, next) => {
  const io = req.app.get('io');
  req.io = io;
  next();
});




// generate hash
// const crypto = require('crypto')
// console.log(crypto.randomBytes(6).toString('hex'))

const authRouter = require("./routes/auth/auth.route.js");
const oAuthRouter = require('./routes/auth/oAuth/oAuth.route.js');
// const requestRoute = require('./routes/request');
// const emailRoute = require('./routes/email.route.js');

// const mobAuthRouter = require("./routes/auth/mob.auth.route.js"); // will not use maybe

const protectRoute = require("./middlewares/protect.route.js");
const superProtect = require("./middlewares/super.protect.js");
const adminProtect = require("./middlewares/admin.protect.js");
const modProtect = require("./middlewares/mod.protect.js");

const superRouter = require("./routes/super/super.route.js");
const adminRouter = require("./routes/admin/admin.route.js");
const modRouter = require("./routes/mod/mod.route.js");

const universityRouter = require("./routes/university_related/university.route.js");
const campusRouter = require("./routes/university_related/campus.route.js");

const departmentRouter = require("./routes/university_related/department/department.route.js");
const subjectRouter = require("./routes/university_related/subject/subject.route.js");
const teacherRouter = require("./routes/university_related/teacher/teacher.route.js");

const pastpaperRouter = require("./routes/university_related/pastpapers/pastpaper.route.js");
const academicRouter = require("./routes/university_related/pastpapers/academic.format.route.js");
const discussionRouter = require("./routes/university_related/pastpapers/discussion.route.js");

const uploadsRouter = require('./utils/aws/servePDF.js')


app.use("/api/super", superProtect, superRouter);
app.use("/api/admin", adminProtect, adminRouter);
app.use("/api/mod", modProtect, modRouter);


app.use("/api/auth", authRouter);
// app.use("/api/mob/auth", mobAuthRouter); // will not use maybe
app.use('/api/oauth', oAuthRouter);
// app.use('/api/request', requestRoute);
// app.use('/email', emailRoute);
app.use("/api/university", superProtect, universityRouter);
app.use("/api/campus", superProtect, campusRouter);

app.use("/api/teacher", protectRoute, teacherRouter);
app.use("/api/department", protectRoute, departmentRouter);
app.use("/api/subject", protectRoute, subjectRouter);

app.use("/api/pastpaper", protectRoute, pastpaperRouter);
app.use("/api/uploads", uploadsRouter);//protectRoute,
app.use("/api/academic", protectRoute, academicRouter);
app.use("/api/discussion", protectRoute, discussionRouter);

const societyRouter = require("./routes/university_related/society/society.route.js")
// const subSocietyRouter = require("./routes/university_related/subsociety/sub.society.route.js")
const postsRouter = require('./routes/university_related/posts/post.route.js')

app.use("/api/society", protectRoute, societyRouter);
// app.use("/api/sub-society", protectRoute, subSocietyRouter);
app.use("/api/posts", protectRoute, postsRouter);

// cafe role doesnot exist

const accessibleRoutes = require('./routes/accessibles/accessible.route.js')
app.use('/api/accessible/', accessibleRoutes)


const userRouter = require('./routes/user/user.route.js');
// const User = require("./models/user/user.model.js");
// const Campus = require("./models/university/campus.university.model.js");


app.use("/api/user", protectRoute, userRouter);









/** This code is implemented after some bots tried to 
  * get sensitive data from the deployment backend
  * add any sensitive route here if found
  * This will send null to sender before it even checks the authentication
*/
const suspiciousRoutes = [
  '/.env',
  '/.git/config',
  '/wp-admin/setup-config.php?step=1',
  '/wordpress/wp-admin/setup-config.php?step=1',
  '/robots.txt',
  '//wp-includes/ID3/license.txt',
  '//xmlrpc.php?rsd',
  '//web/wp-includes/wlwmanifest.xml',
  '//wp/wp-includes/wlwmanifest.xml',
  '//2019/wp-includes/wlwmanifest.xml',
  '//shop/wp-includes/wlwmanifest.xml',
  '//test/wp-includes/wlwmanifest.xml',
  '//cms/wp-includes/wlwmanifest.xml',
  '/wp-includes/js/jquery/jquery.js'
];
// Add suspicious routes to return a safe response
suspiciousRoutes.forEach((route) => {
  app.get(route, (req, res) => {
    res.status(404).send(null); // Respond with null and a 404 status
  });
});

// Default catch-all route for undefined paths
app.all('*', (req, res) => {
  console.log("Not Registered /*")
  res.status(404).json({ message: 'No Such Route Found, Please Check POST,GET,PUT,DELETE Command' });
});













// Start Server
const startServer = () => {
  server.listen(PORT, () => {
    mongoDB(app);
    console.log(`Server Running on ${PORT}`);
  });
};

// Error report
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

startServer();















// if (cluster.isMaster) {
//     const numCPUs = os.cpus().length;

//     console.log(`Master ${process.pid} is running`);

//     for (let i = 0; i < numCPUs; i++) {
//         cluster.fork();
//     }

//     cluster.on('exit', (worker, code, signal) => {
//         console.log(`Worker ${worker.process.pid} died`);
//     });
// } else {
//     startServer();
// }


// const remAllInvalidUserInCampus = async () => {
//   try {
//     // Step 1: Get all valid user IDs from the User collection
//     const validUserIds = await User.find({}, { _id: 1 }); // `toArray()` is unnecessary with Mongoose
//     const validIds = validUserIds.map(user => user._id);

//     // Step 2: Update the Campus model to remove invalid user IDs
//     await Campus.updateMany(
//       { _id: '6714235976333e618a4809bd' }, // Match specific Campus document by ID
//       {
//         $pull: {
//           users: { $nin: validIds }, // Remove users whose IDs are not in the valid list
//         },
//       }
//     );

//     console.log("Invalid users removed successfully!");
//   } catch (error) {
//     console.error("Error while removing invalid users:", error);
//   }
// };

// remAllInvalidUserInCampus()

/**has left : teacher
 * @param {hasLeft} Teacher
 * join teacher later
 * */



