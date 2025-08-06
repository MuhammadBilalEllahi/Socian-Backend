// const cluster = require('cluster');
// const os = require('os');


import dotenv from "dotenv/config";
// dotenv.config({path: "./.env"});

console.log('\n\x1b[1m💡 \x1b[33mAlways remember to pnpm install\x1b[0m\n');



console.log('\x1b[36m╔═══════════════════════════════════════════════╗\x1b[0m');




import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import mongoDB from "./db/connect.mongodb.js";
import session from "express-session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import csrfProtection from "@fastify/csrf-protection";
import compression from "compression";
import http from "http";
import attachSocketToApp  from "./socket/socket.js";
import MongoStore from "connect-mongo";
import path from "path";
import logModActivity from "./models/mod/modActivityLogs.js";
import redisClient from "./db/reddis.js";
import cronjob from "./cronjob/cronjob.js";
import authRouter from "./routes/auth/auth.route.js";
import oAuthRouter from "./routes/auth/oAuth/oAuth.route.js";
import protectRoute from "./middlewares/protect.route.js";
import superProtect from "./middlewares/super.protect.js";
import adminProtect from "./middlewares/admin.protect.js";
import modProtect from "./middlewares/mod.protect.js";
import superRouter from "./routes/super/super.route.js";
import adminRouter from "./routes/admin/admin.route.js";
import modRouter from "./routes/mod/mod.route.js";
import universityRouter from "./routes/super/university.route.js";
import departmentRouter from "./routes/university_related/department/department.route.js";
import subjectRouter from "./routes/university_related/subject/subject.route.js";
import teacherRouter from "./routes/university_related/teacher/teacher.route.js";
import pastpaperRouter from "./routes/university_related/pastpapers/pastpaper.route.js";
import academicRouter from "./routes/university_related/pastpapers/academic.format.route.js";
import discussionRouter from "./routes/university_related/pastpapers/discussion.route.js";
import uploadsRouter from './utils/aws/servePDF.js';
import societyRouter from "./routes/university_related/society/society.route.js";
import postsRouter from './routes/university_related/posts/post.route.js';
import accessibleRoutes from './routes/accessibles/accessible.route.js';
import userRouter from './routes/user/user.route.js';
import cafeRouter from './routes/university_related/cafe/cafe.route.js';
import reportRouter from './routes/university_related/report/report.route.js';
import aiRouter from './routes/aiRoutes/ai.routes.js';
import eventRouterFunc from './routes/GPS/event.attendance.route.js';
import locationRouter from './routes/GPS/location.sharing.route.js';
import gatheringRouter from './routes/GPS/gathering.route.js';
import webhooks from './webhooks/webhooks.route.js';
import messagesRouter from "./routes/1to1messages/messages.routes.js";


// const sanitizeHtml = require('sanitize-html');
// const cleanHtml = sanitizeHtml(userInput, { allowedTags: [], allowedAttributes: {} });


const app = express();
const PORT = process.env.PORT || 8080;


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
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);
// app.options("*", cors()); // Allow all preflight requests


// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Limit each IP to 100 requests per windowMs
// });


// process.env.RUN_LIMITER === 'true' && app.use(limiter);
// app.use(helmet());
// app.use(csrfProtection);

// app.use('/api/webhooks', express.raw({ type: 'application/json' }));


app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production3" ? "combined" : "dev"));
app.use(express.json({limit: '100mb'}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({limit: '100mb', extended: true }));
app.use(compression());



const server = http.createServer(app)
const io = attachSocketToApp.initSocketIO(app, server);

app.use((req, res, next) => {
  const io = req.app.get('io');
  req.io = io;
  next();
});




// generate hash
// const crypto = require('crypto')
// console.log(crypto.randomBytes(6).toString('hex'))


const eventRouter = eventRouterFunc(io);


// const User = require("./models/user/user.model.js");
// const Campus = require("./models/university/campus.university.model.js");





app.use('/api/webhooks', webhooks);

app.use("/api/super", superProtect, superRouter);
app.use("/api/admin", adminProtect, adminRouter);
app.use("/api/mod",protectRoute, modProtect, logModActivity, modRouter); // ?
app.use("/api/messages", protectRoute, messagesRouter);

app.use("/api/auth", authRouter);
// app.use("/api/mob/auth", mobAuthRouter); // will not use maybe
app.use('/api/oauth', oAuthRouter);
// app.use('/api/request', requestRoute);
// app.use('/email', emailRoute);
// app.use("/api/university", superProtect, universityRouter);
// app.use("/api/campus", superProtect, campusRouter);

app.use("/api/teacher", protectRoute, teacherRouter);
app.use("/api/department", protectRoute, departmentRouter);
app.use("/api/subject", protectRoute, subjectRouter);

app.use("/api/pastpaper", protectRoute, pastpaperRouter);
app.use("/api/uploads", uploadsRouter);//protectRoute,
app.use("/api/academic", protectRoute, academicRouter);
app.use("/api/discussion", protectRoute, discussionRouter);


app.use("/api/society", protectRoute, societyRouter);
// app.use("/api/sub-society", protectRoute, subSocietyRouter);
app.use("/api/posts", protectRoute, postsRouter);
app.use("/api/ai", protectRoute, aiRouter);


app.use("/api/location", protectRoute, locationRouter);
app.use("/api/gatherings", protectRoute, gatheringRouter);
// app.use("/api/gatherings", gatheringRouter);
app.use("/api/event", protectRoute, eventRouter);

// cafe role doesnot exist

app.use('/api/accessible', accessibleRoutes)
app.use("/api/user", protectRoute, userRouter);


// const cafeProtect = require("./middlewares/cafe.protect.js");
app.use('/api/cafe', cafeRouter);
app.use('/api/report', protectRoute, reportRouter);









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












// app._router.stack
//   .filter(r => r.route && r.route.path)
//   .forEach(r => {
//     console.log(`🔗 [${Object.keys(r.route.methods).join(',').toUpperCase()}] ${r.route.path}`);
//   });

  import expressListEndpoints from 'express-list-endpoints';

  const endpoints = expressListEndpoints(app);
  console.log("📍 Registered Endpoints:");
  console.log(endpoints);

// Start Server
const startServer = () => {
  server.listen(PORT, () => {
    mongoDB(app);
    console.log(`\x1b[35m║\x1b[0m \x1b[33mServer Running on\x1b[0m: \x1b[32m${PORT}\x1b[0m                       ║`);
  });
};

// Error report
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("\x1b[31mSomething broke!\x1b[0m");
});

// const chatBackupService = require('./services/chat-backup.service');

// // Start chat backup service
// chatBackupService.start().catch(error => {
//   console.error('║ \x1b[31mFailed to start chat backup service\x1b[0m:', error.message);
// });

startServer();




// if (cluster.isMaster) {
//     const numCPUs = os.cpus().length;

//     console.log(`Master ${process.pid} is running`);

//     for (let i = 0; i < numCPUs; i++) {
//         cluster.fork();
//     });

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



