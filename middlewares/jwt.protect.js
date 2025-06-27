const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

function getLogFilePath() {
  const now = new Date();

  const year = now.getFullYear(); // 2025
  const month = now.toLocaleString('default', { month: 'long' }).toLowerCase(); // 'june'
  const day = now.toISOString().split('T')[0]; // '2025-06-27'

  const logDir = path.join(__dirname, `../logs/${year}/${month}`);
  
  // Create folders if they don’t exist
  fs.mkdirSync(logDir, { recursive: true });

  // Final log path
  return path.join(logDir, `records-${day}.log`);
}

function logToFile(content) {
  const logEntry = `${new Date().toISOString()} - ${content}\n`;
  const logPath = getLogFilePath();
  fs.appendFile(logPath, logEntry, (err) => {
    if (err) console.error('Log write error:', err.message);
  });
}

function authenticateToken(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  const x_device_id = req.headers["x-device-id"];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;

    const logLine = `req.user.universityEmail:${req?.user?.universityEmail} | x_device_id:${x_device_id} | userId:${user?._id} | route:${req.originalUrl} | ip:${req?.ip || req?.connection?.remoteAddress} universtityId ${req.user?.university?.universityId?._id} campusId: ${req.user?.university?.campusId?._id}`;
    logToFile(logLine);

    next();
  });
}

module.exports = authenticateToken;



// const jwt = require('jsonwebtoken')
// const fs = require('fs');
// const path = require('path');

// function getLogFilePath() {
//   const today = new Date().toISOString().split('T')[0]; // e.g. 2025-06-27
//   const logDir = path.join(__dirname, '../logs');

//   if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

//   return path.join(logDir, `auth-${today}.log`);
// }

// function logToFile(content) {
//   const logEntry = `${new Date().toISOString()} - ${content}\n`;
//   const logPath = getLogFilePath();
//   fs.appendFile(logPath, logEntry, (err) => {
//     if (err) console.error('Log write error:', err.message);
//   });
// }



// function authenticateToken(req, res, next) {
//   const token = req.headers["authorization"]?.split(" ")[1];
//   const x_device_id = req.headers["x-device-id"];
//   // console.log("x_device_id", x_device_id)
//   // console.log("HEaders", req.headers)
//   // console.log("TOKEN", token)
//   if (!token) return res.sendStatus(401);

//   jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
//     if (err) return res.sendStatus(403);
//     // console.log("usr", user)
//     req.user = user;
//     const logLine = `req.user.unversityEmail:${req?.user?.unversityEmail} | x_device_id:${x_device_id} | userId:${user?._id} | route:${req.originalUrl} | ip:${req.ip || req.connection.remoteAddress}`;
//     logToFile(logLine);
//     // console.log(`x_device_id:${x_device_id}:${user?._id}:api_route:${req.originalUrl}`)
//     next();
//   });
// }
// module.exports = authenticateToken;
